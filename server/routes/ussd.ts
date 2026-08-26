import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth, userRateLimit } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

function buildUssdMenu(session: string, input: string): string {
  const parts = input.split('*');
  const level = parts.length;

  if (input === '' || input === '*') {
    return `CON Welcome to TUONDOKE
1. Request Ride
2. Check Wallet
3. My Trips
4. Contact Support
0. Exit`;
  }

  if (level === 1) {
    switch (parts[0]) {
      case '1': return 'CON Enter pickup location:';
      case '2': return 'END Your wallet balance will be sent via SMS.';
      case '3': return 'END Your recent trips will be sent via SMS.';
      case '4': return 'END Contact support at support@tuondoke.com';
      case '0': return 'END Thank you for using TUONDOKE.';
      default: return 'END Invalid option.';
    }
  }

  if (level === 2 && parts[0] === '1') {
    return 'CON Enter destination:';
  }

  if (level === 3 && parts[0] === '1') {
    return `CON Select vehicle type:
1. Boda (Motorcycle)
2. Bajaji (Tuk-tuk)
3. Pickup
0. Back`;
  }

  if (level === 4 && parts[0] === '1') {
    return 'END Your ride request has been received. A driver will be assigned shortly.';
  }

  return 'END Thank you for using TUONDOKE.';
}

router.post('/', userRateLimit(20, 60000), (req: Request, res: Response) => {
  try {
    let sessionId: string;
    let phone: string;
    let input: string;
    let reset: boolean = false;

    // Support both simulator shape and provider shapes
    if (req.body.session !== undefined) {
      // Simulator shape
      sessionId = req.body.session;
      phone = req.body.phone;
      input = req.body.input || '';
      reset = req.body.reset || false;
    } else {
      // Provider shape (AT/Beem)
      sessionId = req.body.sessionId || req.body.session || '';
      phone = req.body.phoneNumber || req.body.phone || '';
      input = req.body.text || req.body.input || '';
    }

    // Validate service code if present
    const serviceCode = req.body.serviceCode;
    const allowedCodes = (process.env.USSD_SERVICE_CODES || '').split(',').map(s => s.trim()).filter(Boolean);
    if (serviceCode && allowedCodes.length && !allowedCodes.includes(serviceCode)) {
      res.status(403).send('END Invalid service code');
      return;
    }

    if (!sessionId || !phone) {
      res.status(400).send('END Invalid request');
      return;
    }

    if (reset) {
      input = '';
    }

    const response = buildUssdMenu(sessionId, input);
    res.setHeader('Content-Type', 'text/plain');
    res.send(response);
  } catch (err: any) {
    logger.error({ err: err.message }, 'USSD error');
    res.setHeader('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again.');
  }
});

export default router;
