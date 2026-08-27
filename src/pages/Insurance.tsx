import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Tabs, Badge, Spinner, Empty } from '../ui';

export default function Insurance() {
  const { token } = useAuth();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState<any[]>([]);
  const [myCovers, setMyCovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPlans = async () => {
    if (!token) return;
    const r = await api('GET', '/insurance/plans', undefined, token);
    if (r.status === 200) setPlans(r.json.plans || r.json || []);
  };

  const loadMyCovers = async () => {
    if (!token) return;
    const r = await api('GET', '/insurance/my', undefined, token);
    if (r.status === 200) setMyCovers(r.json.covers || r.json || []);
  };

  useEffect(() => { loadPlans(); loadMyCovers(); }, [token]);

  const buyCover = async (planId: number) => {
    setLoading(true);
    const r = await api('POST', '/insurance/buy', { planId }, token!);
    if (r.status === 200 || r.status === 201) loadMyCovers();
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🛡️ Bima</h2>
      <Tabs
        tabs={[{ key: 'plans', label: 'Mpango' }, { key: 'my', label: 'Bima Yangu' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'plans' && (
        <div>
          {plans.length === 0 && <Empty message="Hakuna mipango bado" />}
          {plans.map((p: any) => (
            <Card key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{p.description}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Muda: {p.duration || p.term || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#00E676' }}>TZS {fmt(p.price || p.premium)}</div>
                  <Btn onClick={() => buyCover(p.id)} loading={loading} style={{ width: 'auto', padding: '6px 12px', fontSize: 12, marginTop: 4 }}>Nunua</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'my' && (
        <div>
          {myCovers.length === 0 && <Empty message="Huna bima bado" />}
          {myCovers.map((c: any) => (
            <Card key={c.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.plan_name || 'Bima'}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Kuanzia: {new Date(c.start_date || c.created_at).toLocaleDateString('sw-TZ')}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Kwisho: {c.end_date ? new Date(c.end_date).toLocaleDateString('sw-TZ') : '—'}</div>
                </div>
                <Badge color={c.status === 'active' ? '#4caf50' : '#ff9800'}>{c.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
