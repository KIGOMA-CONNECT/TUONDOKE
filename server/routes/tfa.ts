import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import db from '../db.js';
import { auth } from '../middleware.js';
import * as totp from '../services/totp.js';

const router = Router();

router.get('/status', auth, (req: Request, res: Response) => {
  try {
    const enabled = totp.isEnabled(req.user!.id);
    res.json({ enabled });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/enable', auth, (req: Request, res: Response) => {
  try {
    const { secret, otpauthUrl } = totp.getSecret(req.user!.id);
    QRCode.toDataURL(otpauthUrl).then(qr => {
      res.json({ secret, qr, message: 'Scan QR and confirm with /tfa/confirm' });
    }).catch(() => {
      res.json({ secret, otpauthUrl });
    });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/confirm', auth, (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: 'Token required' }); return; }

    const enabled = totp.enable(req.user!.id, token);
    if (!enabled) { res.status(400).json({ error: 'Invalid token' }); return; }
    res.json({ message: '2FA enabled' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/disable', auth, (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) { res.status(400).json({ error: 'Token required' }); return; }

    const disabled = totp.disable(req.user!.id, token);
    if (!disabled) { res.status(400).json({ error: 'Invalid token' }); return; }
    res.json({ message: '2FA disabled' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
