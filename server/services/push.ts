import db from '../db.js';
import crypto from 'crypto';

export function subscribePush(userId: number, endpoint: string, keys: string): { id: number } {
  const result = db.prepare('INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES (?, ?, ?)')
    .run(userId, endpoint, keys);
  return { id: Number(result.lastInsertRowid) };
}

export function getSubscriptions(userId: number): any[] {
  return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
}

export function unsubscribePush(id: number, userId: number): boolean {
  const result = db.prepare('DELETE FROM push_subscriptions WHERE id = ? AND user_id = ?').run(id, userId);
  return result.changes > 0;
}

export async function sendPushNotification(userId: number, title: string, body: string, data: any = {}): Promise<void> {
  const subs = getSubscriptions(userId);
  for (const sub of subs) {
    try {
      const payload = JSON.stringify({ title, body, data });
      // In production, use web-push library
      // await webpush.sendNotification({ endpoint: sub.endpoint, keys: JSON.parse(sub.keys) }, payload);
    } catch (err: any) {
      if (err.statusCode === 410) {
        unsubscribePush(sub.id, userId);
      }
    }
  }
}

export function broadcastPush(userIds: number[], title: string, body: string, data: any = {}): void {
  for (const uid of userIds) {
    sendPushNotification(uid, title, body, data).catch(() => {});
  }
}
