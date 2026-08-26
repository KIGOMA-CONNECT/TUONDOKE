import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/income', auth, (req: Request, res: Response) => {
  try {
    const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet) { res.json({ earnings: [], total: 0 }); return; }

    const earnings = db.prepare(`SELECT date(created_at) as day, SUM(amount) as total, COUNT(*) as count
      FROM transactions WHERE wallet_id = ? AND type = 'ride_earning'
      GROUP BY date(created_at) ORDER BY day DESC LIMIT 30`).all(wallet.id);
    const total = earnings.reduce((sum: number, e: any) => sum + e.total, 0);

    res.json({ earnings, total });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/account', auth, (req: Request, res: Response) => {
  try {
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet) { res.json({ transactions: [], balance: 0 }); return; }

    const transactions = db.prepare(`SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 100`).all(wallet.id);
    res.json({ balance: wallet.balance, savings: wallet.savings, transactions });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
