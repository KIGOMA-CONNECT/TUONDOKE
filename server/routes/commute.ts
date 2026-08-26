import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/plans', auth, (req: Request, res: Response) => {
  try {
    const { from_zone, to_zone, vehicle_type, trips_total, price_per_trip } = req.body;
    if (!from_zone || !to_zone || !trips_total || !price_per_trip) {
      res.status(400).json({ error: 'All fields required' }); return;
    }

    const totalPaid = trips_total * price_per_trip;
    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < totalPaid) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const tx = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - totalPaid, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .run(wallet.id, 'ride_payment', totalPaid, wallet.balance - totalPaid, 'Commute plan purchase');

      db.prepare('INSERT INTO commute_plans (user_id, from_zone, to_zone, vehicle_type, trips_total, price_per_trip, total_paid) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(req.user!.id, from_zone, to_zone, vehicle_type || 'boda', trips_total, price_per_trip, totalPaid);
    });

    tx();
    res.json({ message: 'Plan created', trips: trips_total, total_paid: totalPaid });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/plans/mine', auth, (req: Request, res: Response) => {
  try {
    const plans = db.prepare('SELECT * FROM commute_plans WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json(plans);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/book', auth, (req: Request, res: Response) => {
  try {
    const { plan_id, origin, destination } = req.body;
    if (!plan_id || !origin || !destination) { res.status(400).json({ error: 'All fields required' }); return; }

    const plan = db.prepare("SELECT * FROM commute_plans WHERE id = ? AND user_id = ? AND status = 'active' AND trips_used < trips_total")
      .get(plan_id, req.user!.id) as any;
    if (!plan) { res.status(404).json({ error: 'No valid plan found' }); return; }

    const tx = db.transaction(() => {
      db.prepare('UPDATE commute_plans SET trips_used = trips_used + 1 WHERE id = ?').run(plan.id);

      if (plan.trips_used + 1 >= plan.trips_total) {
        db.prepare("UPDATE commute_plans SET status = 'exhausted' WHERE id = ?").run(plan.id);
      }

      const result = db.prepare(`INSERT INTO trips (passenger_id, vehicle_type, origin, destination, from_zone, to_zone, base_fare, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'commute_plan')`)
        .run(req.user!.id, plan.vehicle_type, origin, destination, plan.from_zone, plan.to_zone, plan.price_per_trip);

      return Number(result.lastInsertRowid);
    });

    const tripId = tx();
    res.json({ trip_id: tripId, remaining_trips: plan.trips_total - plan.trips_used - 1 });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
