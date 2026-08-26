import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/fd-rates', (req: Request, res: Response) => {
  try {
    res.json({ rates: [
      { tenure_months: 3, rate_pct: 8 },
      { tenure_months: 6, rate_pct: 10 },
      { tenure_months: 12, rate_pct: 12 },
      { tenure_months: 24, rate_pct: 14 }
    ]});
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/fd', auth, (req: Request, res: Response) => {
  try {
    const { amount, tenure_months } = req.body;
    if (!amount || amount < 1000) { res.status(400).json({ error: 'Minimum FD is 1000' }); return; }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const rates: Record<number, number> = { 3: 8, 6: 10, 12: 12, 24: 14 };
    const rate = rates[tenure_months || 6] || 10;

    const tx = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - amount, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
        .run(wallet.id, 'fd_opening', amount, wallet.balance - amount, `FD opened: ${tenure_months || 6} months at ${rate}%`);

      const maturesAt = new Date();
      maturesAt.setMonth(maturesAt.getMonth() + (tenure_months || 6));

      db.prepare('INSERT INTO fixed_deposits (user_id, amount, rate_pct, tenure_months, matures_at, auto_renew) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.user!.id, amount, rate, tenure_months || 6, maturesAt.toISOString(), req.body.auto_renew ? 1 : 0);
    });

    tx();
    res.json({ message: 'FD opened', amount, tenure_months: tenure_months || 6, rate_pct: rate });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/fd', auth, (req: Request, res: Response) => {
  try {
    const fds = db.prepare('SELECT * FROM fixed_deposits WHERE user_id = ? ORDER BY opened_at DESC').all(req.user!.id);
    res.json(fds);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/loans', auth, (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Amount required' }); return; }

    const result = db.prepare('INSERT INTO loans (user_id, amount) VALUES (?, ?)').run(req.user!.id, amount);
    res.json({ id: Number(result.lastInsertRowid), status: 'pending' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/loans', auth, (req: Request, res: Response) => {
  try {
    const loans = db.prepare('SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC').all(req.user!.id);
    res.json(loans);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/loans/:id/repay', auth, (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'Amount required' }); return; }

    const loan = db.prepare("SELECT * FROM loans WHERE id = ? AND user_id = ? AND status IN ('approved','disbursed')").get(req.params.id, req.user!.id) as any;
    if (!loan) { res.status(404).json({ error: 'Loan not found' }); return; }

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (!wallet || wallet.balance < amount) { res.status(400).json({ error: 'Insufficient balance' }); return; }

    const tx = db.transaction(() => {
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - amount, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(wallet.id, 'loan_repayment', amount, wallet.balance - amount, 'loan', loan.id, 'Loan repayment');

      const newRepaid = loan.repaid_amount + amount;
      const newStatus = newRepaid >= loan.amount ? 'repaid' : loan.status;
      db.prepare('UPDATE loans SET repaid_amount = ?, status = ? WHERE id = ?').run(newRepaid, newStatus, loan.id);
    });

    tx();
    res.json({ message: 'Repaid', repaid: amount });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
