import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.get('/', auth, (req: Request, res: Response) => {
  try {
    const missions = db.prepare(`SELECT m.*,
      COALESCE((SELECT completed_trips FROM mission_progress WHERE driver_id = ? AND mission_id = m.id), 0) as my_progress,
      COALESCE((SELECT claimed FROM mission_progress WHERE driver_id = ? AND mission_id = m.id), 0) as my_claimed
      FROM missions m WHERE m.active = 1 AND (m.end_date IS NULL OR m.end_date >= date('now'))
      ORDER BY m.created_at DESC`).all(req.user!.id, req.user!.id);
    res.json(missions);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/:id/claim', auth, (req: Request, res: Response) => {
  try {
    const mission = db.prepare("SELECT * FROM missions WHERE id = ? AND active = 1").get(req.params.id) as any;
    if (!mission) { res.status(404).json({ error: 'Mission not found' }); return; }

    let progress = db.prepare('SELECT * FROM mission_progress WHERE driver_id = ? AND mission_id = ?')
      .get(req.user!.id, req.params.id) as any;

    if (!progress) {
      db.prepare('INSERT INTO mission_progress (driver_id, mission_id, completed_trips) VALUES (?, ?, 0)').run(req.user!.id, req.params.id);
      progress = db.prepare('SELECT * FROM mission_progress WHERE driver_id = ? AND mission_id = ?')
        .get(req.user!.id, req.params.id) as any;
    }

    if (progress.claimed) { res.status(400).json({ error: 'Already claimed' }); return; }
    if (progress.completed_trips < mission.target_trips) {
      res.status(400).json({ error: 'Target not met', progress: progress.completed_trips, target: mission.target_trips });
      return;
    }

    db.prepare('UPDATE mission_progress SET claimed = 1 WHERE id = ?').run(progress.id);

    const wallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;
    if (wallet && mission.reward_amount > 0) {
      const newBal = wallet.balance + mission.reward_amount;
      db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, wallet.id);
      db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(wallet.id, 'mission_reward', mission.reward_amount, newBal, 'mission', mission.id, `Mission reward: ${mission.title}`);
    }

    res.json({ message: 'Claimed', reward: mission.reward_amount });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
