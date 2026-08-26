import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

router.post('/contacts', auth, (req: Request, res: Response) => {
  try {
    const { name, phone, relationship } = req.body;
    if (!name || !phone) { res.status(400).json({ error: 'Name and phone required' }); return; }

    const result = db.prepare('INSERT INTO emergency_contacts (user_id, name, phone, relationship) VALUES (?, ?, ?, ?)')
      .run(req.user!.id, name, phone, relationship || '');
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/contacts', auth, (req: Request, res: Response) => {
  try {
    const contacts = db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(req.user!.id);
    res.json(contacts);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/contacts/:id', auth, (req: Request, res: Response) => {
  try {
    const c = db.prepare('SELECT id FROM emergency_contacts WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
    if (!c) { res.status(404).json({ error: 'Not found' }); return; }
    db.prepare('DELETE FROM emergency_contacts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/sos', auth, (req: Request, res: Response) => {
  try {
    const { trip_id, location, lat, lng } = req.body;

    const result = db.prepare('INSERT INTO sos_alerts (user_id, trip_id, location, lat, lng) VALUES (?, ?, ?, ?, ?)')
      .run(req.user!.id, trip_id || null, location || '', lat || 0, lng || 0);

    const alertId = Number(result.lastInsertRowid);

    db.prepare('INSERT INTO sos_broadcasts (user_id, trip_id, lat, lng) VALUES (?, ?, ?, ?)')
      .run(req.user!.id, trip_id || null, lat || 0, lng || 0);

    const contacts = db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ?').all(req.user!.id);
    logger.warn({ alertId, userId: req.user!.id, contacts: contacts.length }, 'SOS ALERT');

    res.json({ id: alertId, message: 'SOS alert sent', contacts_notified: contacts.length });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/sos', auth, (req: Request, res: Response) => {
  try {
    const alerts = db.prepare('SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user!.id);
    res.json(alerts);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
