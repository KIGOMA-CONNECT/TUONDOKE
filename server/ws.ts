import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware.js';
import db from './db.js';
import logger from './logger.js';

interface WsClient {
  ws: WebSocket;
  userId: number;
  role: string;
  isDriver: boolean;
}

const clients = new Map<number, WsClient[]>();
const driverLocations = new Map<number, { lat: number; lng: number; timestamp: number }>();

export function broadcastToUser(userId: number, event: string, data: any): void {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  for (const c of userClients) {
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
  }
}

export function broadcastToDrivers(event: string, data: any): void {
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  for (const [, userClients] of clients) {
    for (const c of userClients) {
      if (c.isDriver && c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
    }
  }
}

export function broadcastAll(event: string, data: any): void {
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  for (const [, userClients] of clients) {
    for (const c of userClients) {
      if (c.ws.readyState === WebSocket.OPEN) c.ws.send(msg);
    }
  }
}

export function getOnlineDriverCount(): number {
  const driverIds = new Set<number>();
  for (const [userId, userClients] of clients) {
    for (const c of userClients) {
      if (c.isDriver) driverIds.add(userId);
    }
  }
  return driverIds.size;
}

export function getDriverLocation(driverId: number): { lat: number; lng: number } | null {
  return driverLocations.get(driverId) || null;
}

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    let userId = 0;
    let role = 'passenger';
    let isDriver = false;

    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET) as any;
        userId = payload.userId;
        role = payload.role;
        isDriver = role === 'driver';
      }
    } catch { /* unauthenticated connection */ }

    const client: WsClient = { ws, userId, role, isDriver };

    if (userId) {
      if (!clients.has(userId)) clients.set(userId, []);
      clients.get(userId)!.push(client);
    }

    logger.info({ userId, isDriver }, 'WS connected');

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.event === 'location' && isDriver && userId) {
          const { lat, lng } = msg.data || {};
          if (typeof lat === 'number' && typeof lng === 'number') {
            driverLocations.set(userId, { lat, lng, timestamp: Date.now() });
            broadcastAll('driver_location', { driverId: userId, lat, lng });
          }
        }

        if (msg.event === 'trip_update') {
          const { tripId, status } = msg.data || {};
          if (tripId) {
            broadcastAll('trip_update', { tripId, status, driverId: userId });
          }
        }

        if (msg.event === 'chat') {
          const { tripId, message } = msg.data || {};
          if (tripId && message && userId) {
            db.prepare('INSERT INTO chats (trip_id, sender_id, message) VALUES (?, ?, ?)')
              .run(tripId, userId, message);
            const trip = db.prepare('SELECT passenger_id, driver_id FROM trips WHERE id = ?').get(tripId) as any;
            if (trip) {
              const recipientId = trip.passenger_id === userId ? trip.driver_id : trip.passenger_id;
              if (recipientId) broadcastToUser(recipientId, 'chat', { tripId, senderId: userId, message });
            }
          }
        }

        if (msg.event === 'typing') {
          const { tripId } = msg.data || {};
          if (tripId && userId) {
            const trip = db.prepare('SELECT passenger_id, driver_id FROM trips WHERE id = ?').get(tripId) as any;
            if (trip) {
              const recipientId = trip.passenger_id === userId ? trip.driver_id : trip.passenger_id;
              if (recipientId) broadcastToUser(recipientId, 'typing', { tripId, userId });
            }
          }
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'WS message error');
      }
    });

    ws.on('close', () => {
      if (userId) {
        const userClients = clients.get(userId);
        if (userClients) {
          const idx = userClients.indexOf(client);
          if (idx !== -1) userClients.splice(idx, 1);
          if (userClients.length === 0) clients.delete(userId);
        }
      }
      logger.info({ userId }, 'WS disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err: err.message }, 'WS error');
    });

    // Send welcome
    ws.send(JSON.stringify({ event: 'connected', data: { userId, online: getOnlineDriverCount() } }));
  });

  // Periodic cleanup of stale driver locations
  setInterval(() => {
    const now = Date.now();
    for (const [driverId, loc] of driverLocations) {
      if (now - loc.timestamp > 120000) driverLocations.delete(driverId);
    }
  }, 60000);

  logger.info('WebSocket server initialized');
}

export function getOnlineDrivers(): { driverId: number; lat: number; lng: number }[] {
  const result: { driverId: number; lat: number; lng: number }[] = [];
  for (const [driverId, loc] of driverLocations) {
    if (Date.now() - loc.timestamp < 120000) {
      result.push({ driverId, lat: loc.lat, lng: loc.lng });
    }
  }
  return result;
}
