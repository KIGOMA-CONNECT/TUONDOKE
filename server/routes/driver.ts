import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

router.get('/vehicles', auth, (req: Request, res: Response) => {
  try {
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE driver_id = ?').all(req.user!.id);
    res.json(vehicles);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/vehicles', auth, (req: Request, res: Response) => {
  try {
    const { type, make, model, year, plate, color } = req.body;
    if (!type) { res.status(400).json({ error: 'Type required' }); return; }

    const result = db.prepare('INSERT INTO vehicles (driver_id, type, make, model, year, plate, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, type, make || '', model || '', year || 0, plate || '', color || '');

    res.json({ id: Number(result.lastInsertRowid), type, make, model, year, plate, color });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/vehicles/:id', auth, (req: Request, res: Response) => {
  try {
    const v = db.prepare('SELECT id FROM vehicles WHERE id = ? AND driver_id = ?').get(req.params.id, req.user!.id);
    if (!v) { res.status(404).json({ error: 'Not found' }); return; }
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/stats', auth, (req: Request, res: Response) => {
  try {
    let stats = db.prepare('SELECT * FROM driver_stats WHERE driver_id = ?').get(req.user!.id) as any;
    if (!stats) {
      db.prepare('INSERT INTO driver_stats (driver_id) VALUES (?)').run(req.user!.id);
      stats = db.prepare('SELECT * FROM driver_stats WHERE driver_id = ?').get(req.user!.id);
    }
    res.json(stats);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/perf', auth, (req: Request, res: Response) => {
  try {
    const stats = db.prepare('SELECT * FROM driver_stats WHERE driver_id = ?').get(req.user!.id) as any;
    const recentTrips = db.prepare(`SELECT status, final_fare, distance_km, created_at FROM trips
      WHERE driver_id = ? ORDER BY created_at DESC LIMIT 10`).all(req.user!.id);
    const onlineHours = db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 as hours
      FROM driver_online_sessions WHERE driver_id = ? AND started_at > datetime('now', '-7 days')`).get(req.user!.id) as any;

    res.json({
      stats: stats || {},
      recent_trips: recentTrips,
      online_hours_7d: onlineHours?.hours || 0
    });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/earnings', auth, (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'week';
    let dateFilter = "datetime('now', '-7 days')";
    if (period === 'month') dateFilter = "datetime('now', '-30 days')";
    if (period === 'year') dateFilter = "datetime('now', '-365 days')";

    const earnings = db.prepare(`SELECT SUM(amount) as total, COUNT(*) as count
      FROM transactions t JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = ? AND t.type = 'ride_earning' AND t.created_at > ${dateFilter}`).get(req.user!.id) as any;

    const byDay = db.prepare(`SELECT date(t.created_at) as day, SUM(t.amount) as total
      FROM transactions t JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = ? AND t.type = 'ride_earning' AND t.created_at > ${dateFilter}
      GROUP BY date(t.created_at) ORDER BY day`).all(req.user!.id);

    res.json({ total: earnings?.total || 0, count: earnings?.count || 0, by_day: byDay });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/sessions', auth, (req: Request, res: Response) => {
  try {
    const sessions = db.prepare(`SELECT * FROM driver_online_sessions
      WHERE driver_id = ? ORDER BY started_at DESC LIMIT 30`).all(req.user!.id);
    res.json(sessions);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/earnings-goal', auth, (req: Request, res: Response) => {
  try {
    const stats = db.prepare('SELECT weekly_earnings_goal, goal_updated_at FROM driver_stats WHERE driver_id = ?').get(req.user!.id) as any;
    const currentWeek = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions t JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = ? AND t.type = 'ride_earning' AND t.created_at > datetime('now', '-7 days')`).get(req.user!.id) as any;

    res.json({ goal: stats?.weekly_earnings_goal || 0, current: currentWeek?.total || 0, updated_at: stats?.goal_updated_at });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/earnings-goal', auth, (req: Request, res: Response) => {
  try {
    const { goal } = req.body;
    db.prepare('UPDATE driver_stats SET weekly_earnings_goal = ?, goal_updated_at = datetime(\'now\') WHERE driver_id = ?')
      .run(goal || 0, req.user!.id);
    res.json({ message: 'Goal updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/schedule', auth, (req: Request, res: Response) => {
  try {
    const schedule = db.prepare('SELECT * FROM driver_schedules WHERE driver_id = ? ORDER BY day_of_week').all(req.user!.id);
    res.json(schedule);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/schedule', auth, (req: Request, res: Response) => {
  try {
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) { res.status(400).json({ error: 'Schedule array required' }); return; }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM driver_schedules WHERE driver_id = ?').run(req.user!.id);
      for (const s of schedule) {
        db.prepare('INSERT INTO driver_schedules (driver_id, day_of_week, start_hour, end_hour, enabled) VALUES (?, ?, ?, ?, ?)')
          .run(req.user!.id, s.day_of_week, s.start_hour || 8, s.end_hour || 18, s.enabled !== false ? 1 : 0);
      }
    });
    tx();
    res.json({ message: 'Schedule updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/expenses', auth, (req: Request, res: Response) => {
  try {
    const expenses = db.prepare('SELECT * FROM driver_expenses WHERE driver_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user!.id);
    res.json(expenses);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/expenses', auth, (req: Request, res: Response) => {
  try {
    const { category, amount, description, expense_date } = req.body;
    if (!category || !amount) { res.status(400).json({ error: 'Category and amount required' }); return; }

    const result = db.prepare('INSERT INTO driver_expenses (driver_id, category, amount, description, expense_date) VALUES (?, ?, ?, ?, ?)')
      .run(req.user!.id, category, amount, description || '', expense_date || new Date().toISOString().split('T')[0]);

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/expenses/:id', auth, (req: Request, res: Response) => {
  try {
    const e = db.prepare('SELECT id FROM driver_expenses WHERE id = ? AND driver_id = ?').get(req.params.id, req.user!.id);
    if (!e) { res.status(404).json({ error: 'Not found' }); return; }
    db.prepare('DELETE FROM driver_expenses WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/advances', auth, (req: Request, res: Response) => {
  try {
    const advances = db.prepare('SELECT * FROM driver_advances WHERE driver_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json(advances);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/advances', auth, (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const pending = db.prepare('SELECT id FROM driver_advances WHERE driver_id = ? AND status IN (?, ?)')
      .get(req.user!.id, 'pending', 'approved') as any;
    if (pending) { res.status(400).json({ error: 'Existing advance pending' }); return; }

    const result = db.prepare('INSERT INTO driver_advances (driver_id, amount, balance) VALUES (?, ?, ?)')
      .run(req.user!.id, amount, amount);

    res.json({ id: Number(result.lastInsertRowid), status: 'pending' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
