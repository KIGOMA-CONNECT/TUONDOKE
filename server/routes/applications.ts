import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { vehicle_type, notes } = req.body;

    const existing = db.prepare("SELECT id FROM driver_applications WHERE user_id = ? AND status = 'pending'").get(req.user!.id);
    if (existing) { res.status(409).json({ error: 'Application pending' }); return; }

    const result = db.prepare('INSERT INTO driver_applications (user_id, vehicle_type, notes) VALUES (?, ?, ?)')
      .run(req.user!.id, vehicle_type || 'boda', notes || '');
    res.json({ id: Number(result.lastInsertRowid), status: 'pending' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const apps = db.prepare('SELECT * FROM driver_applications WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json(apps);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
