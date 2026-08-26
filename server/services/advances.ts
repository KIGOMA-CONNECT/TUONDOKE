import db from '../db.js';

export function requestAdvance(driverId: number, amount: number): { id: number; error?: string } {
  if (amount <= 0 || amount > 50000) return { id: 0, error: 'Amount must be between 1 and 50000' };

  const pending = db.prepare('SELECT id FROM driver_advances WHERE driver_id = ? AND status IN (?, ?)')
    .get(driverId, 'pending', 'approved') as any;
  if (pending) return { id: 0, error: 'You already have a pending or active advance' };

  const result = db.prepare('INSERT INTO driver_advances (driver_id, amount, pct, balance) VALUES (?, ?, 10, ?)')
    .run(driverId, amount, amount);
  return { id: Number(result.lastInsertRowid) };
}

export function approveAdvance(advanceId: number): boolean {
  const row = db.prepare('SELECT * FROM driver_advances WHERE id = ? AND status = ?').get(advanceId, 'pending') as any;
  if (!row) return false;

  db.prepare('UPDATE driver_advances SET status = ?, approved_at = datetime(\'now\') WHERE id = ?')
    .run('approved', advanceId);

  const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(row.driver_id) as any;
  if (wallet) {
    const newBalance = wallet.balance + row.amount;
    db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);
    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(wallet.id, 'advance_disbursement', row.amount, newBalance, 'advance', advanceId, 'Driver advance approved');
  }

  db.prepare('UPDATE driver_advances SET disbursed_at = datetime(\'now\'), repaid_amount = 0, balance = ? WHERE id = ?')
    .run(row.amount, advanceId);
  return true;
}

export function autoRepayFromEarnings(driverId: number, earnings: number): number {
  const active = db.prepare('SELECT * FROM driver_advances WHERE driver_id = ? AND status = ?')
    .get(driverId, 'approved') as any;
  if (!active || active.balance <= 0) return 0;

  const repayAmount = Math.min(earnings * 0.1, active.balance);
  if (repayAmount <= 0) return 0;

  const newBalance = active.balance - repayAmount;
  const newRepaid = active.repaid_amount + repayAmount;

  if (newBalance <= 0) {
    db.prepare('UPDATE driver_advances SET balance = 0, repaid_amount = ?, status = ? WHERE id = ?')
      .run(newRepaid, 'repaid', active.id);
  } else {
    db.prepare('UPDATE driver_advances SET balance = ?, repaid_amount = ? WHERE id = ?')
      .run(newBalance, newRepaid, active.id);
  }

  const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(driverId) as any;
  if (wallet) {
    const walletNewBalance = wallet.balance - repayAmount;
    db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(walletNewBalance, wallet.id);
    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(wallet.id, 'advance_repayment', repayAmount, walletNewBalance, 'advance', active.id, 'Auto-repay from earnings');
  }

  return repayAmount;
}

export function getDriverAdvances(driverId: number): any[] {
  return db.prepare('SELECT * FROM driver_advances WHERE driver_id = ? ORDER BY created_at DESC').all(driverId);
}
