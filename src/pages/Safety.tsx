import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api } from '../api';
import { Card, Btn, Input, Badge, Error, Empty } from '../ui';

export default function Safety() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [sosHistory, setSosHistory] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sosLoading, setSosLoading] = useState(false);
  const [tab, setTab] = useState<'contacts' | 'sos'>('contacts');

  const loadContacts = async () => {
    if (!token) return;
    const r = await api('GET', '/safety/contacts', undefined, token);
    if (r.status === 200) setContacts(r.json.contacts || r.json || []);
  };

  const loadSos = async () => {
    if (!token) return;
    const r = await api('GET', '/safety/sos-history', undefined, token);
    if (r.status === 200) setSosHistory(r.json.sos || r.json || []);
  };

  useEffect(() => { loadContacts(); loadSos(); }, [token]);

  const addContact = async () => {
    if (!name || !phone) { setError('Jaza jina na simu'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/safety/contacts', { name, phone }, token!);
    if (r.status === 200 || r.status === 201) { setName(''); setPhone(''); loadContacts(); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const triggerSos = async () => {
    if (!confirm('Tuma ishara ya dharura?')) return;
    setSosLoading(true);
    const r = await api('POST', '/safety/sos', {}, token!);
    if (r.status === 200) loadSos();
    else setError(r.json?.error || 'Imeshindwa kutuma SOS');
    setSosLoading(false);
  };

  const deleteContact = async (id: number) => {
    const r = await api('DELETE', `/safety/contacts/${id}`, undefined, token!);
    if (r.status === 200) loadContacts();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>🛡️ Usalama</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('contacts')} style={{ flex: 1, padding: 10, background: tab === 'contacts' ? '#00E676' : '#eee', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Wasiliana</button>
        <button onClick={() => setTab('sos')} style={{ flex: 1, padding: 10, background: tab === 'sos' ? '#00E676' : '#eee', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Historia ya SOS</button>
      </div>

      {error && <Error message={error} />}

      {tab === 'contacts' && (
        <>
          <Card style={{ marginBottom: 16, background: '#ffebee', borderLeft: '4px solid #f44336' }}>
            <Btn onClick={triggerSos} loading={sosLoading} color="#f44336" style={{ fontSize: 18, fontWeight: 800, padding: 16 }}>
              🚨 TUMA SOS
            </Btn>
            <div style={{ fontSize: 12, color: '#c62828', textAlign: 'center', marginTop: 8 }}>Bonyeza kutuma ishara ya dharura kwa waokoaji</div>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ongeza Mwasiliani</h3>
            <Input label="Jina" value={name} onChange={setName} placeholder="Jina la mwasiliani" />
            <Input label="Simu" value={phone} onChange={setPhone} placeholder="0712345678" />
            <Btn onClick={addContact} loading={loading}>Ongeza</Btn>
          </Card>

          {contacts.map((c: any) => (
            <Card key={c.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{c.phone}</div>
              </div>
              <button onClick={() => deleteContact(c.id)} style={{ color: '#f44336', fontSize: 12, background: 'none' }}>Futa</button>
            </Card>
          ))}
          {contacts.length === 0 && <Empty message="Hakuna waokoaji bado" />}
        </>
      )}

      {tab === 'sos' && (
        <div>
          {sosHistory.length === 0 && <Empty message="Hakuna ishara za SOS" />}
          {sosHistory.map((s: any) => (
            <Card key={s.id} style={{ marginBottom: 8, borderLeft: '4px solid #f44336' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>🚨 SOS</div>
                <div style={{ fontSize: 12, color: '#888' }}>{new Date(s.created_at).toLocaleString('sw-TZ')}</div>
              </div>
              {s.location && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>📍 {s.location}</div>}
              <Badge color="#f44336">{s.status || 'Imetumwa'}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
