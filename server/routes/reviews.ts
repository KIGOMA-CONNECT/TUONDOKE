import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/', auth, (req: Request, res: Response) => {
  try {
    const { trip_id, rating, comment, tags } = req.body;
    if (!trip_id || !rating || rating < 1 || rating > 5) { res.status(400).json({ error: 'Trip and rating 1-5 required' }); return; }

    const trip = db.prepare('SELECT * FROM trips WHERE id = ? AND status = ?').get(trip_id, 'completed') as any;
    if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

    const revieweeId = trip.passenger_id === req.user!.id ? trip.driver_id : trip.passenger_id;
    if (!revieweeId) { res.status(400).json({ error: 'No one to review' }); return; }

    const existing = db.prepare('SELECT id FROM reviews WHERE trip_id = ? AND reviewer_id = ?').get(trip_id, req.user!.id);
    if (existing) { res.status(409).json({ error: 'Already reviewed' }); return; }

    db.prepare('INSERT INTO reviews (trip_id, reviewer_id, reviewee_id, rating, comment, tags) VALUES (?, ?, ?, ?, ?, ?)')
      .run(trip_id, req.user!.id, revieweeId, rating, comment || '', JSON.stringify(tags || []));

    const stats = db.prepare('SELECT avg_rating, rating_count FROM driver_stats WHERE driver_id = ?').get(revieweeId) as any;
    if (stats) {
      const newCount = stats.rating_count + 1;
      const newAvg = ((stats.avg_rating * stats.rating_count) + rating) / newCount;
      db.prepare('UPDATE driver_stats SET avg_rating = ?, rating_count = ? WHERE driver_id = ?')
        .run(Math.round(newAvg * 100) / 100, newCount, revieweeId);
    }

    res.json({ message: 'Review submitted' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/my', auth, (req: Request, res: Response) => {
  try {
    const reviews = db.prepare(`SELECT r.*, u.name as reviewee_name
      FROM reviews r JOIN users u ON r.reviewee_id = u.id
      WHERE r.reviewer_id = ? ORDER BY r.created_at DESC LIMIT 50`).all(req.user!.id);
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/received', auth, (req: Request, res: Response) => {
  try {
    const reviews = db.prepare(`SELECT r.*, u.name as reviewer_name
      FROM reviews r JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ? ORDER BY r.created_at DESC LIMIT 50`).all(req.user!.id);
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/user/:id', (req: Request, res: Response) => {
  try {
    const reviews = db.prepare(`SELECT r.*, u.name as reviewer_name
      FROM reviews r JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ? ORDER BY r.created_at DESC LIMIT 20`).all(req.params.id);
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/trip/:id', (req: Request, res: Response) => {
  try {
    const reviews = db.prepare(`SELECT r.*, u.name as reviewer_name
      FROM reviews r JOIN users u ON r.reviewer_id = u.id
      WHERE r.trip_id = ?`).all(req.params.id);
    res.json(reviews);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
