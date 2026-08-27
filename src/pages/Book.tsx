import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Input, Tabs, Badge, Spinner, Error, Empty } from '../ui';

export default function Book() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('book');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [vType, setVType] = useState('boda');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const loadActive = async () => {
    if (!token) return;
    const r = await api('GET', '/rides/active', undefined, token);
    if (r.status === 200) setActiveRide(r.json);
  };

  const loadHistory = async () => {
    if (!token) return;
    const r = await api('GET', '/rides/history', undefined, token);
    if (r.status === 200) setHistory(r.json.trips || r.json || []);
  };

  useEffect(() => { loadActive(); loadHistory(); }, [token]);

  const getEstimate = async () => {
    if (!origin || !dest) { setError('Jaza asili na unakwenda'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/rides/estimate', { origin, destination: dest, vehicleType: vType }, token!);
    if (r.status === 200) setEstimate(r.json);
    else setError(r.json?.error || 'Imeshindwa kukokotoa');
    setLoading(false);
  };

  const bookRide = async () => {
    setLoading(true); setError('');
    const r = await api('POST', '/rides/book', { origin, destination: dest, vehicleType: vType }, token!);
    if (r.status === 200 || r.status === 201) { setActiveRide(r.json.trip || r.json); setTab('book'); }
    else setError(r.json?.error || 'Imeshindwa kubook');
    setLoading(false);
  };

  const updateRide = async (action: string) => {
    if (!activeRide) return;
    const r = await api('POST', `/rides/${activeRide.id}/${action}`, {}, token!);
    if (r.status === 200) loadActive();
  };

  const vTypes = [
    { key: 'boda', label: '🛺 Boda', desc: 'Pikipiki', price: 1.5 },
    { key: 'bajaji', label: '🚗 Bajaji', desc: 'Tuk-tuk', price: 2.5 },
    { key: 'pickup', label: '🛻 Pickup', desc: 'Gari', price: 4 },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🛺 Safari</h2>
      <Tabs
        tabs={[{ key: 'book', label: 'Book' }, { key: 'history', label: 'Historia' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'book' && (
        <>
          {activeRide && (
            <Card style={{ marginBottom: 16, borderLeft: '4px solid #00E676' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Safari Hai</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{activeRide.origin} → {activeRide.destination}</div>
                </div>
                <Badge color={activeRide.status === 'completed' ? '#4caf50' : activeRide.status === 'cancelled' ? '#f44336' : '#ff9800'}>
                  {activeRide.status}
                </Badge>
              </div>
              {activeRide.driver_name && <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Dereva: {activeRide.driver_name}</div>}
              {activeRide.fare && <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>TZS {fmt(activeRide.fare)}</div>}
              {activeRide.status === 'matched' && <Btn onClick={() => updateRide('start')} style={{ marginTop: 8 }}>Anza Safari</Btn>}
              {activeRide.status === 'in_progress' && <Btn onClick={() => updateRide('complete')} color="#4caf50" style={{ marginTop: 8 }}>Maliza</Btn>}
              {['pending', 'matched'].includes(activeRide.status) && <Btn onClick={() => updateRide('cancel')} color="#f44336" style={{ marginTop: 8 }}>Ghairi</Btn>}
            </Card>
          )}

          <Card>
            {error && <Error message={error} />}
            <Input label="Mahali pa Kuanzia" value={origin} onChange={setOrigin} placeholder="Eneo la kuanzia" />
            <Input label="Unakwenda" value={dest} onChange={setDest} placeholder="Eneo la kufika" />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>Aina ya Usafiri</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {vTypes.map(v => (
                  <div key={v.key} onClick={() => setVType(v.key)} style={{ flex: 1, padding: 12, border: `2px solid ${vType === v.key ? '#00E676' : '#ddd'}`, borderRadius: 8, textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: 20 }}>{v.label.split(' ')[0]}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{v.label.split(' ')[1]}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>x{v.price}</div>
                  </div>
                ))}
              </div>
            </div>
            {!estimate && <Btn onClick={getEstimate} loading={loading}>Kokotoa Bei</Btn>}
            {estimate && (
              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#555' }}>Bei ya Takriban</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#00E676' }}>TZS {fmt(estimate.fare || estimate.estimated_fare)}</div>
                {estimate.distance && <div style={{ fontSize: 12, color: '#888' }}>{estimate.distance}</div>}
              </div>
            )}
            {estimate && <Btn onClick={bookRide} loading={loading}>Book Safari</Btn>}
          </Card>
        </>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 && <Empty message="Hakuna safari bado" />}
          {history.map((t: any) => (
            <Card key={t.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.origin} → {t.destination}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{new Date(t.created_at).toLocaleDateString('sw-TZ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge color={t.status === 'completed' ? '#4caf50' : '#f44336'}>{t.status}</Badge>
                  {t.fare && <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>TZS {fmt(t.fare)}</div>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
