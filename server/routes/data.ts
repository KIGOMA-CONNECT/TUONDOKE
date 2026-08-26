import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth, authDownload } from '../middleware.js';

const router = Router();

router.get('/export', authDownload, (req: Request, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as any;
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    const trips = db.prepare('SELECT * FROM trips WHERE passenger_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user!.id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 100').all(wallet?.id || 0);

    const data = {
      user: { name: user?.name, phone: user?.phone, email: user?.email, role: user?.role, created_at: user?.created_at },
      wallet: { balance: wallet?.balance, savings: wallet?.savings },
      trips_count: trips.length,
      transactions_count: transactions.length,
      exported_at: new Date().toISOString()
    };

    res.json(data);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/export/csv', authDownload, (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'trips';
    let data: any[] = [];

    if (type === 'trips') {
      data = db.prepare('SELECT * FROM trips WHERE passenger_id = ?').all(req.user!.id);
    } else if (type === 'transactions') {
      const wallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
      data = wallet ? db.prepare('SELECT * FROM transactions WHERE wallet_id = ?').all(wallet.id) : [];
    } else {
      res.status(400).json({ error: 'Invalid type' }); return;
    }

    if (!data.length) { res.setHeader('Content-Type', 'text/csv'); res.send('No data'); return; }

    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}.csv`);
    res.send(csv);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
