import db from '../db.js';

export function generateReceipt(userId: number, tripId: number | null, amount: number): { id: number; html: string } {
  const user = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(userId) as any;
  const trip = tripId ? db.prepare('SELECT origin, destination, final_fare, distance_km, vehicle_type, created_at FROM trips WHERE id = ?').get(tripId) as any : null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .details { margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ccc; }
    .total { font-weight: bold; font-size: 18px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TUONDOKE</div>
    <p>Healing and Logistic Management Platform</p>
  </div>
  <div class="details">
    <div class="row"><span>Receipt #</span><span>RCT-${Date.now()}</span></div>
    <div class="row"><span>Date</span><span>${new Date().toISOString()}</span></div>
    <div class="row"><span>Customer</span><span>${user?.name || 'N/A'} (${user?.phone || ''})</span></div>
    ${trip ? `
    <div class="row"><span>From</span><span>${trip.origin}</span></div>
    <div class="row"><span>To</span><span>${trip.destination}</span></div>
    <div class="row"><span>Distance</span><span>${trip.distance_km?.toFixed(1) || 0} km</span></div>
    <div class="row"><span>Vehicle</span><span>${trip.vehicle_type}</span></div>
    ` : ''}
    <div class="row total"><span>Total Amount</span><span>KES ${amount.toLocaleString()}</span></div>
  </div>
  <div class="footer">
    <p>Thank you for using TUONDOKE</p>
    <p>For support: support@tuondoke.com</p>
  </div>
</body>
</html>`;

  const result = db.prepare('INSERT INTO receipts (user_id, trip_id, amount, html) VALUES (?, ?, ?, ?)')
    .run(userId, tripId, amount, html);

  return { id: Number(result.lastInsertRowid), html };
}

export function getReceipt(id: number): any {
  return db.prepare('SELECT * FROM receipts WHERE id = ?').get(id);
}

export function getUserReceipts(userId: number): any[] {
  return db.prepare('SELECT * FROM receipts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId);
}
