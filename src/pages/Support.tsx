import React, { useState, useEffect } from 'react';
import { useAuth } from '../context';
import { api } from '../api';
import { Card, Btn, Input, Tabs, Badge, Spinner, Error, Empty } from '../ui';

export default function Support() {
  const { token } = useAuth();
  const [tab, setTab] = useState('create');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTickets = async () => {
    if (!token) return;
    const r = await api('GET', '/support/tickets', undefined, token);
    if (r.status === 200) setTickets(r.json.tickets || r.json || []);
  };

  useEffect(() => { loadTickets(); }, [token]);

  const createTicket = async () => {
    if (!subject || !message) { setError('Jaza sehemu zote'); return; }
    setLoading(true); setError('');
    const r = await api('POST', '/support/tickets', { subject, message }, token!);
    if (r.status === 200 || r.status === 201) { setSubject(''); setMessage(''); loadTickets(); setTab('my'); }
    else setError(r.json?.error || 'Imeshindwa');
    setLoading(false);
  };

  const sendReply = async () => {
    if (!reply || !selected) return;
    setLoading(true);
    const r = await api('POST', `/support/tickets/${selected.id}/reply`, { message: reply }, token!);
    if (r.status === 200) { setReply(''); loadTickets(); }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>📞 Msaada</h2>
      <Tabs
        tabs={[{ key: 'create', label: 'Fungua Tiketi' }, { key: 'my', label: 'Tiketi Zangu' }]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'create' && (
        <Card>
          {error && <Error message={error} />}
          <Input label="Somo" value={subject} onChange={setSubject} placeholder="Kichwa cha habari" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>Ujumbe</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' }} placeholder="Andika ujumbe wako hapa..." />
          </div>
          <Btn onClick={createTicket} loading={loading}>Tuma Tiketi</Btn>
        </Card>
      )}

      {tab === 'my' && !selected && (
        <div>
          {tickets.length === 0 && <Empty message="Hakuna tiketi bado" />}
          {tickets.map((t: any) => (
            <Card key={t.id} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setSelected(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.subject}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{new Date(t.created_at).toLocaleDateString('sw-TZ')}</div>
                </div>
                <Badge color={t.status === 'closed' ? '#4caf50' : '#ff9800'}>{t.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'my' && selected && (
        <div>
          <Btn onClick={() => setSelected(null)} color="#666" style={{ marginBottom: 12, width: 'auto', padding: '8px 16px' }}>← Rudi</Btn>
          <Card style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>{selected.subject}</h3>
            <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>{selected.message}</div>
          </Card>
          <Card>
            <Input label="" value={reply} onChange={setReply} placeholder="Andika jibu..." />
            <Btn onClick={sendReply} loading={loading}>Tuma Jibu</Btn>
          </Card>
        </div>
      )}
    </div>
  );
}
