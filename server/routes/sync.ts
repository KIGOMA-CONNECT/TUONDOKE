import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';
import { accruePoints } from '../services/loyalty.js';
import logger from '../logger.js';

const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function parseDays(raw: any): number[] | null {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(',');
  const days = list.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? Array.from(new Set(days)) : null;
}

function rowToRule(r: any) {
  return {
    id: r.id,
    origin: r.origin,
    destination: r.destination,
    vehicle_type: r.vehicle_type,
    time: r.time,
    days: String(r.days).split(',').map(Number),
    interval: r.interval,
    active: !!r.active,
    last_run: r.last_run,
    created_at: r.created_at,
  };
}

export const recurringRouter = Router();

recurringRouter.get('/', auth, (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM recurring_rides WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.id) as any[];
  res.json(rows.map(rowToRule));
});

recurringRouter.post('/', auth, (req: Request, res: Response) => {
  const { origin, destination, vehicle_type, time, days, interval } = req.body;
  if (!origin || !destination) { res.status(400).json({ error: 'Origin and destination required' }); return; }
  if (!TIME_RE.test(String(time || ''))) {
    res.status(400).json({ error: 'Invalid time — use HH:MM (00-23:00-59)' }); return;
  }
  const dayList = parseDays(days);
  if (!dayList) { res.status(400).json({ error: 'At least one valid day (0-6) required' }); return; }
  const freq = FREQUENCIES.includes(interval) ? interval : 'weekly';

  const result = db.prepare(`INSERT INTO recurring_rides (user_id, origin, destination, vehicle_type, time, days, interval)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user!.id, String(origin).trim(), String(destination).trim(), vehicle_type || 'boda', time, dayList.join(','), freq);
  const row = db.prepare('SELECT * FROM recurring_rides WHERE id = ?').get(Number(result.lastInsertRowid));
  res.status(201).json(rowToRule(row));
});

recurringRouter.put('/:id', auth, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM recurring_rides WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.id) as any;
  if (!existing) { res.status(404).json({ error: 'Rule not found' }); return; }

  const { origin, destination, vehicle_type, time, days, interval } = req.body;
  if (time !== undefined && !TIME_RE.test(String(time))) {
    res.status(400).json({ error: 'Invalid time — use HH:MM (00-23:00-59)' }); return;
  }
  let dayList: number[] | undefined;
  if (days !== undefined) {
    dayList = parseDays(days) || undefined;
    if (!dayList) { res.status(400).json({ error: 'At least one valid day (0-6) required' }); return; }
  }
  if (interval !== undefined && !FREQUENCIES.includes(interval)) {
    res.status(400).json({ error: 'Invalid interval' }); return;
  }

  db.prepare(`UPDATE recurring_rides SET origin = ?, destination = ?, vehicle_type = ?, time = ?, days = ?, interval = ?
    WHERE id = ? AND user_id = ?`)
    .run(
      origin !== undefined ? String(origin).trim() : existing.origin,
      destination !== undefined ? String(destination).trim() : existing.destination,
      vehicle_type || existing.vehicle_type,
      time !== undefined ? time : existing.time,
      dayList ? dayList.join(',') : existing.days,
      interval || existing.interval,
      req.params.id, req.user!.id
    );
  res.json(rowToRule(db.prepare('SELECT * FROM recurring_rides WHERE id = ?').get(req.params.id)));
});

recurringRouter.post('/:id/toggle', auth, (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM recurring_rides WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.id) as any;
  if (!row) { res.status(404).json({ error: 'Rule not found' }); return; }
  db.prepare('UPDATE recurring_rides SET active = ? WHERE id = ?').run(row.active ? 0 : 1, req.params.id);
  res.json(rowToRule(db.prepare('SELECT * FROM recurring_rides WHERE id = ?').get(req.params.id)));
});

recurringRouter.delete('/:id', auth, (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM recurring_rides WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (!result.changes) { res.status(404).json({ error: 'Rule not found' }); return; }
  res.json({ message: 'Deleted' });
});

export const budgetRouter = Router();

budgetRouter.get('/', auth, (req: Request, res: Response) => {
  const row = db.prepare('SELECT monthly_limit, updated_at FROM user_budgets WHERE user_id = ?').get(req.user!.id) as any;
  res.json(row || { monthly_limit: 0, updated_at: null });
});

budgetRouter.post('/', auth, (req: Request, res: Response) => {
  const limit = Number(req.body.monthly_limit);
  if (!Number.isFinite(limit) || limit < 0) { res.status(400).json({ error: 'Invalid limit' }); return; }
  db.prepare(`INSERT INTO user_budgets (user_id, monthly_limit, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET monthly_limit = excluded.monthly_limit, updated_at = excluded.updated_at`)
    .run(req.user!.id, Math.floor(limit));
  res.json({ monthly_limit: Math.floor(limit) });
});

budgetRouter.delete('/', auth, (req: Request, res: Response) => {
  db.prepare('DELETE FROM user_budgets WHERE user_id = ?').run(req.user!.id);
  res.json({ message: 'Budget reset' });
});

export const standingOrdersRouter = Router();

standingOrdersRouter.get('/', auth, (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM standing_orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.id) as any[];
  res.json(rows);
});

standingOrdersRouter.post('/', auth, (req: Request, res: Response) => {
  const { recipient_phone, amount, frequency, start_date } = req.body;
  if (!recipient_phone) { res.status(400).json({ error: 'Recipient phone required' }); return; }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }
  if (!FREQUENCIES.includes(frequency)) { res.status(400).json({ error: 'Invalid frequency' }); return; }
  if (!start_date) { res.status(400).json({ error: 'Start date required' }); return; }

  const result = db.prepare(`INSERT INTO standing_orders (user_id, recipient_phone, amount, frequency, start_date)
    VALUES (?, ?, ?, ?, ?)`)
    .run(req.user!.id, String(recipient_phone).trim(), Math.floor(amt), frequency, String(start_date).slice(0, 10));
  res.status(201).json(db.prepare('SELECT * FROM standing_orders WHERE id = ?').get(Number(result.lastInsertRowid)));
});

standingOrdersRouter.put('/:id', auth, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM standing_orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.id) as any;
  if (!existing) { res.status(404).json({ error: 'Standing order not found' }); return; }
  const { recipient_phone, amount, frequency } = req.body;
  if (frequency !== undefined && !FREQUENCIES.includes(frequency)) { res.status(400).json({ error: 'Invalid frequency' }); return; }
  if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
    res.status(400).json({ error: 'Invalid amount' }); return;
  }
  db.prepare(`UPDATE standing_orders SET recipient_phone = ?, amount = ?, frequency = ? WHERE id = ? AND user_id = ?`)
    .run(recipient_phone || existing.recipient_phone,
      amount !== undefined ? Math.floor(Number(amount)) : existing.amount,
      frequency || existing.frequency, req.params.id, req.user!.id);
  res.json(db.prepare('SELECT * FROM standing_orders WHERE id = ?').get(req.params.id));
});

standingOrdersRouter.post('/:id/suspend', auth, (req: Request, res: Response) => {
  const result = db.prepare(`UPDATE standing_orders SET status = 'suspended' WHERE id = ? AND user_id = ? AND status = 'active'`)
    .run(req.params.id, req.user!.id);
  if (!result.changes) { res.status(404).json({ error: 'Not found or already not active' }); return; }
  res.json(db.prepare('SELECT * FROM standing_orders WHERE id = ?').get(req.params.id));
});

standingOrdersRouter.post('/:id/activate', auth, (req: Request, res: Response) => {
  const result = db.prepare(`UPDATE standing_orders SET status = 'active' WHERE id = ? AND user_id = ? AND status = 'suspended'`)
    .run(req.params.id, req.user!.id);
  if (!result.changes) { res.status(404).json({ error: 'Not found or already active' }); return; }
  res.json(db.prepare('SELECT * FROM standing_orders WHERE id = ?').get(req.params.id));
});

standingOrdersRouter.delete('/:id', auth, (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM standing_orders WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
  if (!result.changes) { res.status(404).json({ error: 'Standing order not found' }); return; }
  res.json({ message: 'Deleted' });
});

function getSavings(userId: number): number {
  const w = db.prepare('SELECT savings FROM wallets WHERE user_id = ?').get(userId) as any;
  return w?.savings || 0;
}

export const savingsRouter = Router();

savingsRouter.get('/transactions', auth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db.prepare('SELECT * FROM savings_transactions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?')
    .all(req.user!.id, limit) as any[];
  res.json({ balance: getSavings(req.user!.id), transactions: rows });
});

savingsRouter.post('/topup', auth, (req: Request, res: Response) => {
  const amount = Math.floor(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
  if (!wallet) { res.status(404).json({ error: 'Wallet not found' }); return; }
  if (wallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

  const tx = db.transaction(() => {
    const newBal = wallet.balance - amount;
    const newSavings = getSavings(req.user!.id) + amount;
    db.prepare('UPDATE wallets SET balance = ?, savings = ? WHERE id = ?').run(newBal, newSavings, wallet.id);
    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(wallet.id, 'savings_topup', -amount, newBal, 'user', req.user!.id, 'Savings top-up');
    db.prepare('INSERT INTO savings_transactions (user_id, kind, amount, balance_after) VALUES (?, ?, ?, ?)')
      .run(req.user!.id, 'topup', amount, newSavings);
  });
  tx();
  accruePoints(req.user!.id, Math.floor(amount / 100), 'savings_topup', req.user!.id, 'Savings top-up');
  res.json({ balance: getSavings(req.user!.id) });
});

savingsRouter.post('/withdraw', auth, (req: Request, res: Response) => {
  const amount = Math.floor(Number(req.body.amount));
  if (!Number.isFinite(amount) || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
  if (!wallet) { res.status(404).json({ error: 'Wallet not found' }); return; }
  const savings = getSavings(req.user!.id);
  if (savings < amount) { res.status(400).json({ error: 'Insufficient savings' }); return; }

  const tx = db.transaction(() => {
    const newSavings = savings - amount;
    const newBal = wallet.balance + amount;
    db.prepare('UPDATE wallets SET balance = ?, savings = ? WHERE id = ?').run(newBal, newSavings, wallet.id);
    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(wallet.id, 'savings_withdrawal', amount, newBal, 'user', req.user!.id, 'Savings withdrawal');
    db.prepare('INSERT INTO savings_transactions (user_id, kind, amount, balance_after) VALUES (?, ?, ?, ?)')
      .run(req.user!.id, 'withdraw', amount, newSavings);
  });
  tx();
  res.json({ balance: getSavings(req.user!.id) });
});

export const activityRouter = Router();

activityRouter.get('/', auth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const rows = db.prepare('SELECT id, action, details, created_at FROM activity_logs WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(req.user!.id, limit, offset) as any[];
  const total = (db.prepare('SELECT COUNT(*) AS c FROM activity_logs WHERE user_id = ?').get(req.user!.id) as any).c;
  res.json({ logs: rows, total });
});

activityRouter.post('/', auth, (req: Request, res: Response) => {
  const { action, details } = req.body;
  if (!action) { res.status(400).json({ error: 'Action required' }); return; }
  db.prepare('INSERT INTO activity_logs (user_id, action, details, ip, user_agent) VALUES (?, ?, ?, ?, ?)')
    .run(req.user!.id, String(action).slice(0, 64), String(details || '').slice(0, 500),
      String(req.ip || ''), String(req.headers['user-agent'] || '').slice(0, 200));
  res.status(201).json({ message: 'Logged' });
});

activityRouter.delete('/clear', auth, (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM activity_logs WHERE user_id = ?').run(req.user!.id);
  res.json({ message: 'Cleared', deleted: result.changes });
});

function hashCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code.toUpperCase()}`).digest('hex');
}

export const backupCodesRouter = Router();

backupCodesRouter.get('/', auth, (req: Request, res: Response) => {
  const rows = db.prepare('SELECT id, used, used_at, created_at FROM user_backup_codes WHERE user_id = ? ORDER BY id')
    .all(req.user!.id) as any[];
  res.json(rows.map(r => ({ id: r.id, used: !!r.used, used_at: r.used_at, created_at: r.created_at })));
});

backupCodesRouter.post('/generate', auth, (req: Request, res: Response) => {
  const count = Math.min(Math.max(Number(req.body.count) || 10, 1), 20);
  const salt = req.user!.id.toString();
  const codes = Array.from({ length: count }, () =>
    crypto.randomInt(0, 1e8).toString().padStart(8, '0').replace(/(\d{4})(\d{4})/, '$1-$2'));

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_backup_codes WHERE user_id = ?').run(req.user!.id);
    const ins = db.prepare('INSERT INTO user_backup_codes (user_id, code_hash) VALUES (?, ?)');
    codes.forEach(c => ins.run(req.user!.id, hashCode(c, salt)));
  });
  tx();
  logger.info({ userId: req.user!.id, count }, 'Backup codes regenerated');
  res.json({ codes });
});

backupCodesRouter.post('/verify', auth, (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: 'Code required' }); return; }
  const salt = req.user!.id.toString();
  const row = db.prepare('SELECT * FROM user_backup_codes WHERE user_id = ? AND code_hash = ? AND used = 0')
    .get(req.user!.id, hashCode(String(code), salt)) as any;
  if (!row) { res.status(401).json({ error: 'Invalid or already used code' }); return; }
  db.prepare(`UPDATE user_backup_codes SET used = 1, used_at = datetime('now') WHERE id = ?`).run(row.id);
  res.json({ valid: true });
});

