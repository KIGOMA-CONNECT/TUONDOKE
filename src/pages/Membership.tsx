import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Badge, Tabs, Spinner, Empty } from '../ui';

export default function Membership() {
  const { token } = useAuth();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState<any[]>([]);
  const [myStatus, setMyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!token) return;
    const r = await api('GET', '/membership/plans', undefined, token);
    if (r.status === 200) setPlans(r.json.plans || r.json || []);
    const r2 = await api('GET', '/membership/me', undefined, token);
    if (r2.status === 200) setMyStatus(r2.json);
  };

  useEffect(() => { loadData(); }, [token]);

  const subscribe = async (planId: number) => {
    setLoading(true);
    const r = await api('POST', '/membership/subscribe', { planId }, token!);
    if (r.status === 200 || r.status === 201) loadData();
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🎖️ Uanachama</h2>
      <Tabs
        tabs={[{ key: 'plans', label: 'Mipango' }, { key: 'status', label: 'Hali Yangu' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'status' && myStatus && (
        <Card style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 40 }}>🎖️</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>{myStatus.plan_name || 'Huna uanachama'}</div>
          <Badge color={myStatus.status === 'active' ? '#4caf50' : '#ff9800'}>{myStatus.status || 'Haijaviswa'}</Badge>
          {myStatus.cashback_rate && <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>Cashback: {myStatus.cashback_rate}%</div>}
          {myStatus.expires_at && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            Inakwisha: {new Date(myStatus.expires_at).toLocaleDateString('sw-TZ')}
          </div>}
        </Card>
      )}

      {tab === 'status' && !myStatus && <Empty message="Huna uanachama bado" />}

      {tab === 'plans' && (
        <div>
          {plans.length === 0 && <Empty message="Hakuna mipango bado" />}
          {plans.map((p: any) => (
            <Card key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{p.description}</div>
                  {p.cashback_rate && <div style={{ fontSize: 12, color: '#00E676', marginTop: 2 }}>Cashback: {p.cashback_rate}%</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#00E676' }}>TZS {fmt(p.price)}</div>
                  <Btn onClick={() => subscribe(p.id)} loading={loading} style={{ width: 'auto', padding: '6px 12px', fontSize: 12, marginTop: 4 }}>Jiunge</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
