import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';
import { accruePoints } from '../services/loyalty.js';
import logger from '../logger.js';

const router = Router();

router.get('/balance', auth, (req: Request, res: Response) => {
  try {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id);
    res.json(wallet || { balance: 0, savings: 0, escrow_balance: 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/transactions', auth, (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const type = req.query.type as string;

    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet) { res.json({ transactions: [], total: 0 }); return; }

    let query = 'SELECT * FROM transactions WHERE wallet_id = ?';
    let countQuery = 'SELECT COUNT(*) as count FROM transactions WHERE wallet_id = ?';
    const params: any[] = [wallet.id];
    const countParams: any[] = [wallet.id];

    if (type) {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const transactions = db.prepare(query).all(...params);
    const { count } = db.prepare(countQuery).get(...countParams) as any;

    res.json({ transactions, total: count, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/deposit', auth, (req: Request, res: Response) => {
  try {
    const { amount, method } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet) { res.status(404).json({ error: 'Wallet not found' }); return; }

    const newBalance = wallet.balance + amount;
    db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);

    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description, meta) VALUES (?, ?, ?, ?, ?, ?)')
      .run(wallet.id, 'deposit', amount, newBalance, `Deposit via ${method || 'manual'}`, JSON.stringify({ method }));

    accruePoints(req.user!.id, amount, 'wallet', wallet.id, 'Wallet deposit');
    res.json({ balance: newBalance, amount });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Deposit error');
    res.status(500).json({ error: 'Deposit failed' });
  }
});

router.post('/withdraw', auth, (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Invalid amount' }); return; }

    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet) { res.status(404).json({ error: 'Wallet not found' }); return; }
    if (wallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const newBalance = wallet.balance - amount;
    db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);

    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
      .run(wallet.id, 'withdrawal', amount, newBalance, 'Withdrawal');

    res.json({ balance: newBalance });
  } catch (err: any) {
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

router.post('/transfer', auth, (req: Request, res: Response) => {
  try {
    const { toPhone, amount, note } = req.body;
    if (!toPhone || !amount || amount <= 0) { res.status(400).json({ error: 'Invalid params' }); return; }

    const sender = db.prepare('SELECT id FROM users WHERE id = ?').get(req.user!.id) as any;
    const recipient = db.prepare('SELECT id FROM users WHERE phone = ?').get(toPhone) as any;
    if (!recipient) { res.status(404).json({ error: 'Recipient not found' }); return; }
    if (recipient.id === req.user!.id) { res.status(400).json({ error: 'Cannot transfer to self' }); return; }

    const senderWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    const recipientWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(recipient.id) as any;

    if (!senderWallet || !recipientWallet) { res.status(404).json({ error: 'Wallet not found' }); return; }
    if (senderWallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const tx = db.transaction(() => {
      const newSenderBal = senderWallet.balance - amount;
      const newRecipientBal = recipientWallet.balance + amount;

      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newSenderBal, senderWallet.id);
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newRecipientBal, recipientWallet.id);

      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(senderWallet.id, 'transfer_out', amount, newSenderBal, 'user', recipient.id, note || `Transfer to ${toPhone}`);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(recipientWallet.id, 'transfer_in', amount, newRecipientBal, 'user', req.user!.id, note || `Transfer from ${senderWallet.user_id}`);
    });

    tx();
    res.json({ message: 'Transfer complete' });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Transfer error');
    res.status(500).json({ error: 'Transfer failed' });
  }
});

export default router;
