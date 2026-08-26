import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth, adminOnly } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

router.post('/', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const { url, events, secret } = req.body;
    if (!url) { res.status(400).json({ error: 'URL required' }); return; }

    const hookSecret = secret || crypto.randomBytes(32).toString('hex');
    const result = db.prepare('INSERT INTO webhooks (url, events, secret) VALUES (?, ?, ?)')
      .run(url, JSON.stringify(events || []), hookSecret);
    res.json({ id: Number(result.lastInsertRowid), secret: hookSecret });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const hooks = db.prepare('SELECT id, url, events, active, created_at FROM webhooks ORDER BY created_at DESC').all();
    res.json(hooks);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', auth, adminOnly, (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM webhooks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/test', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const hook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(req.params.id) as any;
    if (!hook) { res.status(404).json({ error: 'Not found' }); return; }

    logger.info({ webhookId: hook.id, url: hook.url }, 'Webhook test');
    res.json({ message: 'Test sent', url: hook.url });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/logs', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const logs = db.prepare(`SELECT wl.*, w.url FROM webhook_logs wl
      JOIN webhooks w ON wl.webhook_id = w.id ORDER BY wl.created_at DESC LIMIT 100`).all();
    res.json(logs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id/logs', auth, adminOnly, (req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM webhook_logs WHERE webhook_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
    res.json(logs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
