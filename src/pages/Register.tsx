import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, Btn, Input, Error } from '../ui';

export default function Register() {
  const nav = useNavigate();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = async () => {
    if (!phone || !name || !password) { setError('Jaza sehemu zote'); return; }
    if (password !== confirm) { setError('Nywila hazifanani'); return; }
    if (password.length < 6) { setError('Nywila iwe na herufi 6 angalau'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/auth/register', { phone, name, password });
    if (r.status === 201) nav('/login');
    else setError(r.json?.error || 'Kuna hitilafu');
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '0 auto', paddingTop: 60 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#00E676' }}>TUONDOKE</div>
        <div style={{ fontSize: 14, color: '#888' }}>Fungua akaunti mpya</div>
      </div>
      <Card>
        {error && <Error message={error} />}
        <Input label="Nambari ya Simu" value={phone} onChange={setPhone} placeholder="0712345678" />
        <Input label="Jina Kamili" value={name} onChange={setName} placeholder="Jina lako" />
        <Input label="Nywila" value={password} onChange={setPassword} type="password" placeholder="Herufi 6 angalau" />
        <Input label="Thibitisha Nywila" value={confirm} onChange={setConfirm} type="password" />
        <Btn onClick={handle} loading={loading}>Jisajili</Btn>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          Tisha akaunti? <Link to="/login" style={{ color: '#00E676', fontWeight: 600 }}>Ingia</Link>
        </div>
      </Card>
    </div>
  );
}
