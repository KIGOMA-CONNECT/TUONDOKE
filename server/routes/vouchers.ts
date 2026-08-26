import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/buy', auth, (req: Request, res: Response) => {
  try {
    const { amount, recipient_phone } = req.body;
    if (!amount || amount <= 0 || !recipient_phone) { res.status(400).json({ error: 'Amount and recipient phone required' }); return; }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const code = 'NKVOUCH' + crypto.randomInt(100000, 999999).toString();

    const tx = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - amount, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .run(wallet.id, 'voucher_redemption', amount, wallet.balance - amount, `Voucher purchased for ${recipient_phone}`);

      db.prepare('INSERT INTO vouchers (code, buyer_id, recipient_phone, amount) VALUES (?, ?, ?, ?)')
        .run(code, req.user!.id, recipient_phone, amount);
    });

    tx();
    res.json({ code, amount, recipient_phone });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const vouchers = db.prepare(`SELECT * FROM vouchers
      WHERE buyer_id = ? OR recipient_phone = (SELECT phone FROM users WHERE id = ?)
      ORDER BY created_at DESC`).all(req.user!.id, req.user!.id);
    res.json(vouchers);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/redeem', auth, (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: 'Code required' }); return; }

    const voucher = db.prepare("SELECT * FROM vouchers WHERE code = ? AND status = 'active'").get(code) as any;
    if (!voucher) { res.status(404).json({ error: 'Invalid or used voucher' }); return; }

    const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(req.user!.id) as any;
    if (user?.phone !== voucher.recipient_phone && voucher.buyer_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to redeem' }); return;
    }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet) { res.status(404).json({ error: 'Wallet not found' }); return; }

    const tx = db.transaction(() => {
      const newBal = wallet.balance + voucher.amount;
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .run(wallet.id, 'voucher_redemption', voucher.amount, newBal, `Voucher ${code} redeemed`);
      db.prepare("UPDATE vouchers SET status = 'redeemed', redeemed_by = ?, redeemed_at = datetime('now') WHERE id = ?")
        .run(req.user!.id, voucher.id);
    });

    tx();
    res.json({ message: 'Redeemed', amount: voucher.amount });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
