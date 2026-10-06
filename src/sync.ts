import { api } from './api';
import { getJSON, setJSON } from './prefs';

export interface SyncState<T> {
  data: T;
  pending: boolean;
  fromCache: boolean;
}

const CACHE_PREFIX = 'tk_sync_';

function cacheKey(key: string) { return CACHE_PREFIX + key; }

/** Read-through cache: localStorage first (instant paint), API second. */
export async function synced<T>(key: string, path: string, fallback: T, token: string): Promise<SyncState<T>> {
  const cached = getJSON<{ data: T; pending: boolean } | null>(cacheKey(key), null);
  if (cached && cached.pending) return { data: cached.data, pending: true, fromCache: true };
  try {
    const r = await api('GET', path, undefined, token);
    if (r.status === 200) {
      setJSON(cacheKey(key), { data: r.json, pending: false });
      return { data: r.json as T, pending: false, fromCache: false };
    }
  } catch { /* offline — fall through to cache */ }
  if (cached) return { data: cached.data, pending: cached.pending, fromCache: true };
  return { data: fallback, pending: false, fromCache: false };
}

/** Write-through: optimistic local update, then API. Marks pending if the API call fails. */
export async function mutate<T>(key: string, path: string, method: string, body: any, fallback: T, token: string): Promise<SyncState<T>> {
  const next = (typeof fallback === 'object' && fallback !== null && !(fallback instanceof Date))
    ? { ...(fallback as any), ...(body || {}) }
    : fallback;
  setJSON(cacheKey(key), { data: next, pending: true });

  try {
    const r = await api(method, path, body, token);
    if (r.status >= 200 && r.status < 300) {
      const data = r.json && typeof r.json === 'object' ? r.json : next;
      setJSON(cacheKey(key), { data, pending: false });
      return { data: data as T, pending: false, fromCache: false };
    }
    return { data: next, pending: true, fromCache: true };
  } catch {
    return { data: next, pending: true, fromCache: true };
  }
}

export function cached<T>(key: string, fallback: T): T {
  const entry = getJSON<{ data: T } | null>(cacheKey(key), null);
  return entry ? entry.data : fallback;
}

export function clearSyncCache(prefix?: string) {
  if (typeof localStorage === 'undefined') return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX) && (!prefix || k.includes(prefix)));
  keys.forEach(k => localStorage.removeItem(k));
}

export interface RecurringRule {
  id: number;
  origin: string;
  destination: string;
  vehicle_type: string;
  time: string;
  days: number[];
  interval: 'daily' | 'weekly' | 'monthly';
  active: boolean;
  last_run: string | null;
  created_at: string;
}

export const recurringApi = {
  list: (token: string) => synced<RecurringRule[]>('recurring', '/rides/recurring', [], token),
  create: (token: string, body: any) => mutate('recurring', '/rides/recurring', 'POST', body, {}, token),
  update: (token: string, id: number, body: any) => mutate('recurring', `/rides/recurring/${id}`, 'PUT', body, {}, token),
  toggle: (token: string, id: number) => mutate('recurring', `/rides/recurring/${id}/toggle`, 'POST', {}, {}, token),
  remove: (token: string, id: number) => mutate('recurring', `/rides/recurring/${id}`, 'DELETE', {}, {}, token),
};

export const budgetApi = {
  get: (token: string) => synced<{ monthly_limit: number }>('budget', '/budget', { monthly_limit: 0 }, token),
  set: (token: string, monthly_limit: number) => mutate('budget', '/budget', 'POST', { monthly_limit }, {}, token),
  reset: (token: string) => mutate('budget', '/budget', 'DELETE', {}, {}, token),
};

export interface StandingOrder {
  id: number;
  recipient_phone: string;
  amount: number;
  frequency: string;
  start_date: string;
  status: 'active' | 'suspended' | 'cancelled';
  last_run: string | null;
  created_at: string;
}

export const standingOrderApi = {
  list: (token: string) => synced<StandingOrder[]>('standing_orders', '/wallet/standing-orders', [], token),
  create: (token: string, body: any) => mutate('standing_orders', '/wallet/standing-orders', 'POST', body, {}, token),
  update: (token: string, id: number, body: any) => mutate('standing_orders', `/wallet/standing-orders/${id}`, 'PUT', body, {}, token),
  suspend: (token: string, id: number) => mutate('standing_orders', `/wallet/standing-orders/${id}/suspend`, 'POST', {}, {}, token),
  activate: (token: string, id: number) => mutate('standing_orders', `/wallet/standing-orders/${id}/activate`, 'POST', {}, {}, token),
  remove: (token: string, id: number) => mutate('standing_orders', `/wallet/standing-orders/${id}`, 'DELETE', {}, {}, token),
};

export interface SavingsTx {
  id: number;
  kind: 'topup' | 'withdraw' | 'bonus';
  amount: number;
  balance_after: number;
  created_at: string;
}

export const savingsApi = {
  transactions: (token: string) => synced<{ balance: number; transactions: SavingsTx[] }>('savings', '/wallet/savings/transactions', { balance: 0, transactions: [] }, token),
  topup: (token: string, amount: number) => mutate('savings', '/wallet/savings/topup', 'POST', { amount }, {}, token),
  withdraw: (token: string, amount: number) => mutate('savings', '/wallet/savings/withdraw', 'POST', { amount }, {}, token),
};

export interface ActivityLogRow {
  id: number;
  action: string;
  details: string;
  created_at: string;
}

export const activityApi = {
  list: (token: string, limit = 50, offset = 0) =>
    synced<{ logs: ActivityLogRow[]; total: number }>(`activity_${limit}_${offset}`, `/activity-log?limit=${limit}&offset=${offset}`, { logs: [], total: 0 }, token),
  log: (token: string, action: string, details = '') => mutate('activity_pending', '/activity-log', 'POST', { action, details }, {}, token),
  clear: (token: string) => mutate('activity_pending', '/activity-log/clear', 'DELETE', {}, {}, token),
};

export const backupCodesApi = {
  list: (token: string) => synced<{ id: number; used: boolean; used_at: string | null; created_at: string }[]>('backup_codes', '/auth/2fa/backup-codes', [], token),
  generate: (token: string, count = 10) => mutate<{ codes: string[] }>('backup_codes', '/auth/2fa/backup-codes/generate', 'POST', { count }, { codes: [] }, token),
  verify: async (code: string, token: string) => {
    const r = await api('POST', '/auth/2fa/backup-codes/verify', { code }, token);
    return { valid: r.status === 200, status: r.status };
  },
};
