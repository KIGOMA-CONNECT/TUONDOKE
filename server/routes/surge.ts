import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth, adminOnly } from '../middleware.js';

const router = Router();

router.get('/multipliers', (req: Request, res: Response) => {
  try {
    const configs = db.prepare('SELECT * FROM surge_configs WHERE active = 1').all();
    res.json(configs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { zone, vehicle_type, multiplier } = req.body;
    if (!zone || !vehicle_type || !multiplier) { res.status(400).json({ error: 'All fields required' }); return; }

    const existing = db.prepare('SELECT id FROM surge_configs WHERE zone = ? AND vehicle_type = ?').get(zone, vehicle_type);
    if (existing) {
      db.prepare('UPDATE surge_configs SET multiplier = ? WHERE zone = ? AND vehicle_type = ?').run(multiplier, zone, vehicle_type);
      res.json({ message: 'Updated' });
    } else {
      const result = db.prepare('INSERT INTO surge_configs (zone, vehicle_type, multiplier) VALUES (?, ?, ?)').run(zone, vehicle_type, multiplier);
      res.json({ id: Number(result.lastInsertRowid) });
    }
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { multiplier, active } = req.body;
    const fields: string[] = [];
    const params: any[] = [];
    if (multiplier !== undefined) { fields.push('multiplier = ?'); params.push(multiplier); }
    if (active !== undefined) { fields.push('active = ?'); params.push(active ? 1 : 0); }
    if (!fields.length) { res.status(400).json({ error: 'Nothing to update' }); return; }
    params.push(req.params.id);
    db.prepare(`UPDATE surge_configs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
