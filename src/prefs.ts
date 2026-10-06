export const CURRENCIES = ['TZS', 'USD', 'KES'] as const;
export type Currency = (typeof CURRENCIES)[number];

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface ActivityEntry {
  action: string;
  details?: any;
  ts: number;
}

export function getJSON<T>(k: string, d: T): T {
  try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)) as T; } catch { return d; }
}

export function setJSON(k: string, v: any) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota or private mode */ }
}

export function readLocal<T>(k: string, d: T): T { return getJSON(k, d); }
export function writeLocal(k: string, v: any) { setJSON(k, v); }
export function removeLocal(k: string) { localStorage.removeItem(k); }

export function uid(prefix?: string) {
  const s = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  return prefix ? `${prefix}${s}` : s;
}

export function nextRun(timeStr: string, days?: number[], anchor?: Date | number): number {
  const now = anchor instanceof Date ? anchor : (typeof anchor === 'number' ? new Date(anchor) : new Date());
  const [h, m] = timeStr.split(':').map(x => +x || 0);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  const add = d <= now ? 1 : 0;
  if (days && days.length) {
    const base = new Date(d);
    base.setDate(base.getDate() + add);
    for (let i = 0; i < 14; i++) {
      const dd = new Date(base);
      dd.setDate(dd.getDate() + i);
      if (days.includes(dd.getDay())) return dd.getTime();
    }
    return base.getTime();
  }
  const res = new Date(d);
  res.setDate(res.getDate() + add);
  return res.getTime();
}

/** Next occurrence for a standing order given a frequency, time of day and anchor date. */
export function nextOccurrence(frequency: string, timeStr: string, anchor?: Date | number | string): Date {
  const base = anchor === undefined ? new Date()
    : (anchor instanceof Date ? anchor : new Date(anchor));
  const [h, m] = timeStr.split(':').map(x => +x || 0);
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
  if (frequency === 'daily') {
    if (d <= base) d.setDate(d.getDate() + 1);
    return d;
  }
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 1);
    if (d <= base) d.setDate(d.getDate() + 7);
    return d;
  }
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  if (next <= base) next.setMonth(next.getMonth() + 1);
  return next;
}

export function daysUntil(ts: number): number {
  const diff = ts - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function sqliteDate(d: Date = new Date()): string { return d.toISOString().slice(0, 10); }

export function randomCode(n = 6): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

export function saveTextFile(name: string, txt: string, mime = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: mime }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

const ACTIVITY_KEY = 'tk_activity';

export function logActivity(action: string, details?: any) {
  const a = getJSON<ActivityEntry[]>(ACTIVITY_KEY, []);
  a.unshift({ action, details, ts: Date.now() });
  if (a.length > 200) a.pop();
  setJSON(ACTIVITY_KEY, a);
}

export function getActivity(): ActivityEntry[] { return getJSON<ActivityEntry[]>(ACTIVITY_KEY, []); }
export function clearActivity() { setJSON(ACTIVITY_KEY, []); }

export function deviceInfo(): { ua: string; plat: string; lang: string } {
  return { ua: navigator.userAgent, plat: navigator.platform, lang: navigator.language };
}
