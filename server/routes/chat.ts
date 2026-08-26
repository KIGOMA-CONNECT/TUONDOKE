import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/:tripId', auth, (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'Message required' }); return; }

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId) as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    if (trip.passenger_id !== req.user!.id && trip.driver_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const result = db.prepare('INSERT INTO chats (trip_id, sender_id, message) VALUES (?, ?, ?)')
      .run(req.params.tripId, req.user!.id, message);

    const recipientId = trip.passenger_id === req.user!.id ? trip.driver_id : trip.passenger_id;
    if (recipientId) {
      const existing = db.prepare('SELECT unread_count FROM chat_unread WHERE trip_id = ? AND user_id = ?')
        .get(req.params.tripId, recipientId) as any;
      if (existing) {
        db.prepare('UPDATE chat_unread SET unread_count = unread_count + 1 WHERE trip_id = ? AND user_id = ?')
          .run(req.params.tripId, recipientId);
      } else {
        db.prepare('INSERT INTO chat_unread (trip_id, user_id, unread_count) VALUES (?, ?, 1)').run(req.params.tripId, recipientId);
      }
    }

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:tripId', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId) as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    if (trip.passenger_id !== req.user!.id && trip.driver_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    const messages = db.prepare(`SELECT c.*, u.name as sender_name FROM chats c
      JOIN users u ON c.sender_id = u.id WHERE c.trip_id = ? ORDER BY c.created_at ASC`).all(req.params.tripId);
    res.json(messages);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:tripId/read', auth, (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE chats SET read = 1 WHERE trip_id = ? AND sender_id != ?').run(req.params.tripId, req.user!.id);
    db.prepare('UPDATE chat_unread SET unread_count = 0 WHERE trip_id = ? AND user_id = ?').run(req.params.tripId, req.user!.id);
    res.json({ message: 'Marked as read' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/unread/summary', auth, (req: Request, res: Response) => {
  try {
    const unread = db.prepare(`SELECT cu.trip_id, cu.unread_count, t.origin, t.destination
      FROM chat_unread cu JOIN trips t ON cu.trip_id = t.id
      WHERE cu.user_id = ? AND cu.unread_count > 0`).all(req.user!.id);
    res.json(unread);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
