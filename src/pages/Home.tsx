import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context';
import { Card, Btn } from '../ui';

export default function Home() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #00E676, #00C853)', padding: '60px 20px 40px', textAlign: 'center', borderRadius: '0 0 24px 24px' }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: '#000', letterSpacing: -1 }}>TUONDOKE</div>
        <div style={{ fontSize: 14, color: '#1b5e20', marginTop: 8, fontWeight: 500 }}>Healing & Logistic Management Platform</div>
        {!user && (
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Btn onClick={() => nav('/login')} style={{ width: 120 }}>Ingia</Btn>
            <Btn onClick={() => nav('/register')} color="#fff" style={{ width: 120, border: '2px solid #000' }}>Jisajili</Btn>
          </div>
        )}
        {user && (
          <div style={{ marginTop: 20, color: '#1b5e20', fontWeight: 600 }}>Karibu, {user.name}!</div>
        )}
      </div>

      <div style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12, color: '#333' }}>Huduma Zetu</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { icon: '🚖', title: 'Safari', desc: 'Ofa safari kwa bei nafuu', path: '/book' },
            { icon: '📦', title: 'Mizigo', desc: 'Usafirishaji mzigo kwa uaminifu', path: '/cargo' },
            { icon: '💰', title: 'Pochi', desc: 'Simamia pesa zako kwa urahisi', path: '/wallet' },
            { icon: '🏦', title: 'Fedha', desc: 'Akiba na mikopo', path: '/finance' },
            { icon: '🤖', title: 'AI Msaada', desc: 'Msaada wa akili bandia', path: '/ai' },
            { icon: '🛡️', title: 'Usalama', desc: 'Wasiliana na wasaidizi', path: '/safety' },
            { icon: '🏆', title: 'Uaminifu', desc: 'Pata pointi na zawadi', path: '/loyalty' },
            { icon: '🚗', title: 'Dereva', desc: 'Jiunge na watoa huduma', path: '/driver' },
          ].map(f => (
            <Link key={f.title} to={user ? f.path : '/login'}>
              <Card style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 28 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{f.desc}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px 40px' }}>
        <Card style={{ background: '#e8f5e9', textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2e7d32' }}>Uko tayari?</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>Jiunge na TUONDOKE leo na anza safari yako</div>
          {!user && <Btn onClick={() => nav('/register')} style={{ marginTop: 16, maxWidth: 200, margin: '16px auto 0' }}>Jiunge Sasa</Btn>}
        </Card>
      </div>
    </div>
  );
}
