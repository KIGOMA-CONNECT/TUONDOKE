import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/log', auth, (req: Request, res: Response) => {
  try {
    const { vehicle_id, start_reading, end_reading, start_date, end_date, notes } = req.body;
    if (!start_reading || !start_date) { res.status(400).json({ error: 'Start reading and date required' }); return; }

    const result = db.prepare('INSERT INTO odometer_logs (driver_id, vehicle_id, start_reading, end_reading, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, vehicle_id || null, start_reading, end_reading || null, start_date, end_date || null, notes || '');
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/logs', auth, (req: Request, res: Response) => {
  try {
    const logs = db.prepare(`SELECT ol.*, v.plate, v.type as vehicle_type
      FROM odometer_logs ol LEFT JOIN vehicles v ON ol.vehicle_id = v.id
      WHERE ol.driver_id = ? ORDER BY ol.created_at DESC LIMIT 50`).all(req.user!.id);
    res.json(logs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/stats', auth, (req: Request, res: Response) => {
  try {
    const stats = db.prepare(`SELECT
      COUNT(*) as total_logs,
      COALESCE(SUM(CASE WHEN end_reading IS NOT NULL THEN end_reading - start_reading ELSE 0 END), 0) as total_km,
      COALESCE(AVG(CASE WHEN end_reading IS NOT NULL THEN end_reading - start_reading END), 0) as avg_km_per_log
      FROM odometer_logs WHERE driver_id = ?`).get(req.user!.id);
    res.json(stats);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
