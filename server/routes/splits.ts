import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { trip_id, invitee_phone, amount } = req.body;
    if (!trip_id || !invitee_phone || !amount) { res.status(400).json({ error: 'All fields required' }); return; }

    const invitee = db.prepare('SELECT id FROM users WHERE phone = ?').get(invitee_phone) as any;
    if (!invitee) { res.status(404).json({ error: 'User not found' }); return; }
    if (invitee.id === req.user!.id) { res.status(400).json({ error: 'Cannot split with self' }); return; }

    const result = db.prepare('INSERT INTO splits_v2 (trip_id, inviter_id, invitee_id, amount) VALUES (?, ?, ?, ?)')
      .run(trip_id, req.user!.id, invitee.id, amount);
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const invited = db.prepare(`SELECT s.*, u.name as inviter_name, t.origin, t.destination
      FROM splits_v2 s JOIN users u ON s.inviter_id = u.id JOIN trips t ON s.trip_id = t.id
      WHERE s.invitee_id = ? ORDER BY s.created_at DESC`).all(req.user!.id);

    const created = db.prepare(`SELECT s.*, u.name as invitee_name, t.origin, t.destination
      FROM splits_v2 s JOIN users u ON s.invitee_id = u.id JOIN trips t ON s.trip_id = t.id
      WHERE s.inviter_id = ? ORDER BY s.created_at DESC`).all(req.user!.id);

    res.json({ invited, created });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/pay', auth, (req: Request, res: Response) => {
  try {
    const split = db.prepare("SELECT * FROM splits_v2 WHERE id = ? AND invitee_id = ? AND status = 'pending'")
      .get(req.params.id, req.user!.id) as any;
    if (!split) { res.status(404).json({ error: 'Not found' }); return; }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < split.amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const tx = db.transaction(() => {
      const newBal = wallet.balance - split.amount;
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(wallet.id, 'split_payment', split.amount, newBal, 'split', split.id, 'Split payment');

      db.prepare("UPDATE splits_v2 SET status = 'paid' WHERE id = ?").run(split.id);

      const inviterWallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(split.inviter_id) as any;
      if (inviterWallet) {
        const inviterNewBal = inviterWallet.balance + split.amount;
        db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(inviterNewBal, inviterWallet.id);
        db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(inviterWallet.id, 'split_payment', split.amount, inviterNewBal, 'split', split.id, 'Split received');
      }
    });

    tx();
    res.json({ message: 'Paid' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
