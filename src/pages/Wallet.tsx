import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Input, Tabs, Badge, Spinner, Error, Empty } from '../ui';

export default function Wallet() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('balance');
  const [balance, setBalance] = useState(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [depositAmt, setDepositAmt] = useState('');
  const [transferPhone, setTransferPhone] = useState('');
  const [transferAmt, setTransferAmt] = useState('');

  const loadBalance = async () => {
    if (!token) return;
    const r = await api('GET', '/wallet/balance', undefined, token);
    if (r.status === 200) setBalance(r.json.balance || 0);
  };

  const loadTxns = async () => {
    if (!token) return;
    const r = await api('GET', '/wallet/transactions', undefined, token);
    if (r.status === 200) setTxns(r.json.transactions || r.json || []);
  };

  useEffect(() => { loadBalance(); loadTxns(); }, [token]);

  const deposit = async () => {
    if (!depositAmt || parseFloat(depositAmt) <= 0) { setError('Weka kiasi sahihi'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/wallet/deposit', { amount: parseFloat(depositAmt) }, token!);
    if (r.status === 200) { setDepositAmt(''); loadBalance(); loadTxns(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const transfer = async () => {
    if (!transferPhone || !transferAmt) { setError('Jaza sehemu zote'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/wallet/transfer', { to: transferPhone, amount: parseFloat(transferAmt) }, token!);
    if (r.status === 200) { setTransferPhone(''); setTransferAmt(''); loadBalance(); loadTxns(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const txIcon = (type: string) => {
    if (type === 'deposit' || type === 'credit') return '💵';
    if (type === 'transfer' || type === 'debit') return '📤';
    if (type === 'ride_payment') return '🚖';
    if (type === 'withdrawal') return '🏧';
    return '💳';
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>💰 Pochi</h2>
      <Tabs
        tabs={[{ key: 'balance', label: 'Salio' }, { key: 'history', label: 'Historia' }, { key: 'transfer', label: 'Weka/Pea' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'balance' && (
        <>
          <Card style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', textAlign: 'center', padding: 32, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#1b5e20' }}>Salio la Pochi</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#000', marginTop: 4 }}>TZS {fmt(balance)}</div>
          </Card>
          <Card>
            {error && <Error message={error} />}
            <Input label="Kiasi (TZS)" value={depositAmt} onChange={setDepositAmt} type="number" placeholder="Weka kiasi" />
            <Btn onClick={deposit} loading={loading}>Weka Pesa</Btn>
          </Card>
        </>
      )}

      {tab === 'history' && (
        <div>
          {txns.length === 0 && <Empty message="Hakuna miamala bado" />}
          {txns.map((t: any, i: number) => (
            <Card key={i} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>{txIcon(t.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description || t.type}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(t.created_at).toLocaleString('sw-TZ')}</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: (t.type === 'deposit' || t.type === 'credit') ? '#4caf50' : '#f44336' }}>
                {(t.type === 'deposit' || t.type === 'credit') ? '+' : '-'} TZS {fmt(t.amount)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'transfer' && (
        <Card>
          {error && <Error message={error} />}
          <Input label="Nambari ya Simu" value={transferPhone} onChange={setTransferPhone} placeholder="0712345678" />
          <Input label="Kiasi (TZS)" value={transferAmt} onChange={setTransferAmt} type="number" placeholder="Weka kiasi" />
          <Btn onClick={transfer} loading={loading}>Tuma Pesa</Btn>
        </Card>
      )}
    </div>
  );
}
