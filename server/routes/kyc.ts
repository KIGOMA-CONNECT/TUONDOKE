import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { document_type, document_url } = req.body;
    if (!document_type) { res.status(400).json({ error: 'Document type required' }); return; }

    const existing = db.prepare("SELECT id FROM kyc_submissions WHERE user_id = ? AND status = 'pending'").get(req.user!.id);
    if (existing) { res.status(409).json({ error: 'Submission pending' }); return; }

    db.prepare("UPDATE users SET kyc_status = 'pending' WHERE id = ?").run(req.user!.id);

    const result = db.prepare('INSERT INTO kyc_submissions (user_id, document_type, document_url) VALUES (?, ?, ?)')
      .run(req.user!.id, document_type, document_url || '');
    res.json({ id: Number(result.lastInsertRowid), status: 'pending' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/me', auth, (req: Request, res: Response) => {
  try {
    const sub = db.prepare('SELECT * FROM kyc_submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user!.id);
    const user = db.prepare('SELECT kyc_status FROM users WHERE id = ?').get(req.user!.id) as any;
    res.json({ kyc_status: user?.kyc_status || 'none', submission: sub || null });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
