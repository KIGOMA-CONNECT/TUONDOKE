import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/my-code', auth, (req: Request, res: Response) => {
  try {
    let code = db.prepare('SELECT value FROM settings WHERE key = ?').get(`qr_code_${req.user!.id}`) as any;
    if (!code) {
      const newCode = 'NKQR' + crypto.randomInt(100000, 999999).toString();
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`qr_code_${req.user!.id}`, newCode);
      code = { value: newCode };
    }
    res.json({ code: code.value, user_id: req.user!.id });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/resolve', auth, (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: 'Code required' }); return; }

    const settingsKey = Object.keys(db.prepare("SELECT key FROM settings WHERE key LIKE 'qr_code_%'").get() || {}).find(k => {
      const v = db.prepare('SELECT value FROM settings WHERE key = ?').get(k) as any;
      return v?.value === code;
    });

    // Simpler approach - search all QR codes
    const allCodes = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'qr_code_%'").all() as any[];
    const match = allCodes.find(c => c.value === code);

    if (!match) { res.status(404).json({ error: 'Invalid QR code' }); return; }

    const userId = parseInt(match.key.replace('qr_code_', ''));
    const user = db.prepare('SELECT id, name, phone, role FROM users WHERE id = ?').get(userId) as any;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    res.json({ user_id: user.id, name: user.name, phone: user.phone, role: user.role });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/pay', auth, (req: Request, res: Response) => {
  try {
    const { code, amount, note } = req.body;
    if (!code || !amount || amount <= 0) { res.status(400).json({ error: 'Code and amount required' }); return; }

    const allCodes = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'qr_code_%'").all() as any[];
    const match = allCodes.find(c => c.value === code);
    if (!match) { res.status(404).json({ error: 'Invalid QR code' }); return; }

    const recipientId = parseInt(match.key.replace('qr_code_', ''));
    if (recipientId === req.user!.id) { res.status(400).json({ error: 'Cannot pay self' }); return; }

    const senderWallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    const recipientWallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(recipientId) as any;

    if (!senderWallet || !recipientWallet) { res.status(404).json({ error: 'Wallet not found' }); return; }
    if (senderWallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const tx = db.transaction(() => {
      const newSenderBal = senderWallet.balance - amount;
      const newRecipientBal = recipientWallet.balance + amount;

      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newSenderBal, senderWallet.id);
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newRecipientBal, recipientWallet.id);

      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(senderWallet.id, 'transfer_out', amount, newSenderBal, 'qrpay', recipientId, note || 'QR payment');
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(recipientWallet.id, 'transfer_in', amount, newRecipientBal, 'qrpay', req.user!.id, note || 'QR payment received');
    });

    tx();
    res.json({ message: 'Payment complete', amount });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
