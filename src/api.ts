const BASE = '/api';

export async function api(method: string, path: string, body?: any, token?: string): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const opts: RequestInit = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  let json: any;
  try { json = await res.json(); } catch { json = await res.text(); }
  return { status: res.status, json };
}

export function fmt(n: number): string { return new Intl.NumberFormat('sw-TZ').format(n); }
export function fmtDuration(s: number): string { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; }
export function dateStr(d: string): string { return new Date(d).toLocaleDateString('sw-TZ'); }
