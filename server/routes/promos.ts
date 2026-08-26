import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';

const router = Router();

router.post('/redeem', auth, (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: 'Code required' }); return; }

    const promo = db.prepare("SELECT * FROM promos WHERE code = ? AND active = 1").get(code.toUpperCase()) as any;
    if (!promo) { res.status(404).json({ error: 'Invalid promo code' }); return; }

    if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
      res.status(400).json({ error: 'Promo code exhausted' }); return;
    }

    if (promo.valid_from && new Date(promo.valid_from) > new Date()) {
      res.status(400).json({ error: 'Promo not yet valid' }); return;
    }
    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
      res.status(400).json({ error: 'Promo expired' }); return;
    }

    db.prepare('UPDATE promos SET used_count = used_count + 1 WHERE id = ?').run(promo.id);

    const discount = promo.discount_amount || (promo.discount_pct > 0 ? Math.floor(req.body.estimated_fare * promo.discount_pct / 100) : 0);
    res.json({ message: 'Promo applied', discount, discount_pct: promo.discount_pct, discount_amount: promo.discount_amount });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
