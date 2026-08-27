import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User { id: number; phone: string; name: string; role: string; email: string; verified: number; }
interface AuthCtx { user: User | null; token: string | null; login: (phone: string, password: string) => Promise<any>; logout: () => void; refresh: () => Promise<void>; loading: boolean; }

const Ctx = createContext<AuthCtx>({ user: null, token: null, login: async () => ({}), logout: () => {}, refresh: async () => {}, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!token) { setLoading(false); return; }
    try {
      const r = await api('GET', '/auth/me', undefined, token);
      if (r.status === 200) setUser(r.json);
      else { setUser(null); setToken(null); localStorage.removeItem('token'); }
    } catch { setUser(null); }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [token]);

  const login = async (phone: string, password: string) => {
    const r = await api('POST', '/auth/login', { phone, password });
    if (r.status === 200 && r.json.token) {
      setToken(r.json.token);
      localStorage.setItem('token', r.json.token);
      setUser(r.json.user);
    }
    return r;
  };

  const logout = () => { setUser(null); setToken(null); localStorage.removeItem('token'); };

  return <Ctx.Provider value={{ user, token, login, logout, refresh, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
