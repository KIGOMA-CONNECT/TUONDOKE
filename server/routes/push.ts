import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/subscribe', auth, (req: Request, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint) { res.status(400).json({ error: 'Endpoint required' }); return; }

    const result = db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES (?, ?, ?)')
      .run(req.user!.id, endpoint, keys || '{}');
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/subscriptions', auth, (req: Request, res: Response) => {
  try {
    const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(req.user!.id);
    res.json(subs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', auth, (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?').run(req.params.id, req.user!.id);
    res.json({ message: 'Unsubscribed' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
