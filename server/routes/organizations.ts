import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { name, contact_phone, contact_email } = req.body;
    if (!name) { res.status(400).json({ error: 'Name required' }); return; }

    const result = db.prepare('INSERT INTO organizations (name, owner_id, contact_phone, contact_email) VALUES (?, ?, ?, ?)')
      .run(name, req.user!.id, contact_phone || '', contact_email || '');
    const orgId = Number(result.lastInsertRowid);

    db.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)').run(orgId, req.user!.id, 'owner');
    db.prepare('INSERT INTO wallets (user_id) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = ?)').run(req.user!.id, req.user!.id);

    res.json({ id: orgId, name });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const orgs = db.prepare(`SELECT o.*, om.role FROM organizations o
      JOIN org_members om ON o.id = om.org_id WHERE om.user_id = ?`).all(req.user!.id);
    res.json(orgs);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/members', auth, (req: Request, res: Response) => {
  try {
    const { user_id, role } = req.body;
    if (!user_id) { res.status(400).json({ error: 'User ID required' }); return; }

    const isMember = db.prepare('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!isMember || !['owner', 'admin'].includes(isMember.role)) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const existing = db.prepare('SELECT id FROM org_members WHERE org_id = ? AND user_id = ?').get(req.params.id, user_id);
    if (existing) { res.status(409).json({ error: 'Already member' }); return; }

    db.prepare('INSERT INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, user_id, role || 'member');
    res.json({ message: 'Member added' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id/members', auth, (req: Request, res: Response) => {
  try {
    const members = db.prepare(`SELECT om.*, u.name, u.phone, u.email FROM org_members om
      JOIN users u ON om.user_id = u.id WHERE om.org_id = ?`).all(req.params.id);
    res.json(members);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id/members/:userId', auth, (req: Request, res: Response) => {
  try {
    const isOwner = db.prepare("SELECT role FROM org_members WHERE org_id = ? AND user_id = ? AND role = 'owner'").get(req.params.id, req.user!.id);
    if (!isOwner && req.user!.role !== 'admin') { res.status(403).json({ error: 'Not authorized' }); return; }

    db.prepare('DELETE FROM org_members WHERE org_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
    res.json({ message: 'Removed' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
