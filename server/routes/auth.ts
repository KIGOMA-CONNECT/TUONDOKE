import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { auth, signToken, signRefreshToken, verifyRefreshToken, generateOTP, genReferralCode, userRateLimit } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

function genOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

router.post('/register', userRateLimit(5, 60000), (req: Request, res: Response) => {
  try {
    const { phone, password, name, referral_code } = req.body;
    if (!phone || !password) { res.status(400).json({ error: 'Phone and password required' }); return; }
    if (password.length > 128) { res.status(400).json({ error: 'Password too long' }); return; }
    if (password.length < 4) { res.status(400).json({ error: 'Password too short' }); return; }

    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) { res.status(409).json({ error: 'Phone already registered' }); return; }

    const password_hash = bcrypt.hashSync(password, 12);
    const code = genReferralCode();

    let referredBy: number | null = null;
    if (referral_code) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code) as any;
      if (referrer) referredBy = referrer.id;
    }

    const result = db.prepare('INSERT INTO users (phone, name, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)')
      .run(phone, name || '', password_hash, code, referredBy);

    const userId = Number(result.lastInsertRowid);
    db.prepare('INSERT INTO wallets (user_id) VALUES (?)').run(userId);

    if (referredBy) {
      const referrerWallet = db.prepare('SELECT id, balance FROM wallets WHERE user_id = ?').get(referredBy) as any;
      if (referrerWallet) {
        const bonus = 100;
        const newBal = referrerWallet.balance + bonus;
        db.prepare('UPDATE wallets SET balance = ? WHERE id = ?').run(newBal, referrerWallet.id);
        db.prepare('INSERT INTO transactions (wallet_id, type, amount, balance_after, description) VALUES (?, ?, ?, ?, ?)')
          .run(referrerWallet.id, 'referral_bonus', bonus, newBal, 'Referral bonus');
        db.prepare('INSERT INTO referrals (referrer_id, referred_id, bonus_paid) VALUES (?, ?, ?)').run(referredBy, userId, bonus);
      }
    }

    logger.info({ userId, phone }, 'User registered');
    res.json({ id: userId, phone, name: name || '', referral_code: code });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Register error');
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/otp/request', userRateLimit(3, 60000), (req: Request, res: Response) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone) { res.status(400).json({ error: 'Phone required' }); return; }

    const code = genOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    db.prepare('INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES (?, ?, ?, ?)')
      .run(phone, code, purpose || 'login', expiresAt);

    if (process.env.NODE_ENV !== 'production') {
      res.json({ message: 'OTP sent', otp: code });
    } else {
      res.json({ message: 'OTP sent' });
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'OTP request error');
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/otp/verify', userRateLimit(5, 60000), (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) { res.status(400).json({ error: 'Phone and code required' }); return; }

    const otp = db.prepare('SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime(\'now\') ORDER BY id DESC LIMIT 1')
      .get(phone, code) as any;
    if (!otp) { res.status(400).json({ error: 'Invalid or expired OTP' }); return; }

    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id);

    const user = db.prepare('SELECT id, role, token_version FROM users WHERE phone = ?').get(phone) as any;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const token = signToken(user.id, user.role, user.token_version);
    const refreshToken = signRefreshToken(user.id, user.token_version);

    res.json({ token, refreshToken, user: { id: user.id, role: user.role } });
  } catch (err: any) {
    logger.error({ err: err.message }, 'OTP verify error');
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/login', userRateLimit(5, 60000), (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) { res.status(400).json({ error: 'Phone and password required' }); return; }

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
    if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user.id, user.role, user.token_version);
    const refreshToken = signRefreshToken(user.id, user.token_version);

    res.json({
      token, refreshToken,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, verified: user.verified }
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: 'Refresh token required' }); return; }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) { res.status(401).json({ error: 'Invalid refresh token' }); return; }

    const user = db.prepare('SELECT id, role, token_version FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user || user.token_version !== payload.tokenVersion) {
      res.status(401).json({ error: 'Token revoked' });
      return;
    }

    const token = signToken(user.id, user.role, user.token_version);
    const newRefreshToken = signRefreshToken(user.id, user.token_version);

    res.json({ token, refreshToken: newRefreshToken });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Refresh error');
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

router.post('/logout', auth, (req: Request, res: Response) => {
  try {
    db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user!.id);
    res.json({ message: 'Logged out' });
  } catch (err: any) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/me', auth, (req: Request, res: Response) => {
  try {
    const user = db.prepare('SELECT id, phone, name, email, role, verified, kyc_status, avatar_url, referral_code, created_at FROM users WHERE id = ?')
      .get(req.user!.id) as any;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.post('/forgot-password', userRateLimit(3, 60000), (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) { res.status(400).json({ error: 'Phone required' }); return; }

    const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (!user) { res.json({ message: 'If account exists, OTP sent' }); return; }

    const code = genOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    db.prepare('INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES (?, ?, ?, ?)')
      .run(phone, code, 'password_reset', expiresAt);

    if (process.env.NODE_ENV !== 'production') {
      res.json({ message: 'OTP sent', otp: code });
    } else {
      res.json({ message: 'If account exists, OTP sent' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/reset-password', userRateLimit(3, 60000), (req: Request, res: Response) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) { res.status(400).json({ error: 'All fields required' }); return; }
    if (newPassword.length > 128) { res.status(400).json({ error: 'Password too long' }); return; }

    const otp = db.prepare('SELECT id FROM otp_codes WHERE phone = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > datetime(\'now\')')
      .get(phone, code, 'password_reset') as any;
    if (!otp) { res.status(400).json({ error: 'Invalid OTP' }); return; }

    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id);
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE phone = ?').run(hash, phone);
    db.prepare('UPDATE users SET token_version = token_version + 1 WHERE phone = ?').run(phone);

    res.json({ message: 'Password reset' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/change-password', auth, (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) { res.status(400).json({ error: 'Both passwords required' }); return; }
    if (newPassword.length > 128) { res.status(400).json({ error: 'Password too long' }); return; }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
      res.status(401).json({ error: 'Wrong current password' });
      return;
    }

    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = datetime(\'now\') WHERE id = ?')
      .run(hash, req.user!.id);

    res.json({ message: 'Password changed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
