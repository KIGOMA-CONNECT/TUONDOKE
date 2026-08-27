import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Tabs, Stat, Badge, Spinner, Error, Empty } from '../ui';

export default function Driver() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('earnings');
  const [stats, setStats] = useState<any>({});
  const [earnings, setEarnings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');

  const loadStats = async () => {
    if (!token) return;
    const r = await api('GET', '/driver/stats', undefined, token);
    if (r.status === 200) setStats(r.json);
  };

  const loadEarnings = async () => {
    if (!token) return;
    const r = await api('GET', '/driver/earnings', undefined, token);
    if (r.status === 200) setEarnings(r.json.earnings || r.json || []);
  };

  const loadTrips = async () => {
    if (!token) return;
    const r = await api('GET', '/driver/trips', undefined, token);
    if (r.status === 200) setTrips(r.json.trips || r.json || []);
  };

  const loadExpenses = async () => {
    if (!token) return;
    const r = await api('GET', '/driver/expenses', undefined, token);
    if (r.status === 200) setExpenses(r.json.expenses || r.json || []);
  };

  useEffect(() => { loadStats(); loadEarnings(); }, [token]);
  useEffect(() => { if (tab === 'trips') loadTrips(); if (tab === 'expenses') loadExpenses(); }, [tab, token]);

  const toggleOnline = async () => {
    setLoading(true);
    const r = await api('POST', '/driver/online', { online: !online }, token!);
    if (r.status === 200) setOnline(!online);
    setLoading(false);
  };

  const addExpense = async () => {
    if (!expDesc || !expAmt) { setError('Jaza sehemu zote'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/driver/expenses', { description: expDesc, amount: parseFloat(expAmt) }, token!);
    if (r.status === 200 || r.status === 201) { setExpDesc(''); setExpAmt(''); loadExpenses(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>🚗 Dereva</h2>
        <Btn onClick={toggleOnline} loading={loading} color={online ? '#f44336' : '#00E676'} style={{ width: 'auto', padding: '8px 16px' }}>
          {online ? 'Nje ya Mtandao' : 'Mtandaoni'}
        </Btn>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Stat label="Mapato" value={`TZS ${fmt(stats.total_earnings || 0)}`} color="#00E676" />
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Stat label="Safari" value={stats.total_trips || 0} />
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Stat label="Ukadiriaji" value={stats.rating || '—'} color="#ffc107" />
        </Card>
      </div>

      <Tabs
        tabs={[
          { key: 'earnings', label: 'Mapato' },
          { key: 'trips', label: 'Safari' },
          { key: 'expenses', label: 'Gharama' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'earnings' && (
        <div>
          {earnings.length === 0 && <Empty message="Hakuna mapato bado" />}
          {earnings.map((e: any, i: number) => (
            <Card key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.description || 'Mapato ya safari'}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(e.created_at).toLocaleDateString('sw-TZ')}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#4caf50' }}>+TZS {fmt(e.amount)}</div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'trips' && (
        <div>
          {trips.length === 0 && <Empty message="Hakuna safari bado" />}
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

      {tab === 'expenses' && (
        <div>
          <Card style={{ marginBottom: 12 }}>
            {error && <Error message={error} />}
            <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Maelezo" style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, marginBottom: 8 }} />
            <input value={expAmt} onChange={e => setExpAmt(e.target.value)} type="number" placeholder="Kiasi (TZS)" style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, marginBottom: 8 }} />
            <Btn onClick={addExpense} loading={loading}>Ongeza Gharama</Btn>
          </Card>
          {expenses.map((e: any, i: number) => (
            <Card key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.description}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(e.created_at).toLocaleDateString('sw-TZ')}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f44336' }}>-TZS {fmt(e.amount)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
