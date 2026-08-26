import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const places = db.prepare('SELECT * FROM saved_places WHERE user_id = ? ORDER BY sort_order').all(req.user!.id);
    res.json(places);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { place_name, address, lat, lng, zone, icon } = req.body;
    if (!place_name) { res.status(400).json({ error: 'Place name required' }); return; }

    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next FROM saved_places WHERE user_id = ?').get(req.user!.id) as any).next;
    const result = db.prepare('INSERT INTO saved_places (user_id, place_name, address, lat, lng, zone, sort_order, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(req.user!.id, place_name, address || '', lat || 0, lng || 0, zone || '', maxOrder, icon || 'home');
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/:id', auth, (req: Request, res: Response) => {
  try {
    const p = db.prepare('SELECT id FROM saved_places WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!p) { res.status(404).json({ error: 'Not found' }); return; }

    const { place_name, address, lat, lng, zone, icon } = req.body;
    db.prepare('UPDATE saved_places SET place_name = ?, address = ?, lat = ?, lng = ?, zone = ?, icon = ? WHERE id = ?')
      .run(place_name || '', address || '', lat || 0, lng || 0, zone || '', icon || 'home', req.params.id);
    res.json({ message: 'Updated' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:id', auth, (req: Request, res: Response) => {
  try {
    const p = db.prepare('SELECT id FROM saved_places WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!p) { res.status(404).json({ error: 'Not found' }); return; }
    db.prepare('DELETE FROM saved_places WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
