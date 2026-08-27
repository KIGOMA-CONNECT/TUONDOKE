import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api } from '../api';
import { Card, Tabs, Badge, Empty } from '../ui';

export default function Reviews() {
  const { token } = useAuth();
  const [tab, setTab] = useState('given');
  const [given, setGiven] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any>({});

  const loadData = async () => {
    if (!token) return;
    const r = await api('GET', '/reviews/given', undefined, token);
    if (r.status === 200) setGiven(r.json.reviews || r.json || []);
    const r2 = await api('GET', '/reviews/received', undefined, token);
    if (r2.status === 200) { setReceived(r2.json.reviews || r2.json || []); setBreakdown(r2.json.breakdown || {}); }
  };

  useEffect(() => { loadData(); }, [token]);

  const stars = (n: number) => '⭐'.repeat(Math.min(n, 5));

  const maxBar = Math.max(...Object.values(breakdown).map(Number), 1);

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>⭐ Maoni</h2>
      <Tabs
        tabs={[{ key: 'given', label: 'Nilizopatia' }, { key: 'received', label: 'Nilizopokea' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'received' && Object.keys(breakdown).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Vipimo vya Ukadiriaji</h3>
          {[5, 4, 3, 2, 1].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, width: 20 }}>{n}⭐</span>
              <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 4 }}>
                <div style={{ width: `${((breakdown[n] || 0) / maxBar) * 100}%`, height: '100%', background: '#00E676', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: '#888', width: 20 }}>{breakdown[n] || 0}</span>
            </div>
          ))}
        </Card>
      )}

      {tab === 'given' && (
        <div>
          {given.length === 0 && <Empty message="Hukutoa maoni bado" />}
          {given.map((r: any) => (
            <Card key={r.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.driver_name || r.to_name || 'Dereva'}</div>
                <div>{stars(r.rating)}</div>
              </div>
              {r.comment && <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{r.comment}</div>}
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString('sw-TZ')}</div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'received' && (
        <div>
          {received.length === 0 && <Empty message="Hujapokea maoni bado" />}
          {received.map((r: any) => (
            <Card key={r.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.passenger_name || r.from_name || 'Abiria'}</div>
                <div>{stars(r.rating)}</div>
              </div>
              {r.comment && <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{r.comment}</div>}
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString('sw-TZ')}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
