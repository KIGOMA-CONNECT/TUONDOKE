import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';
import { accruePoints } from '../services/loyalty.js';
import { autoRepayFromEarnings } from '../services/advances.js';
import logger from '../logger.js';

const router = Router();

const FARE_RATES: Record<string, { base: number; perKm: number; perMin: number }> = {
  boda: { base: 50, perKm: 20, perMin: 5 },
  bajaji: { base: 80, perKm: 30, perMin: 8 },
  pickup: { base: 150, perKm: 40, perMin: 10 },
  guta: { base: 200, perKm: 50, perMin: 12 },
  fuso: { base: 300, perKm: 60, perMin: 15 }
};

function estimateFare(vehicleType: string, distanceKm: number, durationMin: number, zone?: string): number {
  const rates = FARE_RATES[vehicleType] || FARE_RATES.boda;
  let fare = rates.base + Math.floor(rates.perKm * distanceKm) + Math.floor(rates.perMin * durationMin);

  if (zone) {
    const surge = db.prepare('SELECT multiplier FROM surge_configs WHERE zone = ? AND vehicle_type = ? AND active = 1')
      .get(zone, vehicleType) as any;
    if (surge) fare = Math.floor(fare * surge.multiplier);
  }

  return Math.max(fare, 50);
}

router.post('/estimate', auth, (req: Request, res: Response) => {
  try {
    const { origin, destination, vehicle_type, origin_lat, origin_lng, dest_lat, dest_lng } = req.body;
    if (!origin || !destination) { res.status(400).json({ error: 'Origin and destination required' }); return; }

    const distanceKm = Math.random() * 10 + 1;
    const durationMin = Math.random() * 30 + 5;
    const fare = estimateFare(vehicle_type || 'boda', distanceKm, durationMin);

    res.json({
      vehicle_type: vehicle_type || 'boda',
      distance_km: Math.round(distanceKm * 10) / 10,
      duration_minutes: Math.round(durationMin),
      estimated_fare: fare,
      surge_multiplier: 1.0
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/book', auth, (req: Request, res: Response) => {
  try {
    const { origin, destination, vehicle_type, origin_lat, origin_lng, dest_lat, dest_lng,
      from_zone, to_zone, payment_method, passenger_notes, scheduled_at } = req.body;
    if (!origin || !destination) { res.status(400).json({ error: 'Origin and destination required' }); return; }

    const distanceKm = Math.random() * 10 + 1;
    const durationMin = Math.random() * 30 + 5;
    const baseFare = estimateFare(vehicle_type || 'boda', distanceKm, durationMin, from_zone);

    const result = db.prepare(`
      INSERT INTO trips (passenger_id, vehicle_type, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng,
        from_zone, to_zone, base_fare, distance_km, payment_method, passenger_notes, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user!.id, vehicle_type || 'boda', origin, destination,
      origin_lat || 0, origin_lng || 0, dest_lat || 0, dest_lng || 0,
      from_zone || '', to_zone || '', baseFare, distanceKm,
      payment_method || 'cash', passenger_notes || '', scheduled_at || null);

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(Number(result.lastInsertRowid));
    res.json(trip);
  } catch (err: any) {
    logger.error({ err: err.message }, 'Book ride error');
    res.status(500).json({ error: 'Booking failed' });
  }
});

router.get('/mine', auth, (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = 'SELECT * FROM trips WHERE passenger_id = ?';
    const params: any[] = [req.user!.id];

    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const trips = db.prepare(query).all(...params);
    const total = (db.prepare('SELECT COUNT(*) as count FROM trips WHERE passenger_id = ?' + (status ? ' AND status = ?' : '')).get(...(status ? [req.user!.id, status] : [req.user!.id])) as any).count;

    res.json({ trips, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/open', auth, (req: Request, res: Response) => {
  try {
    const trips = db.prepare(`SELECT t.*, u.name as passenger_name, u.phone as passenger_phone
      FROM trips t JOIN users u ON t.passenger_id = u.id
      WHERE t.status = 'requested' AND t.driver_id IS NULL
      ORDER BY t.created_at DESC LIMIT 50`).all();
    res.json(trips);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/accept', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND status = ?').get(req.params.id, 'requested') as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found or not available' }); return; }

    db.prepare('UPDATE trips SET driver_id = ?, status = ? WHERE id = ?')
      .run(req.user!.id, 'accepted', trip.id);

    const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/start', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND driver_id = ? AND status = ?')
      .get(req.params.id, req.user!.id, 'accepted') as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    db.prepare('UPDATE trips SET status = ?, started_at = datetime(\'now\') WHERE id = ?').run('in_progress', trip.id);
    res.json({ message: 'Trip started' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/complete', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND driver_id = ? AND status = ?')
      .get(req.params.id, req.user!.id, 'in_progress') as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    const finalFare = trip.base_fare + (req.body.tip_amount || 0);

    const tx = db.transaction(() => {
      db.prepare('UPDATE trips SET status = ?, final_fare = ?, tip_amount = ?, completed_at = datetime(\'now\') WHERE id = ?')
        .run('completed', finalFare, req.body.tip_amount || 0, trip.id);

      if (trip.payment_method === 'wallet') {
        const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(trip.passenger_id) as any;
        if (wallet && wallet.balance >= finalFare) {
          db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(wallet.balance - finalFare, wallet.id);
          db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(wallet.id, 'ride_payment', finalFare, wallet.balance - finalFare, 'trip', trip.id, 'Ride payment');
        }
      }

      const driverWallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
      if (driverWallet) {
        const earning = Math.floor(finalFare * 0.85);
        db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(driverWallet.balance + earning, driverWallet.id);
        db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(driverWallet.id, 'ride_earning', earning, driverWallet.balance + earning, 'trip', trip.id, 'Ride earning');
      }

      db.prepare('UPDATE driver_stats SET total_trips = total_trips + 1, completed_trips = completed_trips + 1, total_earnings = total_earnings + ? WHERE driver_id = ?')
        .run(Math.floor(finalFare * 0.85), req.user!.id);

      if (trip.tip_amount > 0) {
        accruePoints(req.user!.id, trip.tip_amount, 'trip', trip.id, 'Tip received');
        const tipStats = db.prepare('SELECT id FROM tip_stats WHERE driver_id = ?').get(req.user!.id) as any;
        if (tipStats) {
          db.prepare('UPDATE tip_stats SET total_tips = total_tips + ?, tip_count = tip_count + 1 WHERE driver_id = ?')
            .run(trip.tip_amount, req.user!.id);
        } else {
          db.prepare('INSERT INTO tip_stats (driver_id, total_tips, tip_count) VALUES (?, ?, 1)')
            .run(req.user!.id, trip.tip_amount);
        }
      }

      const missionProgress = db.prepare('SELECT id, completed_trips, mission_id FROM mission_progress mp JOIN missions m ON mp.mission_id = m.id WHERE mp.driver_id = ? AND m.active = 1 AND m.end_date > date(\'now\')')
        .all(req.user!.id) as any[];
      for (const mp of missionProgress) {
        db.prepare('UPDATE mission_progress SET completed_trips = completed_trips + 1 WHERE id = ?').run(mp.id);
      }

      autoRepayFromEarnings(req.user!.id, Math.floor(finalFare * 0.85));
    });

    tx();

    accruePoints(req.user!.id, finalFare, 'trip', trip.id, 'Trip completed');

    res.json({ message: 'Trip completed', final_fare: finalFare });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Complete trip error');
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/cancel', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND status IN (?, ?)').get(req.params.id, 'requested', 'accepted') as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found or cannot be cancelled' }); return; }

    if (trip.driver_id && trip.driver_id !== req.user!.id && trip.passenger_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized' }); return;
    }

    db.prepare('UPDATE trips SET status = ?, cancelled_by = ?, cancellation_reason = ? WHERE id = ?')
      .run('cancelled', req.user!.id, req.body.reason || '', trip.id);

    if (trip.driver_id) {
      db.prepare('UPDATE driver_stats SET cancelled_trips = cancelled_trips + 1 WHERE driver_id = ?').run(trip.driver_id);
    }

    res.json({ message: 'Trip cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/rate', auth, (req: Request, res: Response) => {
  try {
    const { rating, comment, tags } = req.body;
    if (!rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating 1-5 required' }); return; }

    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND status = ?').get(req.params.id, 'completed') as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    const revieweeId = trip.passenger_id === req.user!.id ? trip.driver_id : trip.passenger_id;
    if (!revieweeId) { res.status(400).json({ error: 'No reviewee' }); return; }

    const existing = db.prepare('SELECT id FROM reviews WHERE trip_id = ? AND reviewer_id = ?').get(trip.id, req.user!.id);
    if (existing) { res.status(409).json({ error: 'Already rated' }); return; }

    db.prepare('INSERT INTO reviews (trip_id, reviewer_id, reviewee_id, rating, comment, tags) VALUES (?, ?, ?, ?, ?, ?)')
      .run(trip.id, req.user!.id, revieweeId, rating, comment || '', JSON.stringify(tags || []));

    const stats = db.prepare('SELECT avg_rating, rating_count FROM driver_stats WHERE driver_id = ?').get(revieweeId) as any;
    if (stats) {
      const newCount = stats.rating_count + 1;
      const newAvg = ((stats.avg_rating * stats.rating_count) + rating) / newCount;
      db.prepare('UPDATE driver_stats SET avg_rating = ?, rating_count = ? WHERE driver_id = ?')
        .run(Math.round(newAvg * 100) / 100, newCount, revieweeId);
    }

    res.json({ message: 'Review submitted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:id', auth, (req: Request, res: Response) => {
  try {
    const trip = db.prepare(`SELECT t.*, p.name as passenger_name, p.phone as passenger_phone,
      d.name as driver_name, d.phone as driver_phone
      FROM trips t
      LEFT JOIN users p ON t.passenger_id = p.id
      LEFT JOIN users d ON t.driver_id = d.id
      WHERE t.id = ?`).get(req.params.id);
    if (!trip) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(trip);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/scheduled', auth, (req: Request, res: Response) => {
  try {
    const trips = db.prepare(`SELECT * FROM trips WHERE passenger_id = ? AND scheduled_at IS NOT NULL
      AND status = 'requested' ORDER BY scheduled_at ASC`).all(req.user!.id);
    res.json(trips);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/rebook', auth, (req: Request, res: Response) => {
  try {
    const orig = db.prepare('SELECT * FROM trips WHERE id = ? AND status = ?').get(req.params.id, 'completed') as any;
    if (!orig) { res.status(404).json({ error: 'Original trip not found' }); return; }

    const distanceKm = orig.distance_km || Math.random() * 10 + 1;
    const durationMin = Math.random() * 30 + 5;
    const baseFare = estimateFare(orig.vehicle_type, distanceKm, durationMin, orig.from_zone);

    const result = db.prepare(`INSERT INTO trips (passenger_id, vehicle_type, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng,
      from_zone, to_zone, base_fare, distance_km, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.user!.id, orig.vehicle_type, orig.origin, orig.destination,
        orig.origin_lat, orig.origin_lng, orig.dest_lat, orig.dest_lng,
        orig.from_zone, orig.to_zone, baseFare, distanceKm, orig.payment_method);

    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(Number(result.lastInsertRowid));
    res.json(trip);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/my-stats', auth, (req: Request, res: Response) => {
  try {
    const stats = db.prepare(`SELECT
      COUNT(*) as total_trips,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN final_fare ELSE 0 END), 0) as total_spent,
      COALESCE(AVG(CASE WHEN status = 'completed' THEN final_fare END), 0) as avg_fare
      FROM trips WHERE passenger_id = ?`).get(req.user!.id);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
