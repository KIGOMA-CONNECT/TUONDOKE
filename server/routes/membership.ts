import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM membership_plans WHERE active = 1').all();
    res.json(plans);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/subscribe', auth, (req: Request, res: Response) => {
  try {
    const { plan_id } = req.body;
    if (!plan_id) { res.status(400).json({ error: 'Plan ID required' }); return; }

    const plan = db.prepare('SELECT * FROM membership_plans WHERE id = ? AND active = 1').get(plan_id) as any;
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < plan.monthly_price) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const existing = db.prepare("SELECT * FROM memberships WHERE user_id = ? AND plan_id = ? AND status = 'active'").get(req.user!.id, plan_id) as any;
    if (existing) { res.status(409).json({ error: 'Already subscribed' }); return; }

    const tx = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - plan.monthly_price, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .run(wallet.id, 'ride_payment', plan.monthly_price, wallet.balance - plan.monthly_price, `Membership: ${plan.name}`);

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      db.prepare('INSERT INTO memberships (user_id, plan_id, expires_at) VALUES (?, ?, ?)')
        .run(req.user!.id, plan_id, expiresAt.toISOString());
    });

    tx();
    res.json({ message: 'Subscribed', plan: plan.name });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/status', auth, (req: Request, res: Response) => {
  try {
    const membership = db.prepare(`SELECT m.*, mp.name as plan_name, mp.cashback_pct, mp.monthly_price
      FROM memberships m JOIN membership_plans mp ON m.plan_id = mp.id
      WHERE m.user_id = ? ORDER BY m.created_at DESC LIMIT 1`).get(req.user!.id);
    res.json(membership || { status: 'none' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
