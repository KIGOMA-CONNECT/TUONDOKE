import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth, genWaybill } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

router.post('/estimate', auth, (req: Request, res: Response) => {
  try {
    const { vehicle_type, weight_kg, origin, destination } = req.body;
    const rates: Record<string, number> = { pickup: 40, guta: 50, fuso: 60 };
    const perKg = rates[vehicle_type || 'pickup'] || 40;
    const base = 200;
    const weightCost = Math.ceil((weight_kg || 1) * perKg);
    res.json({ vehicle_type: vehicle_type || 'pickup', weight_kg: weight_kg || 1, estimated_fare: base + weightCost });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { vehicle_type, origin, destination, cargo_type, weight_kg, notes } = req.body;
    if (!origin || !destination) { res.status(400).json({ error: 'Origin and destination required' }); return; }

    const waybill = genWaybill();
    const rates: Record<string, number> = { pickup: 40, guta: 50, fuso: 60 };
    const perKg = rates[vehicle_type || 'pickup'] || 40;
    const baseFare = 200 + Math.ceil((weight_kg || 1) * perKg);

    const result = db.prepare(`INSERT INTO cargo (sender_id, vehicle_type, waybill, origin, destination, cargo_type, weight_kg, base_fare, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.user!.id, vehicle_type || 'pickup', waybill, origin, destination, cargo_type || '', weight_kg || 0, baseFare, notes || '');

    res.json({ id: Number(result.lastInsertRowid), waybill, base_fare: baseFare });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const cargo = db.prepare(`SELECT c.*, d.name as driver_name, d.phone as driver_phone
      FROM cargo c LEFT JOIN users d ON c.driver_id = d.id
      WHERE c.sender_id = ? ORDER BY c.created_at DESC`).all(req.user!.id);
    res.json(cargo);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/accept', auth, (req: Request, res: Response) => {
  try {
    const item = db.prepare("SELECT * FROM cargo WHERE id = ? AND status = 'posted'").get(req.params.id) as any;
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    db.prepare("UPDATE cargo SET driver_id = ?, status = 'accepted' WHERE id = ?").run(req.user!.id, req.params.id);
    res.json({ message: 'Accepted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/deliver', auth, (req: Request, res: Response) => {
  try {
    const item = db.prepare("SELECT * FROM cargo WHERE id = ? AND driver_id = ? AND status IN ('accepted','in_transit')").get(req.params.id, req.user!.id) as any;
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    db.prepare("UPDATE cargo SET status = 'delivered' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Delivered' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/pod', auth, (req: Request, res: Response) => {
  try {
    const item = db.prepare("SELECT * FROM cargo WHERE id = ? AND sender_id = ? AND status = 'delivered'")
      .get(req.params.id, req.user!.id) as any;
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    db.prepare("UPDATE cargo SET status = 'pod_confirmed' WHERE id = ?").run(req.params.id);

    if (item.driver_id) {
      const driverWallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(item.driver_id) as any;
      if (driverWallet) {
        const earning = Math.floor(item.base_fare * 0.85);
        const newBal = driverWallet.balance + earning;
        db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, driverWallet.id);
        db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(driverWallet.id, 'cargo_earning', earning, newBal, 'cargo', item.id, 'Cargo delivery earning');
      }
    }

    res.json({ message: 'POD confirmed' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
