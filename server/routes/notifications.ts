import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(req.user!.id);
    res.json(notifications);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/unread-count', auth, (req: Request, res: Response) => {
  try {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0')
      .get(req.user!.id) as any;
    res.json({ count });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/read-all', auth, (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user!.id);
    res.json({ message: 'All marked as read' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
