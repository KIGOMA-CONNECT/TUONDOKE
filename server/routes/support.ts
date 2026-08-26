import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/tickets', auth, (req: Request, res: Response) => {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || !message) { res.status(400).json({ error: 'Subject and message required' }); return; }

    const result = db.prepare('INSERT INTO support_tickets (user_id, subject, priority) VALUES (?, ?, ?)')
      .run(req.user!.id, subject, priority || 'normal');
    const ticketId = Number(result.lastInsertRowid);

    db.prepare('INSERT INTO support_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)')
      .run(ticketId, req.user!.id, message);

    res.json({ id: ticketId, subject });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/tickets', auth, (req: Request, res: Response) => {
  try {
    const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json(tickets);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/tickets/:id', auth, (req: Request, res: Response) => {
  try {
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }

    const messages = db.prepare(`SELECT sm.*, u.name as sender_name FROM support_messages sm
      JOIN users u ON sm.sender_id = u.id WHERE sm.ticket_id = ? ORDER BY sm.created_at`).all(req.params.id);
    res.json({ ticket, messages });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/tickets/:id/messages', auth, (req: Request, res: Response) => {
  try {
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id) as any;
    if (!ticket) { res.status(404).json({ error: 'Not found' }); return; }

    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'Message required' }); return; }

    db.prepare('INSERT INTO support_messages (ticket_id, sender_id, message) VALUES (?, ?, ?)')
      .run(req.params.id, req.user!.id, message);
    res.json({ message: 'Sent' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
