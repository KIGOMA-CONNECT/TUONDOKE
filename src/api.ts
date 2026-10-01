const BASE = '/api';

interface ApiError {
  status: number;
  errors: { field: string; message: string }[];
}

let isRefreshing = false;
let refreshQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

function getAccessToken(): string | null { return localStorage.getItem('token'); }
function getRefreshToken(): string | null { return localStorage.getItem('refreshToken'); }

function setTokens(access: string, refresh?: string) {
  localStorage.setItem('token', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
}

function clearTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
}

async function tryRefresh(): Promise<string> {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  const res = await fetch(BASE + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  setTokens(data.token, data.refreshToken);
  return data.token;
}

async function handle401(opts: RequestInit, path: string): Promise<Response> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({
        resolve: async (newToken: string) => {
          const h = new Headers(opts.headers);
          h.set('Authorization', `Bearer ${newToken}`);
          resolve(await fetch(BASE + path, { ...opts, headers: h }));
        },
        reject,
      });
    });
  }

  isRefreshing = true;
  try {
    const newToken = await tryRefresh();
    refreshQueue.forEach(r => r.resolve(newToken));
    refreshQueue = [];
    const h = new Headers(opts.headers);
    h.set('Authorization', `Bearer ${newToken}`);
    return await fetch(BASE + path, { ...opts, headers: h });
  } catch (e) {
    refreshQueue.forEach(r => r.reject(e));
    refreshQueue = [];
    clearTokens();
    if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
      location.href = '/login';
    }
    throw e;
  } finally {
    isRefreshing = false;
  }
}

export async function api(method: string, path: string, body?: any, token?: string): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = token || getAccessToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const opts: RequestInit = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  let res = await fetch(BASE + path, opts);

  if (res.status === 401 && !path.startsWith('/auth/') && getRefreshToken()) {
    try {
      res = await handle401(opts, path);
    } catch {
      return { status: 401, json: { error: 'Session expired' } };
    }
  }

  let json: any;
  try { json = await res.json(); } catch { json = await res.text(); }

  if (!res.ok && json && typeof json === 'object' && Array.isArray(json.errors)) {
    const err: ApiError = { status: res.status, errors: json.errors };
    throw err;
  }

  return { status: res.status, json };
}

export async function download(path: string, filename?: string) {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let res = await fetch(BASE + path, { headers });
  if (res.status === 401 && getRefreshToken()) {
    try { res = await handle401({ headers }, path); } catch { return; }
  }
  if (!res.ok) return;
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition');
  const name = filename || (cd ? cd.split('filename=')[1]?.replace(/"/g, '') : 'download') || 'download';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getRefreshToken() && !isRefreshing) {
      tryRefresh().catch(() => {});
    }
  });
}

export function fmt(n: number): string { return new Intl.NumberFormat('sw-TZ').format(n); }
export function fmtDuration(s: number): string { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; }
export function dateStr(d: string): string { return new Date(d).toLocaleDateString('sw-TZ'); }
