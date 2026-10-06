import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const JWT_SECRET = process.env.NIKONEKTI_SECRET || 'tuondoke-dev-secret-change-me';

export interface JwtPayload {
  userId: number;
  role: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string; tokenVersion: number };
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
    req.user = { id: payload.userId, role: payload.role, tokenVersion: payload.tokenVersion };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function authOptional(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET) as JwtPayload;
      req.user = { id: payload.userId, role: payload.role, tokenVersion: payload.tokenVersion };
    } catch { /* ignore */ }
  }
  next();
}

export function authDownload(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const tokenParam = req.query.token as string | undefined;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : tokenParam;
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { id: payload.userId, role: payload.role, tokenVersion: payload.tokenVersion };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  next();
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  driver: ['rides:read', 'rides:update', 'wallet:read', 'wallet:deposit', 'driver:read', 'driver:update', 'reviews:read'],
  passenger: ['rides:read', 'rides:create', 'wallet:read', 'wallet:deposit', 'wallet:transfer', 'reviews:create', 'reviews:read']
};

export function perm(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Unauthenticated' }); return; }
    const perms = ROLE_PERMISSIONS[req.user.role] || [];
    if (perms.includes('*') || perms.includes(permission)) { next(); return; }
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function userRateLimit(limit = 100, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.id?.toString() || req.ip || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count++;
    if (entry.count > limit) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }
    next();
  };
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'] as string | undefined;
  const expected = process.env.API_KEY;
  if (!expected) { next(); return; }
  if (!key || key !== expected) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  next();
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export function circuitFetch(url: string, options: RequestInit = {}): { fetch: () => Promise<globalThis.Response>; reset: () => void; getState: () => CircuitState } {
  let state: CircuitState = 'CLOSED';
  let failures = 0;
  let lastFailure = 0;
  const threshold = 5;
  const resetTimeout = 30000;

  return {
    async fetch(): Promise<globalThis.Response> {
      if (state === 'OPEN') {
        if (Date.now() - lastFailure > resetTimeout) {
          state = 'HALF_OPEN';
        } else {
          throw new Error('Circuit is OPEN');
        }
      }
      try {
        const res = await globalThis.fetch(url, options);
        if (state === 'HALF_OPEN') { state = 'CLOSED'; failures = 0; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
      } catch (err) {
        failures++;
        lastFailure = Date.now();
        if (failures >= threshold) state = 'OPEN';
        throw err;
      }
    },
    reset() { state = 'CLOSED'; failures = 0; },
    getState() { return state; }
  };
}

export function genReferralCode(): string {
  return 'TK' + crypto.randomInt(100000, 999999).toString();
}

export function genWaybill(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomInt(1000, 9999).toString();
  return `TK-${ts}-${rand}`;
}

export function signToken(userId: number, role: string, tokenVersion: number): string {
  return jwt.sign({ userId, role, tokenVersion }, JWT_SECRET, { expiresIn: '30d' });
}

export function signRefreshToken(userId: number, tokenVersion: number): string {
  return jwt.sign({ userId, tokenVersion, type: 'refresh' }, JWT_SECRET, { expiresIn: '90d' });
}

export function verifyRefreshToken(token: string): { userId: number; tokenVersion: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.type !== 'refresh') return null;
    return { userId: payload.userId, tokenVersion: payload.tokenVersion };
  } catch {
    return null;
  }
}

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
