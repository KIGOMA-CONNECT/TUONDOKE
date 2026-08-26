import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import db from '../db.js';

export function getSecret(userId: number): { secret: string; otpauthUrl: string } {
  const existing = db.prepare('SELECT secret FROM tfa_settings WHERE user_id = ? AND enabled = 1').get(userId) as any;
  if (existing && existing.secret) {
    const otpauth = speakeasy.otpauthURL({ secret: existing.secret, name: `TUONDOKE:${userId}`, issuer: 'TUONDOKE' });
    return { secret: existing.secret, otpauthUrl: otpauth };
  }
  const secret = speakeasy.generateSecret({ name: `TUONDOKE:${userId}`, issuer: 'TUONDOKE' });
  db.prepare('INSERT OR REPLACE INTO tfa_settings (user_id, enabled, secret) VALUES (?, 0, ?)').run(userId, secret.base32);
  return { secret: secret.base32, otpauthUrl: secret.otpauth_url! };
}

export function verify(userId: number, token: string): boolean {
  const row = db.prepare('SELECT secret FROM tfa_settings WHERE user_id = ? AND enabled = 1').get(userId) as any;
  if (!row) return false;
  return speakeasy.totp.verify({ secret: row.secret, encoding: 'base32', token, window: 1 });
}

export function enable(userId: number, token: string): boolean {
  const row = db.prepare('SELECT secret FROM tfa_settings WHERE user_id = ? AND enabled = 0').get(userId) as any;
  if (!row) return false;
  const valid = speakeasy.totp.verify({ secret: row.secret, encoding: 'base32', token, window: 1 });
  if (!valid) return false;
  db.prepare('UPDATE tfa_settings SET enabled = 1 WHERE user_id = ?').run(userId);
  return true;
}

export function disable(userId: number, token: string): boolean {
  const row = db.prepare('SELECT secret FROM tfa_settings WHERE user_id = ? AND enabled = 1').get(userId) as any;
  if (!row) return false;
  const valid = speakeasy.totp.verify({ secret: row.secret, encoding: 'base32', token, window: 1 });
  if (!valid) return false;
  db.prepare('DELETE FROM tfa_settings WHERE user_id = ?').run(userId);
  return true;
}

export function isEnabled(userId: number): boolean {
  const row = db.prepare('SELECT enabled FROM tfa_settings WHERE user_id = ?').get(userId) as any;
  return row?.enabled === 1;
}

export async function generateQR(userId: number): Promise<string> {
  const { otpauthUrl } = getSecret(userId);
  return QRCode.toDataURL(otpauthUrl);
}
