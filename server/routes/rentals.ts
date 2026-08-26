import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/vehicles', auth, (req: Request, res: Response) => {
  try {
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE active = 1').all();
    res.json(vehicles);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { vehicle_type, start_date, end_date } = req.body;
    if (!vehicle_type || !start_date) { res.status(400).json({ error: 'Vehicle type and start date required' }); return; }

    const days = end_date ? Math.ceil((new Date(end_date).getTime() - new Date(start_date).getTime()) / 86400000) : 1;
    const dailyRates: Record<string, number> = { boda: 500, bajaji: 800, pickup: 1500 };
    const dailyRate = dailyRates[vehicle_type] || 500;
    const totalCost = dailyRate * Math.max(days, 1);

    const result = db.prepare('INSERT INTO rentals (user_id, vehicle_type, start_date, end_date, daily_rate, total_cost) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, vehicle_type, start_date, end_date || null, dailyRate, totalCost);

    res.json({ id: Number(result.lastInsertRowid), total_cost: totalCost });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const rentals = db.prepare('SELECT * FROM rentals WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json(rentals);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/:id/complete', auth, (req: Request, res: Response) => {
  try {
    const rental = db.prepare("SELECT * FROM rentals WHERE id = ? AND user_id = ? AND status IN ('booked','active')").get(req.params.id, req.user!.id) as any;
    if (!rental) { res.status(404).json({ error: 'Not found' }); return; }

    db.prepare("UPDATE rentals SET status = 'completed', end_date = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: 'Rental completed' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
