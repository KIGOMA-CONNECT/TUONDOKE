import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth, adminOnly } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

router.get('/dashboard', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const drivers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver'").get() as any;
    const trips = db.prepare('SELECT COUNT(*) as count FROM trips').get() as any;
    const completedTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'completed'").get() as any;
    const revenue = db.prepare("SELECT COALESCE(SUM(final_fare), 0) as total FROM trips WHERE status = 'completed'").get() as any;
    const onlineDrivers = db.prepare("SELECT COUNT(DISTINCT driver_id) as count FROM driver_online_sessions WHERE ended_at IS NULL").get() as any;

    res.json({
      total_users: users.count,
      total_drivers: drivers.count,
      total_trips: trips.count,
      completed_trips: completedTrips.count,
      total_revenue: revenue.total,
      online_drivers: onlineDrivers.count
    });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/users', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { search, role, page, limit: limitStr } = req.query;
    const pg = parseInt(page as string) || 1;
    const lim = Math.min(parseInt(limitStr as string) || 20, 100);
    const offset = (pg - 1) * lim;

    let query = 'SELECT id, phone, name, email, role, verified, kyc_status, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const params: any[] = [];
    const countParams: any[] = [];
    const conditions: string[] = [];

    if (search) { conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); countParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (role) { conditions.push('role = ?'); params.push(role); countParams.push(role); }

    if (conditions.length) { query += ' WHERE ' + conditions.join(' AND '); countQuery += ' WHERE ' + conditions.join(' AND '); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const users = db.prepare(query).all(...params);
    const { count } = db.prepare(countQuery).get(...countParams) as any;
    res.json({ users, total: count, page: pg, limit: lim });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/users/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const user = db.prepare('SELECT id, phone, name, email, role, verified, kyc_status, avatar_url, referral_code, referred_by, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.params.id);
    const stats = db.prepare('SELECT * FROM driver_stats WHERE driver_id = ?').get(req.params.id);
    res.json({ user, wallet, stats });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/users/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { name, email, role, verified } = req.body;
    const fields: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (role !== undefined) { fields.push('role = ?'); params.push(role); }
    if (verified !== undefined) { fields.push('verified = ?'); params.push(verified); }
    fields.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/users/:id/verify', auth, adminOnly, (req: Request, res: Response) => {
  try {
    db.prepare("UPDATE users SET verified = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Verified' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/users/:id/ban', auth, adminOnly, (req: Request, res: Response) => {
  try {
    db.prepare("UPDATE users SET verified = 0, token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Banned' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/trips', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status, page, limit: limitStr } = req.query;
    const pg = parseInt(page as string) || 1;
    const lim = Math.min(parseInt(limitStr as string) || 20, 100);
    const offset = (pg - 1) * lim;

    let query = 'SELECT t.*, p.name as passenger_name, d.name as driver_name FROM trips t LEFT JOIN users p ON t.passenger_id = p.id LEFT JOIN users d ON t.driver_id = d.id';
    const params: any[] = [];

    if (status) { query += ' WHERE t.status = ?'; params.push(status); }
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const trips = db.prepare(query).all(...params);
    res.json(trips);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/cargo', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const cargo = db.prepare(`SELECT c.*, s.name as sender_name, d.name as driver_name
      FROM cargo c LEFT JOIN users s ON c.sender_id = s.id LEFT JOIN users d ON c.driver_id = d.id
      ORDER BY c.created_at DESC LIMIT 50`).all();
    res.json(cargo);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/analytics', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const dailyTrips = db.prepare(`SELECT date(created_at) as day, COUNT(*) as count
      FROM trips WHERE created_at > datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY day`).all();
    const dailyRevenue = db.prepare(`SELECT date(created_at) as day, SUM(final_fare) as total
      FROM trips WHERE status = 'completed' AND created_at > datetime('now', '-30 days') GROUP BY date(created_at) ORDER BY day`).all();
    const vehicleStats = db.prepare(`SELECT vehicle_type, COUNT(*) as count FROM trips GROUP BY vehicle_type`).all();

    res.json({ daily_trips: dailyTrips, daily_revenue: dailyRevenue, vehicle_stats: vehicleStats });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/promos', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { code, discount_pct, discount_amount, max_uses, valid_from, valid_until } = req.body;
    if (!code) { res.status(400).json({ error: 'Code required' }); return; }

    const existing = db.prepare('SELECT id FROM promos WHERE code = ?').get(code);
    if (existing) { res.status(409).json({ error: 'Code exists' }); return; }

    const result = db.prepare('INSERT INTO promos (code, discount_pct, discount_amount, max_uses, valid_from, valid_until) VALUES (?, ?, ?, ?, ?, ?)')
      .run(code, discount_pct || 0, discount_amount || 0, max_uses || 0, valid_from || null, valid_until || null);
    res.json({ id: Number(result.lastInsertRowid), code });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/promos', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const promos = db.prepare('SELECT * FROM promos ORDER BY created_at DESC').all();
    res.json(promos);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/disputes', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const tickets = db.prepare(`SELECT st.*, u.name as user_name FROM support_tickets st
      JOIN users u ON st.user_id = u.id ORDER BY st.created_at DESC`).all();
    res.json(tickets);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/disputes/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status || 'resolved', req.params.id);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/audit', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100').all();
    res.json(logs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/announcements', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { title, body, slug } = req.body;
    if (!title || !body || !slug) { res.status(400).json({ error: 'All fields required' }); return; }

    const result = db.prepare('INSERT INTO announcements (title, body, slug) VALUES (?, ?, ?)').run(title, body, slug);
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/announcements', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const items = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
    res.json(items);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/announcements/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/export/:type', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    let data: any[] = [];
    let filename = '';

    if (type === 'users') {
      data = db.prepare('SELECT id, phone, name, email, role, verified, created_at FROM users').all();
      filename = 'users.csv';
    } else if (type === 'trips') {
      data = db.prepare('SELECT * FROM trips').all();
      filename = 'trips.csv';
    } else if (type === 'cargo') {
      data = db.prepare('SELECT * FROM cargo').all();
      filename = 'cargo.csv';
    } else if (type === 'transactions') {
      data = db.prepare('SELECT * FROM transactions').all();
      filename = 'transactions.csv';
    } else {
      res.status(400).json({ error: 'Invalid type' }); return;
    }

    if (!data.length) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send('No data');
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/kyc-queue', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const subs = db.prepare(`SELECT k.*, u.name, u.phone FROM kyc_submissions k
      JOIN users u ON k.user_id = u.id WHERE k.status = 'pending' ORDER BY k.created_at`).all();
    res.json(subs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/kyc/:id/approve', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const sub = db.prepare('SELECT * FROM kyc_submissions WHERE id = ?').get(req.params.id) as any;
    if (!sub) { res.status(404).json({ error: 'Not found' }); return; }
    db.prepare("UPDATE kyc_submissions SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?").run(req.user!.id, req.params.id);
    db.prepare("UPDATE users SET kyc_status = 'verified', updated_at = datetime('now') WHERE id = ?").run(sub.user_id);
    res.json({ message: 'Approved' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/kyc/:id/reject', auth, adminOnly, (req: Request, res: Response) => {
  try {
    db.prepare("UPDATE kyc_submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?").run(req.user!.id, req.params.id);
    res.json({ message: 'Rejected' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/feature-flags', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const flags = db.prepare('SELECT * FROM feature_flags ORDER BY name').all();
    res.json(flags);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/feature-flags/:name', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { enabled, description } = req.body;
    const existing = db.prepare('SELECT id FROM feature_flags WHERE name = ?').get(req.params.name) as any;
    if (existing) {
      db.prepare('UPDATE feature_flags SET enabled = ?, description = ? WHERE name = ?').run(enabled ? 1 : 0, description || '', req.params.name);
    } else {
      db.prepare('INSERT INTO feature_flags (name, enabled, description) VALUES (?, ?, ?)').run(req.params.name, enabled ? 1 : 0, description || '');
    }
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/system-stats', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const tables = ['users', 'trips', 'cargo', 'wallets', 'transactions', 'vehicles', 'reviews'];
    const stats: Record<string, number> = {};
    for (const t of tables) {
      const r = db.prepare(`SELECT COUNT(*) as count FROM ${t}`).get() as any;
      stats[t] = r.count;
    }
    const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as any;
    res.json({ tables: stats, db_size_bytes: dbSize?.size || 0 });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/drivers-online', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const online = db.prepare(`SELECT dos.*, u.name, u.phone FROM driver_online_sessions dos
      JOIN users u ON dos.driver_id = u.id WHERE dos.ended_at IS NULL`).all();
    res.json(online);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/driver-hours', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const hours = db.prepare(`SELECT dos.driver_id, u.name, SUM(dos.duration_seconds) / 3600.0 as hours
      FROM driver_online_sessions dos JOIN users u ON dos.driver_id = u.id
      WHERE dos.started_at > datetime('now', '-7 days')
      GROUP BY dos.driver_id ORDER BY hours DESC`).all();
    res.json(hours);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/bulk-announcement', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { title, body, target_role } = req.body;
    if (!title || !body) { res.status(400).json({ error: 'Title and body required' }); return; }

    let users: any[] = [];
    if (target_role) {
      users = db.prepare('SELECT id FROM users WHERE role = ?').all(target_role);
    } else {
      users = db.prepare('SELECT id FROM users').all();
    }

    const tx = db.transaction(() => {
      for (const u of users) {
        db.prepare('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)').run(u.id, title, body, 'announcement');
      }
    });
    tx();

    res.json({ message: `Notified ${users.length} users` });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/metrics', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const avgFare = db.prepare("SELECT AVG(final_fare) as avg FROM trips WHERE status = 'completed'").get() as any;
    const avgDistance = db.prepare("SELECT AVG(distance_km) as avg FROM trips WHERE status = 'completed'").get() as any;
    const avgRating = db.prepare('SELECT AVG(avg_rating) as avg FROM driver_stats WHERE rating_count > 0').get() as any;
    const cancelRate = db.prepare("SELECT CAST(COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS REAL) / COUNT(*) as rate FROM trips").get() as any;

    res.json({ avg_fare: avgFare?.avg || 0, avg_distance: avgDistance?.avg || 0, avg_rating: avgRating?.avg || 0, cancel_rate: cancelRate?.rate || 0 });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/maintenance', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const existing = db.prepare("SELECT key FROM settings WHERE key = 'maintenance_mode'").get();
    if (existing) {
      db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'maintenance_mode'").run(enabled ? '1' : '0');
    } else {
      db.prepare("INSERT INTO settings (key, value) VALUES ('maintenance_mode', ?)").run(enabled ? '1' : '0');
    }
    res.json({ message: 'Maintenance mode ' + (enabled ? 'enabled' : 'disabled') });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/support/tickets', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const tickets = db.prepare(`SELECT st.*, u.name as user_name FROM support_tickets st
      JOIN users u ON st.user_id = u.id ORDER BY st.created_at DESC`).all();
    res.json(tickets);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/support/tickets/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/safety/sos', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const alerts = db.prepare(`SELECT sa.*, u.name, u.phone FROM sos_alerts sa
      JOIN users u ON sa.user_id = u.id WHERE sa.status = 'active' ORDER BY sa.created_at DESC`).all();
    res.json(alerts);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/safety/sos/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE sos_alerts SET status = ? WHERE id = ?').run(status || 'resolved', req.params.id);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/orgs', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const orgs = db.prepare(`SELECT o.*, u.name as owner_name FROM organizations o
      JOIN users u ON o.owner_id = u.id ORDER BY o.created_at DESC`).all();
    res.json(orgs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/orgs/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE organizations SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/insurance/claims', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const claims = db.prepare(`SELECT ic.*, u.name as passenger_name, ip.name as plan_name
      FROM insurance_claims ic
      JOIN users u ON ic.passenger_id = u.id
      JOIN trip_insurance ti ON ic.insurance_id = ti.id
      JOIN insurance_plans ip ON ti.plan_id = ip.id
      ORDER BY ic.created_at DESC`).all();
    res.json(claims);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/insurance/claims/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status, payout_amount, admin_notes } = req.body;
    const claim = db.prepare('SELECT * FROM insurance_claims WHERE id = ?').get(req.params.id) as any;
    if (!claim) { res.status(404).json({ error: 'Not found' }); return; }

    db.prepare('UPDATE insurance_claims SET status = ?, payout_amount = ?, admin_notes = ? WHERE id = ?')
      .run(status, payout_amount || 0, admin_notes || '', req.params.id);

    if (status === 'approved' && payout_amount > 0) {
      const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(claim.passenger_id) as any;
      if (wallet) {
        const newBal = wallet.balance + payout_amount;
        db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, wallet.id);
        db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(wallet.id, 'insurance_payout', payout_amount, newBal, 'insurance_claim', claim.id, 'Insurance claim payout');
      }
    }
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/applications', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const apps = db.prepare(`SELECT da.*, u.name, u.phone FROM driver_applications da
      JOIN users u ON da.user_id = u.id WHERE da.status = 'pending' ORDER BY da.created_at`).all();
    res.json(apps);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/applications/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const app = db.prepare('SELECT * FROM driver_applications WHERE id = ?').get(req.params.id) as any;
    if (!app) { res.status(404).json({ error: 'Not found' }); return; }

    db.prepare("UPDATE driver_applications SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
      .run(status, req.user!.id, req.params.id);

    if (status === 'approved') {
      db.prepare("UPDATE users SET role = 'driver', updated_at = datetime('now') WHERE id = ?").run(app.user_id);
      db.prepare('INSERT INTO driver_stats (driver_id) VALUES (?)').run(app.user_id);
      db.prepare('INSERT INTO wallets (user_id) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = ?)').run(app.user_id, app.user_id);
    }
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/fleets', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const fleets = db.prepare(`SELECT f.*, u.name as owner_name FROM fleets f
      JOIN users u ON f.owner_id = u.id ORDER BY f.created_at DESC`).all();
    res.json(fleets);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/ussd-sms-config', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const codes = db.prepare("SELECT value FROM settings WHERE key = 'ussd_service_codes'").get() as any;
    const sender = db.prepare("SELECT value FROM settings WHERE key = 'at_sender_phone'").get() as any;
    res.json({ ussd_service_codes: codes?.value || process.env.USSD_SERVICE_CODES || '', at_sender_phone: sender?.value || process.env.AT_SENDER_PHONE || '' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/ussd-sms-config', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { ussd_service_codes, at_sender_phone } = req.body;
    if (ussd_service_codes !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('ussd_service_codes', ?, datetime('now'))").run(ussd_service_codes);
    }
    if (at_sender_phone !== undefined) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('at_sender_phone', ?, datetime('now'))").run(at_sender_phone);
    }
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/test-sms', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    logger.info({ phone, message }, 'Test SMS');
    res.json({ message: 'SMS sent (test mode)', phone });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/bima', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM insurance_plans WHERE active = 1').all();
    const claims = db.prepare(`SELECT ic.*, u.name as passenger_name FROM insurance_claims ic
      JOIN users u ON ic.passenger_id = u.id ORDER BY ic.created_at DESC LIMIT 50`).all();
    res.json({ plans, claims });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/uanachama', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM membership_plans WHERE active = 1').all();
    const members = db.prepare(`SELECT m.*, u.name, u.phone, mp.name as plan_name FROM memberships m
      JOIN users u ON m.user_id = u.id JOIN membership_plans mp ON m.plan_id = mp.id
      ORDER BY m.created_at DESC LIMIT 50`).all();
    res.json({ plans, members });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/zawadi', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const missions = db.prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT 20').all();
    const leaderboard = db.prepare(`SELECT ds.driver_id, u.name, ds.completed_trips, ds.total_earnings, ds.avg_rating
      FROM driver_stats ds JOIN users u ON ds.driver_id = u.id
      ORDER BY ds.completed_trips DESC LIMIT 20`).all();
    res.json({ missions, leaderboard });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/commission', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const commissions = db.prepare(`SELECT driver_id, name, total_earnings, completed_trips
      FROM driver_stats ds JOIN users u ON ds.driver_id = u.id
      ORDER BY total_earnings DESC LIMIT 50`).all();
    res.json(commissions);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/advances', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const advances = db.prepare(`SELECT da.*, u.name, u.phone FROM driver_advances da
      JOIN users u ON da.driver_id = u.id ORDER BY da.created_at DESC LIMIT 50`).all();
    res.json(advances);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
