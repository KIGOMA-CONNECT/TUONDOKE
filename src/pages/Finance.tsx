import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api, fmt } from '../api';
import { Card, Btn, Input, Tabs, Badge, Spinner, Error, Empty } from '../ui';

export default function Finance() {
  const { token } = useAuth();
  const [tab, setTab] = useState('fd');
  const [fdRates, setFdRates] = useState<any[]>([]);
  const [myFds, setMyFds] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [fdAmount, setFdAmount] = useState('');
  const [fdTerm, setFdTerm] = useState('6');
  const [loanAmount, setLoanAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadFds = async () => {
    if (!token) return;
    const r = await api('GET', '/finance/fd-rates', undefined, token);
    if (r.status === 200) setFdRates(r.json.rates || r.json || []);
    const r2 = await api('GET', '/finance/my-fds', undefined, token);
    if (r2.status === 200) setMyFds(r2.json.deposits || r2.json || []);
  };

  const loadLoans = async () => {
    if (!token) return;
    const r = await api('GET', '/finance/my-loans', undefined, token);
    if (r.status === 200) setLoans(r.json.loans || r.json || []);
  };

  useEffect(() => { loadFds(); loadLoans(); }, [token]);

  const openFd = async () => {
    if (!fdAmount) { setError('Weka kiasi'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/finance/fd', { amount: parseFloat(fdAmount), term: parseInt(fdTerm) }, token!);
    if (r.status === 200 || r.status === 201) { setFdAmount(''); loadFds(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const requestLoan = async () => {
    if (!loanAmount) { setError('Weka kiasi'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/finance/loan', { amount: parseFloat(loanAmount) }, token!);
    if (r.status === 200 || r.status === 201) { setLoanAmount(''); loadLoans(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🏦 Fedha</h2>
      <Tabs
        tabs={[{ key: 'fd', label: 'Amana' }, { key: 'myfds', label: 'Amanang Zangu' }, { key: 'loans', label: 'Mikopo' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'fd' && (
        <>
          {fdRates.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Viwango vya Amana</h3>
              {fdRates.map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee', fontSize: 13 }}>
                  <span>{r.term || r.months} miezi</span>
                  <span style={{ fontWeight: 700, color: '#00E676' }}>{r.rate}%</span>
                </div>
              ))}
            </Card>
          )}
          <Card>
            {error && <Error message={error} />}
            <Input label="Kiasi (TZS)" value={fdAmount} onChange={setFdAmount} type="number" placeholder="Weka kiasi" />
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>Muda</label>
              <select value={fdTerm} onChange={e => setFdTerm(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8 }}>
                <option value="3">Miezi 3</option>
                <option value="6">Miezi 6</option>
                <option value="12">Miezi 12</option>
              </select>
            </div>
            <Btn onClick={openFd} loading={loading}>Fungua Amana</Btn>
          </Card>
        </>
      )}

      {tab === 'myfds' && (
        <div>
          {myFds.length === 0 && <Empty message="Hakuna amana bado" />}
          {myFds.map((f: any) => (
            <Card key={f.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>TZS {fmt(f.amount)}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{f.term || f.months} miezi</div>
                </div>
                <Badge color={f.status === 'matured' ? '#4caf50' : '#ff9800'}>{f.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'loans' && (
        <div>
          <Card style={{ marginBottom: 12 }}>
            {error && <Error message={error} />}
            <Input label="Kiasi (TZS)" value={loanAmount} onChange={setLoanAmount} type="number" placeholder="Weka kiasi" />
            <Btn onClick={requestLoan} loading={loading}>Omba Mkopo</Btn>
          </Card>
          {loans.length === 0 && <Empty message="Hakuna mikopo bado" />}
          {loans.map((l: any) => (
            <Card key={l.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>TZS {fmt(l.amount)}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{new Date(l.created_at).toLocaleDateString('sw-TZ')}</div>
                </div>
                <Badge color={l.status === 'approved' ? '#4caf50' : l.status === 'repaid' ? '#2196f3' : '#ff9800'}>{l.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
