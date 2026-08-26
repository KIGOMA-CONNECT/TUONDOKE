import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(req.user!.id) as any;
    const referred = db.prepare(`SELECT r.*, u.name as referred_name, u.created_at as joined_at
      FROM referrals r JOIN users u ON r.referred_id = u.id WHERE r.referrer_id = ?`).all(req.user!.id);
    const totalBonus = db.prepare('SELECT COALESCE(SUM(bonus_paid), 0) as total FROM referrals WHERE referrer_id = ?').get(req.user!.id) as any;

    res.json({ referral_code: user?.referral_code, referred_count: referred.length, total_bonus: totalBonus.total, referred });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/history', auth, (req: Request, res: Response) => {
  try {
    const history = db.prepare(`SELECT r.*, u.name as referred_name, u.phone as referred_phone
      FROM referrals r JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ? ORDER BY r.created_at DESC`).all(req.user!.id);
    res.json(history);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
