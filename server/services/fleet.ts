import db from '../db.js';

export function getFleet(fleetId: number): any {
  return db.prepare('SELECT * FROM fleets WHERE id = ?').get(fleetId);
}

export function getFleetMembers(fleetId: number): any[] {
  return db.prepare(`SELECT fm.*, u.name as driver_name, u.phone as driver_phone
    FROM fleet_members fm JOIN users u ON fm.driver_id = u.id
    WHERE fm.fleet_id = ? AND fm.active = 1`).all(fleetId);
}

export function calculateSplit(fleetId: number, tripEarnings: number): { driverAmount: number; ownerAmount: number }[] {
  const members = getFleetMembers(fleetId);
  return members.map(m => {
    const driverAmount = Math.floor(tripEarnings * m.share_pct / 100);
    const ownerAmount = tripEarnings - driverAmount;
    return { driverAmount, ownerAmount };
  });
}

export function applyFleetSplit(driverId: number, tripId: number, amount: number): void {
  const fleetMember = db.prepare('SELECT * FROM fleet_members WHERE driver_id = ? AND active = 1').get(driverId) as any;
  if (!fleetMember) return;

  const driverAmount = Math.floor(amount * fleetMember.share_pct / 100);
  const ownerAmount = amount - driverAmount;

  const driverWallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(driverId) as any;
  const fleet = getFleet(fleetMember.fleet_id);
  const ownerWallet = db.prepare('SELECT id FROM wallets WHERE user_id = ?').get(fleet.owner_id) as any;

  if (driverWallet) {
    const newBal = (db.prepare('SELECT balance FROM wallets WHERE id = ?').get(driverWallet.id) as any).balance + driverAmount;
    db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, driverWallet.id);
    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(driverWallet.id, 'ride_earning', driverAmount, newBal, 'trip', tripId, 'Fleet ride earning');
  }

  if (ownerWallet && ownerAmount > 0) {
    const newBal = (db.prepare('SELECT balance FROM wallets WHERE id = ?').get(ownerWallet.id) as any).balance + ownerAmount;
    db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, ownerWallet.id);
    db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(ownerWallet.id, 'ride_earning', ownerAmount, newBal, 'trip', tripId, 'Fleet owner split');
  }
}

export function getOwnerFleets(ownerId: number): any[] {
  return db.prepare('SELECT * FROM fleets WHERE owner_id = ?').all(ownerId);
}

export function getFleetEarnings(fleetId: number): number {
  const row = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions t JOIN wallets w ON t.wallet_id = w.id
    JOIN fleet_members fm ON fm.driver_id = w.user_id
    WHERE fm.fleet_id = ? AND t.type = 'ride_earning'`).get(fleetId) as any;
  return row?.total || 0;
}
