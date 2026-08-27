import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Tabs, Stat, Badge, Input, Spinner, Error, Empty } from '../ui';

export default function Admin() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [metrics, setMetrics] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadDashboard = async () => {
    if (!token) return;
    const r = await api('GET', '/admin/dashboard', undefined, token);
    if (r.status === 200) setMetrics(r.json);
  };

  const loadUsers = async () => {
    if (!token) return;
    const r = await api('GET', `/admin/users${search ? '?search=' + search : ''}`, undefined, token);
    if (r.status === 200) setUsers(r.json.users || r.json || []);
  };

  const loadTrips = async () => {
    if (!token) return;
    const r = await api('GET', '/admin/trips', undefined, token);
    if (r.status === 200) setTrips(r.json.trips || r.json || []);
  };

  useEffect(() => { loadDashboard(); }, [token]);
  useEffect(() => { if (tab === 'users') loadUsers(); if (tab === 'trips') loadTrips(); }, [tab, token, search]);

  const banUser = async (id: number) => {
    const r = await api('POST', `/admin/users/${id}/ban`, {}, token!);
    if (r.status === 200) loadUsers();
  };

  const verifyUser = async (id: number) => {
    const r = await api('POST', `/admin/users/${id}/verify`, {}, token!);
    if (r.status === 200) loadUsers();
  };

  if (user?.role !== 'admin') return <div style={{ padding: 20 }}><Error message="Huna ruhusa ya kufikia ukurasa huu" /></div>;

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>⚙️ Admin</h2>
      <Tabs
        tabs={[{ key: 'dashboard', label: 'Dashibodi' }, { key: 'users', label: 'Watumiaji' }, { key: 'trips', label: 'Safari' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <Card><Stat label="Watumiaji" value={metrics.total_users || 0} color="#00E676" /></Card>
          <Card><Stat label="Safari" value={metrics.total_trips || 0} color="#2196f3" /></Card>
          <Card><Stat label="Mapato" value={`TZS ${fmt(metrics.total_revenue || 0)}`} color="#4caf50" /></Card>
          <Card><Stat label="Dereva Mtandaoni" value={metrics.online_drivers || 0} color="#ff9800" /></Card>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <Input label="" value={search} onChange={setSearch} placeholder="Tafuta kwa jina au simu..." />
          {users.length === 0 && <Empty message="Hakuna watumiaji" />}
          {users.map((u: any) => (
            <Card key={u.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{u.phone}</div>
                <Badge>{u.role}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!u.verified && <Btn onClick={() => verifyUser(u.id)} style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>Thibitisha</Btn>}
                <Btn onClick={() => banUser(u.id)} color="#f44336" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>Piga Marufuku</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'trips' && (
        <div>
          {trips.length === 0 && <Empty message="Hakuna safari" />}
          {trips.map((t: any) => (
            <Card key={t.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.origin} → {t.destination}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{new Date(t.created_at).toLocaleDateString('sw-TZ')}</div>
                </div>
                <Badge color={t.status === 'completed' ? '#4caf50' : '#ff9800'}>{t.status}</Badge>
              </div>
              {t.fare && <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>TZS {fmt(t.fare)}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
