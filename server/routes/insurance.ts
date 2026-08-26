import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM insurance_plans WHERE active = 1').all();
    res.json(plans);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/buy', auth, (req: Request, res: Response) => {
  try {
    const { plan_id, trip_id } = req.body;
    if (!plan_id) { res.status(400).json({ error: 'Plan ID required' }); return; }

    const plan = db.prepare('SELECT * FROM insurance_plans WHERE id = ? AND active = 1').get(plan_id) as any;
    if (!plan) { res.status(404).json({ error: 'Plan not found' }); return; }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < plan.premium) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const tx = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - plan.premium, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .run(wallet.id, 'ride_payment', plan.premium, wallet.balance - plan.premium, `Insurance: ${plan.name}`);

      db.prepare('INSERT INTO trip_insurance (trip_id, passenger_id, plan_id) VALUES (?, ?, ?)')
        .run(trip_id || 0, req.user!.id, plan_id);
    });

    tx();
    res.json({ message: 'Insurance purchased', plan: plan.name, premium: plan.premium });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/claim', auth, (req: Request, res: Response) => {
  try {
    const { insurance_id, reason } = req.body;
    if (!insurance_id || !reason) { res.status(400).json({ error: 'Insurance ID and reason required' }); return; }

    const insurance = db.prepare("SELECT * FROM trip_insurance WHERE id = ? AND passenger_id = ? AND status = 'active'")
      .get(insurance_id, req.user!.id) as any;
    if (!insurance) { res.status(404).json({ error: 'Insurance not found' }); return; }

    const plan = db.prepare('SELECT * FROM insurance_plans WHERE id = ?').get(insurance.plan_id) as any;

    db.prepare('INSERT INTO insurance_claims (insurance_id, passenger_id, reason, payout_amount) VALUES (?, ?, ?, ?)')
      .run(insurance_id, req.user!.id, reason, plan?.coverage_amount || 0);
    db.prepare("UPDATE trip_insurance SET status = 'claimed' WHERE id = ?").run(insurance_id);

    res.json({ message: 'Claim filed', payout_amount: plan?.coverage_amount || 0 });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/my', auth, (req: Request, res: Response) => {
  try {
    const covers = db.prepare(`SELECT ti.*, ip.name as plan_name, ip.coverage_amount
      FROM trip_insurance ti JOIN insurance_plans ip ON ti.plan_id = ip.id
      WHERE ti.passenger_id = ? ORDER BY ti.created_at DESC`).all(req.user!.id);
    res.json(covers);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
