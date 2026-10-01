import { useCallback, useEffect, useRef, useState } from 'react';

type Handler = (data: any) => void;

class LiveClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private handlers = new Map<string, Set<Handler>>();
  private retryDelay = 1000;
  private maxRetry = 15000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private _status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private statusListeners = new Set<(s: string) => void>();

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  get status() { return this._status; }

  connect() {
    if (this.closed) return;
    this.setStatus('connecting');
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const host = this.url.replace(/^https?:\/\//, '').replace(/\/ws$/, '');
    const ws = new WebSocket(`${proto}://${host}/ws?token=${encodeURIComponent(this.token)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus('connected');
      this.retryDelay = 1000;
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const event = msg.event || msg.type;
        if (event && this.handlers.has(event)) {
          this.handlers.get(event)!.forEach(h => h(msg.data ?? msg));
        }
        this.handlers.get('*')?.forEach(h => h(msg));
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      this.setStatus('disconnected');
      if (!this.closed) this.scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetry);
  }

  private setStatus(s: 'connecting' | 'connected' | 'disconnected') {
    this._status = s;
    this.statusListeners.forEach(fn => fn(s));
  }

  onStatus(fn: (s: string) => void) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => { this.handlers.get(event)?.delete(handler); };
  }

  send(data: Record<string, any>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }

  reconnect() {
    this.closed = false;
    this.retryDelay = 1000;
    this.disconnect();
    this.closed = false;
    this.connect();
  }
}

let client: LiveClient | null = null;

export function getLiveClient(token: string): LiveClient {
  if (!client) {
    client = new LiveClient(location.origin, token);
  }
  return client;
}

export function useLiveStatus(): string {
  const [status, setStatus] = useState('disconnected');
  useEffect(() => {
    const c = getLiveClient(localStorage.getItem('token') || '');
    setStatus(c.status);
    return c.onStatus(setStatus);
  }, []);
  return status;
}

export function useLiveEvents(handler: Handler, event = '*') {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const c = getLiveClient(token);
    if (c.status === 'disconnected') c.connect();
    const unsub = c.on(event, (d) => handlerRef.current(d));
    return unsub;
  }, [event]);
}
