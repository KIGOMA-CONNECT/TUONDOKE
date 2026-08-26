import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/:tripId', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId) as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    if (trip.passenger_id !== req.user!.id && trip.driver_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`share_${trip.id}`, token);

    res.json({ token, url: `/share/${token}` });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:token', (req: Request, res: Response) => {
  try {
    const allShares = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'share_%'").all() as any[];
    const match = allShares.find(s => s.value === req.params.token);
    if (!match) { res.status(404).json({ error: 'Invalid share link' }); return; }

    const tripId = match.key.replace('share_', '');
    const trip = db.prepare(`SELECT t.*, p.name as passenger_name, d.name as driver_name, d.phone as driver_phone
      FROM trips t LEFT JOIN users p ON t.passenger_id = p.id LEFT JOIN users d ON t.driver_id = d.id
      WHERE t.id = ?`).get(tripId);

    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }
    res.json({ trip, shared: true });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/:tripId', auth, (req: Request, res: Response) => {
  try {
    db.prepare("DELETE FROM settings WHERE key = ?").run(`share_${req.params.tripId}`);
    res.json({ message: 'Unshared' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
