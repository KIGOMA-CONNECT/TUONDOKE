import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context';
import { api } from '../api';
import { Card, Btn, Error, Empty } from '../ui';

export default function Chat() {
  const { tripId } = useParams<{ tripId: string }>();
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!token || !tripId) return;
    const r = await api('GET', `/chat/${tripId}`, undefined, token);
    if (r.status === 200) setMessages(r.json.messages || r.json || []);
  };

  useEffect(() => { loadMessages(); }, [tripId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !tripId) return;
    setLoading(true);
    const r = await api('POST', `/chat/${tripId}`, { message: input }, token!);
    if (r.status === 200 || r.status === 201) {
      setMessages(prev => [...prev, { id: Date.now(), message: input, sender_id: user?.id, created_at: new Date().toISOString() }]);
      setInput('');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>💬 Mazungumzo — Safari #{tripId}</h3>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {messages.length === 0 && <Empty message="Hakuna ujumbe bado" />}
        {messages.map((m: any) => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_id === user?.id ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div style={{ maxWidth: '75%', background: m.sender_id === user?.id ? '#00E676' : '#e0e0e0', color: m.sender_id === user?.id ? '#000' : '#1a1a1a', padding: '8px 12px', borderRadius: 12 }}>
              <div style={{ fontSize: 14 }}>{m.message}</div>
              <div style={{ fontSize: 10, color: m.sender_id === user?.id ? '#2e7d32' : '#999', marginTop: 2 }}>{new Date(m.created_at).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Andika ujumbe..."
          style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
        />
        <Btn onClick={send} loading={loading} style={{ width: 'auto', padding: '10px 20px' }}>Tuma</Btn>
      </div>
    </div>
  );
}
