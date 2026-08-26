import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const routes = db.prepare('SELECT * FROM favorite_routes WHERE user_id = ? ORDER BY use_count DESC').all(req.user!.id);
    res.json(routes);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { from_zone, to_zone, label } = req.body;
    if (!from_zone || !to_zone) { res.status(400).json({ error: 'Zones required' }); return; }

    const existing = db.prepare('SELECT id FROM favorite_routes WHERE user_id = ? AND from_zone = ? AND to_zone = ?')
      .get(req.user!.id, from_zone, to_zone);
    if (existing) { res.status(409).json({ error: 'Already saved' }); return; }

    const result = db.prepare('INSERT INTO favorite_routes (user_id, from_zone, to_zone, label) VALUES (?, ?, ?, ?)')
      .run(req.user!.id, from_zone, to_zone, label || '');
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', auth, (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM favorite_routes WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
