import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const leaderboard = db.prepare(`SELECT ds.driver_id, u.name, ds.completed_trips, ds.total_earnings, ds.avg_rating
      FROM driver_stats ds JOIN users u ON ds.driver_id = u.id
      WHERE ds.completed_trips > 0
      ORDER BY ds.completed_trips DESC LIMIT 20`).all();

    const myRank = db.prepare(`SELECT COUNT(*) + 1 as rank FROM driver_stats ds2
      WHERE ds2.completed_trips > (SELECT completed_trips FROM driver_stats WHERE driver_id = ?)`)
      .get(req.user!.id) as any;

    res.json({ leaderboard, my_rank: myRank?.rank || 0 });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/achievements', auth, (req: Request, res: Response) => {
  try {
    const stats = db.prepare('SELECT * FROM driver_stats WHERE driver_id = ?').get(req.user!.id) as any;
    const achievements: string[] = [];
    if (stats) {
      if (stats.completed_trips >= 1) achievements.push('First Trip');
      if (stats.completed_trips >= 10) achievements.push('10 Trips');
      if (stats.completed_trips >= 50) achievements.push('50 Trips');
      if (stats.completed_trips >= 100) achievements.push('Century Club');
      if (stats.avg_rating >= 4.5) achievements.push('Top Rated');
      if (stats.total_earnings >= 10000) achievements.push('10K Earner');
      if (stats.total_earnings >= 100000) achievements.push('100K Club');
    }
    res.json({ achievements, stats: stats || {} });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
