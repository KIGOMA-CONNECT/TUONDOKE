import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Badge, Tabs, Empty } from '../ui';

export default function Loyalty() {
  const { token } = useAuth();
  const [tab, setTab] = useState('balance');
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [redeemMode, setRedeemMode] = useState('cash');
  const [redeemAmt, setRedeemAmt] = useState('');
  const [loading, setLoading] = useState(false);

  const loadBalance = async () => {
    if (!token) return;
    const r = await api('GET', '/loyalty/balance', undefined, token);
    if (r.status === 200) setPoints(r.json.points || 0);
  };

  const loadHistory = async () => {
    if (!token) return;
    const r = await api('GET', '/loyalty/history', undefined, token);
    if (r.status === 200) setHistory(r.json.history || r.json || []);
  };

  useEffect(() => { loadBalance(); loadHistory(); }, [token]);

  const redeem = async () => {
    if (!redeemAmt) return;
    setLoading(true);
    const r = await api('POST', '/loyalty/redeem', { points: parseInt(redeemAmt), mode: redeemMode }, token!);
    if (r.status === 200) { setRedeemAmt(''); loadBalance(); loadHistory(); }
    setLoading(false);
  };

  const modes = [
    { key: 'cash', label: '💵 Pesa', desc: 'Pata pesa pochi' },
    { key: 'trip', label: '🚖 Safari', desc: 'Punguzo la safari' },
    { key: 'airtime', label: '📱 Hadiyai', desc: 'Pata salio la simu' },
    { key: 'voucher', label: '🎫 Vocha', desc: 'Nunua vocha' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🏆 Uaminifu</h2>
      <Tabs
        tabs={[{ key: 'balance', label: 'Pointi' }, { key: 'redeem', label: 'Badilisha' }, { key: 'history', label: 'Historia' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'balance' && (
        <Card style={{ textAlign: 'center', padding: 32, background: 'linear-gradient(135deg, #00E676, #00C853)' }}>
          <div style={{ fontSize: 13, color: '#1b5e20' }}>Pointi Zako</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#000', marginTop: 4 }}>{fmt(points)}</div>
          <div style={{ fontSize: 13, color: '#1b5e20', marginTop: 8 }}>Pata pointi kila safari</div>
        </Card>
      )}

      {tab === 'redeem' && (
        <div>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {modes.map(m => (
                <button key={m.key} onClick={() => setRedeemMode(m.key)} style={{ padding: 12, border: `2px solid ${redeemMode === m.key ? '#00E676' : '#ddd'}`, borderRadius: 8, background: redeemMode === m.key ? '#e8f5e9' : '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: 20 }}>{m.label.split(' ')[0]}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{m.label.split(' ')[1]}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>Kiasi la Pointi</label>
              <input value={redeemAmt} onChange={e => setRedeemAmt(e.target.value)} type="number" placeholder="Weka kiasi" style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }} />
            </div>
            <Btn onClick={redeem} loading={loading}>Badilisha Pointi</Btn>
          </Card>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 && <Empty message="Hakuna historia bado" />}
          {history.map((h: any, i: number) => (
            <Card key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.description || h.type}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(h.created_at).toLocaleDateString('sw-TZ')}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: h.points > 0 ? '#4caf50' : '#f44336' }}>
                {h.points > 0 ? '+' : ''}{h.points} pointi
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
