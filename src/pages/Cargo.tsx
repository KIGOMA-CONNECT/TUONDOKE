import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Input, Tabs, Badge, Spinner, Error, Empty } from '../ui';

export default function Cargo() {
  const { token } = useAuth();
  const [tab, setTab] = useState('post');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [type, setType] = useState('general');
  const [weight, setWeight] = useState('');
  const [desc, setDesc] = useState('');
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadShipments = async () => {
    if (!token) return;
    const r = await api('GET', '/cargo/my', undefined, token);
    if (r.status === 200) setShipments(r.json.shipments || r.json || []);
  };

  useEffect(() => { loadShipments(); }, [token]);

  const postCargo = async () => {
    if (!origin || !dest || !weight) { setError('Jaza sehemu zote'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/cargo/ship', { origin, destination: dest, type, weight: parseFloat(weight), description: desc }, token!);
    if (r.status === 200 || r.status === 201) { setOrigin(''); setDest(''); setWeight(''); setDesc(''); loadShipments(); setTab('my'); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const types = [
    { key: 'general', label: 'Jumla' },
    { key: 'fragile', label: 'Inyevu' },
    { key: 'documents', label: ' nyaraka' },
    { key: 'food', label: 'Chakula' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>📦 Mizigo</h2>
      <Tabs
        tabs={[{ key: 'post', label: 'Weka Mizigo' }, { key: 'my', label: 'Mizigo Yangu' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'post' && (
        <Card>
          {error && <Error message={error} />}
          <Input label="Mahali pa Kuanzia" value={origin} onChange={setOrigin} placeholder="Eneo la kuchukulia" />
          <Input label="Unakwenda" value={dest} onChange={setDest} placeholder="Eneo la kufikishia" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>Aina ya Mzigo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {types.map(t => (
                <button key={t.key} onClick={() => setType(t.key)} style={{ padding: '8px 12px', border: `2px solid ${type === t.key ? '#00E676' : '#ddd'}`, borderRadius: 8, background: type === t.key ? '#e8f5e9' : '#fff', fontWeight: 600, fontSize: 13 }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Uzito (kg)" value={weight} onChange={setWeight} type="number" placeholder="Kg" />
          <Input label="Maelezo" value={desc} onChange={setDesc} placeholder="Maelezo ya mzigo" />
          <Btn onClick={postCargo} loading={loading}>Weka Mizigo</Btn>
        </Card>
      )}

      {tab === 'my' && (
        <div>
          {shipments.length === 0 && <Empty message="Hakuna mizigo bado" />}
          {shipments.map((s: any) => (
            <Card key={s.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.origin} → {s.destination}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{s.type} | {s.weight}kg</div>
                </div>
                <Badge color={s.status === 'delivered' ? '#4caf50' : s.status === 'transit' ? '#2196f3' : '#ff9800'}>
                  {s.status}
                </Badge>
              </div>
              {s.fare && <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>TZS {fmt(s.fare)}</div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
