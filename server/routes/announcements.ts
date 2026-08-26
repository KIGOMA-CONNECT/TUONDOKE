import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const items = db.prepare('SELECT id, title, body, slug, created_at FROM announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 20').all();
    res.json(items);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:slug', (req: Request, res: Response) => {
  try {
    const item = db.prepare('SELECT * FROM announcements WHERE slug = ? AND active = 1').get(req.params.slug);
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
