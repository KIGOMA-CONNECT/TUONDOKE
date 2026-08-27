import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Stat, Badge, Empty } from '../ui';

export default function Referrals() {
  const { token, user } = useAuth();
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    if (!token) return;
    const r = await api('GET', '/referrals/me', undefined, token);
    if (r.status === 200) {
      setCode(r.json.code || r.json.referral_code || '');
      setStats(r.json);
    }
    const r2 = await api('GET', '/referrals/history', undefined, token);
    if (r2.status === 200) setHistory(r2.json.referrals || r2.json || []);
  };

  useEffect(() => { loadData(); }, [token]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>👥 Mapendekezo</h2>

      <Card style={{ textAlign: 'center', marginBottom: 16, background: 'linear-gradient(135deg, #00E676, #00C853)', padding: 24 }}>
        <div style={{ fontSize: 13, color: '#1b5e20' }}>Msimbo Wako wa Mapendekezo</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#000', marginTop: 8, letterSpacing: 2 }}>{code || '—'}</div>
        <button onClick={copyCode} style={{ marginTop: 12, padding: '8px 24px', background: '#000', color: '#00E676', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
          {copied ? '✓ Imenakiliwa' : 'Nakili Msimbo'}
        </button>
      </Card>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Stat label="Waliopendekezwa" value={stats.total_referrals || 0} color="#00E676" />
        </Card>
        <Card style={{ flex: 1, textAlign: 'center' }}>
          <Stat label="Mapato" value={`TZS ${fmt(stats.referral_earnings || 0)}`} color="#4caf50" />
        </Card>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Historia ya Mapendekezo</h3>
      {history.length === 0 && <Empty message="Hakuna mapendekezo bado" />}
      {history.map((h: any, i: number) => (
        <Card key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{h.name || h.referred_name || 'Mtumiaji'}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{new Date(h.created_at).toLocaleDateString('sw-TZ')}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#4caf50' }}>+TZS {fmt(h.earnings || h.bonus || 0)}</div>
        </Card>
      ))}
    </div>
  );
}
