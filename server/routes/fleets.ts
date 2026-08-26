import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: 'Name required' }); return; }

    const result = db.prepare('INSERT INTO fleets (owner_id, name, description) VALUES (?, ?, ?)')
      .run(req.user!.id, name, description || '');
    res.json({ id: Number(result.lastInsertRowid), name });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const fleets = db.prepare('SELECT * FROM fleets WHERE owner_id = ?').all(req.user!.id);
    res.json(fleets);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', auth, (req: Request, res: Response) => {
  try {
    const fleet = db.prepare('SELECT * FROM fleets WHERE id = ?').get(req.params.id) as any;
    if (!fleet) { res.status(404).json({ error: 'Not found' }); return; }
    const members = db.prepare(`SELECT fm.*, u.name as driver_name, u.phone as driver_phone
      FROM fleet_members fm JOIN users u ON fm.driver_id = u.id WHERE fm.fleet_id = ? AND fm.active = 1`)
      .all(req.params.id);
    res.json({ fleet, members });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/members', auth, (req: Request, res: Response) => {
  try {
    const { driver_id, share_pct } = req.body;
    if (!driver_id) { res.status(400).json({ error: 'Driver ID required' }); return; }

    const fleet = db.prepare('SELECT * FROM fleets WHERE id = ? AND owner_id = ?').get(req.params.id, req.user!.id) as any;
    if (!fleet) { res.status(404).json({ error: 'Fleet not found' }); return; }

    const existing = db.prepare('SELECT id FROM fleet_members WHERE fleet_id = ? AND driver_id = ?').get(req.params.id, driver_id);
    if (existing) { res.status(409).json({ error: 'Already member' }); return; }

    db.prepare('INSERT INTO fleet_members (fleet_id, driver_id, share_pct) VALUES (?, ?, ?)')
      .run(req.params.id, driver_id, share_pct || 90);
    res.json({ message: 'Driver added' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/:id/members/:memberId', auth, (req: Request, res: Response) => {
  try {
    const { share_pct } = req.body;
    db.prepare('UPDATE fleet_members SET share_pct = ? WHERE id = ? AND fleet_id = ?')
      .run(share_pct || 90, req.params.memberId, req.params.id);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id/members/:memberId', auth, (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE fleet_members SET active = 0 WHERE id = ? AND fleet_id = ?').run(req.params.memberId, req.params.id);
    res.json({ message: 'Removed' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
