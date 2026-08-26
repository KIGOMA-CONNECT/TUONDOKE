import crypto from 'crypto';
import db from '../db.js';

export function createKey(userId: number, resource: string, action: string): string {
  const key = crypto.randomUUID();
  const expires = Date.now() + 300000; // 5 minutes
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))')
    .run(`idempotency:${key}`, JSON.stringify({ userId, resource, action, expires }));
  return key;
}

export function checkKey(key: string): { valid: boolean; data?: any } {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(`idempotency:${key}`) as any;
  if (!row) return { valid: false };
  const data = JSON.parse(row.value);
  if (Date.now() > data.expires) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(`idempotency:${key}`);
    return { valid: false };
  }
  return { valid: true, data };
}

export function consumeKey(key: string): void {
  db.prepare('DELETE FROM settings WHERE key = ?').run(`idempotency:${key}`);
}
