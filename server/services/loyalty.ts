import db from '../db.js';

export function accruePoints(userId: number, amount: number, refType: string, refId: number, description: string): void {
  const points = Math.floor(amount / 100);
  if (points <= 0) return;

  const existing = db.prepare('SELECT id, points, lifetime_earned FROM loyalty_points WHERE user_id = ?').get(userId) as any;

  if (existing) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 180);
    db.prepare('UPDATE loyalty_points SET points = points + ?, lifetime_earned = lifetime_earned + ?, expires_at = ? WHERE id = ?')
      .run(points, points, expiresAt.toISOString(), existing.id);
  } else {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 180);
    db.prepare('INSERT INTO loyalty_points (user_id, points, lifetime_earned, expires_at) VALUES (?, ?, ?, ?)')
      .run(userId, points, points, expiresAt.toISOString());
  }

  db.prepare('INSERT INTO loyalty_history (user_id, type, points, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, 'earn', points, refType, refId, description);
}

export function redeemPoints(userId: number, points: number, mode: string, description: string): { success: boolean; error?: string } {
  const lp = db.prepare('SELECT id, points FROM loyalty_points WHERE user_id = ?').get(userId) as any;
  if (!lp || lp.points < points) return { success: false, error: 'Insufficient points' };

  db.prepare('UPDATE loyalty_points SET points = points - ?, lifetime_redeemed = lifetime_redeemed + ? WHERE id = ?')
    .run(points, points, lp.id);

  let cashAmount = 0;
  if (mode === 'cash') cashAmount = points * 10;
  else if (mode === 'trip') cashAmount = points * 10;
  else if (mode === 'airtime') cashAmount = points * 8;

  if (cashAmount > 0) {
    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(userId) as any;
    if (wallet) {
      const newBalance = wallet.balance + cashAmount;
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBalance, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, description) VALUES (?, ?, ?, ?, ?, ?)')
        .run(wallet.id, 'loyalty_redeem', cashAmount, newBalance, 'loyalty', description);
    }
  }

  db.prepare('INSERT INTO loyalty_history (user_id, type, points, ref_type, description) VALUES (?, ?, ?, ?, ?)')
    .run(userId, 'redeem', points, 'loyalty', description);

  return { success: true };
}

export function expireOldPoints(): number {
  const now = new Date().toISOString();
  const expired = db.prepare('SELECT id, user_id, points FROM loyalty_points WHERE expires_at < ? AND points > 0').all(now) as any[];
  let total = 0;
  for (const row of expired) {
    db.prepare('INSERT INTO loyalty_history (user_id, type, points, description) VALUES (?, ?, ?, ?)')
      .run(row.user_id, 'expire', row.points, 'Points expired');
    db.prepare('UPDATE loyalty_points SET points = 0 WHERE id = ?').run(row.id);
    total += row.points;
  }
  return total;
}
