import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { Card, Btn, Input, Error } from '../ui';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!phone || !password) { setError('Jaza sehemu zote'); return; }
    setLoading(true); setError('');
    const r = await login(phone, password);
    if (r.status === 200 && r.json.token) nav('/book');
    else setError(r.json?.error || 'Kuna hitilafu');
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '0 auto', paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#00E676' }}>TUONDOKE</div>
        <div style={{ fontSize: 14, color: '#888' }}>Ingia kwenye akaunti yako</div>
      </div>
      <Card>
        {error && <Error message={error} />}
        <Input label="Nambari ya Simu" value={phone} onChange={setPhone} placeholder="0712345678" />
        <Input label="Nywila" value={password} onChange={setPassword} type="password" />
        <Btn onClick={handle} loading={loading}>Ingia</Btn>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          Hauna akaunti? <Link to="/register" style={{ color: '#00E676', fontWeight: 600 }}>Jisajili</Link>
        </div>
      </Card>
    </div>
  );
}
