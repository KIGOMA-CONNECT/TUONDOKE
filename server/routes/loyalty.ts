import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';
import { accruePoints, redeemPoints } from '../services/loyalty.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const lp = db.prepare('SELECT * FROM loyalty_points WHERE user_id = ?').get(req.user!.id) as any || { points: 0, lifetime_earned: 0, lifetime_redeemed: 0 };
    const history = db.prepare('SELECT * FROM loyalty_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user!.id);
    res.json({ points: lp.points, lifetime_earned: lp.lifetime_earned, lifetime_redeemed: lp.lifetime_redeemed, history });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/redeem', auth, (req: Request, res: Response) => {
  try {
    const { points, mode } = req.body;
    if (!points || points <= 0) { res.status(400).json({ error: 'Points required' }); return; }

    const result = redeemPoints(req.user!.id, points, mode || 'cash', `Redeem ${points} points as ${mode || 'cash'}`);
    if (!result.success) { res.status(400).json({ error: result.error }); return; }

    res.json({ message: 'Redeemed', points, mode });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
