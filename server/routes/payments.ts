import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { auth } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

router.post('/mpesa/stkpush', auth, (req: Request, res: Response) => {
  try {
    const { phone, amount } = req.body;
    if (!phone || !amount || amount <= 0) { res.status(400).json({ error: 'Phone and amount required' }); return; }

    const checkoutRequestId = 'ws_CO_' + crypto.randomInt(100000000, 999999999).toString();
    logger.info({ phone, amount, checkoutRequestId }, 'M-Pesa STK push initiated');

    // In production, call Safaricom API
    res.json({
      message: 'STK push sent',
      checkout_request_id: checkoutRequestId,
      merchant_request_id: 'MR_' + crypto.randomInt(100000, 999999).toString()
    });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/mpesa/status', auth, (req: Request, res: Response) => {
  try {
    const { checkout_request_id } = req.query;
    if (!checkout_request_id) { res.status(400).json({ error: 'Checkout request ID required' }); return; }

    // In production, query Safaricom API
    res.json({ status: 'pending', checkout_request_id });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/methods', (req: Request, res: Response) => {
  try {
    res.json([
      { id: 'cash', name: 'Cash', enabled: true },
      { id: 'wallet', name: 'Wallet', enabled: true },
      { id: 'mpesa', name: 'M-Pesa', enabled: true },
      { id: 'commute_plan', name: 'Commute Plan', enabled: true }
    ]);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
