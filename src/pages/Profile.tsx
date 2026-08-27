import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { api } from '../api';
import { Card, Btn, Input, Error } from '../ui';

export default function Profile() {
  const { user, token, logout, refresh } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateProfile = async () => {
    setLoading(true); setError(''); setSuccess('');
    const r = await api('PUT', '/auth/profile', { name, email }, token!);
    if (r.status === 200) { setSuccess('Umefanikiwa kusasisha'); await refresh(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const changePassword = async () => {
    if (!oldPass || !newPass) { setError('Jaza nywila zote'); return; }
    setLoading(true); setError(''); setSuccess('');
    const r = await api('POST', '/auth/change-password', { oldPassword: oldPass, newPassword: newPass }, token!);
    if (r.status === 200) { setSuccess('Nywila imesasishwa'); setOldPass(''); setNewPass(''); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const handleLogout = () => { logout(); nav('/'); };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>👤 Akaunti</h2>

      {error && <Error message={error} />}
      {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{success}</div>}

      <Card style={{ marginBottom: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#00E676', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto', fontWeight: 700, color: '#000' }}>
            {user?.name?.[0] || '?'}
          </div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{user?.name}</div>
          <div style={{ fontSize: 13, color: '#888' }}>{user?.phone}</div>
          <div style={{ marginTop: 4 }}>{user?.role === 'admin' ? '⚙️ Admin' : user?.role === 'driver' ? '🚗 Dereva' : '👤 Mtumiaji'}</div>
        </div>
        <Input label="Jina" value={name} onChange={setName} />
        <Input label="Barua Pepe" value={email} onChange={setEmail} type="email" />
        <Btn onClick={updateProfile} loading={loading}>Sasisha Profaili</Btn>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>🔒 Badilisha Nywila</h3>
        <Input label="Nywila ya Zamani" value={oldPass} onChange={setOldPass} type="password" />
        <Input label="Nywila Mpya" value={newPass} onChange={setNewPass} type="password" />
        <Btn onClick={changePassword} loading={loading}>Badilisha Nywila</Btn>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🔗 Haraka</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn onClick={() => nav('/safety')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>🛡️ Usalama</Btn>
          <Btn onClick={() => nav('/loyalty')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>🏆 Uaminifu</Btn>
          <Btn onClick={() => nav('/referrals')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>👥 Mapendekezo</Btn>
          <Btn onClick={() => nav('/reviews')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>⭐ Maoni</Btn>
          <Btn onClick={() => nav('/support')} color="#666" style={{ textAlign: 'left', padding: '12px 16px' }}>📞 Msaada</Btn>
        </div>
      </Card>

      <Btn onClick={handleLogout} color="#f44336">Ondoka</Btn>
    </div>
  );
}
