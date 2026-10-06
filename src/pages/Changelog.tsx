import React from 'react';
import { Link } from 'react-router-dom';

interface ChangelogEntry { type: string; text: string }
interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  changes: ChangelogEntry[];
}

const VERSIONS: ChangelogVersion[] = [
  {
    version: 'v1.1.0', date: 'Agosti 2026', title: 'Frontend — 19 Kurasa, React + TypeScript',
    changes: [
      { type: 'feat', text: 'Mfumo kamili wa uongozi na CORS (Clerk-style)' },
      { type: 'feat', text: 'Pochi ya dijitali na malipo ya M-Pesa' },
      { type: 'feat', text: 'Usafirishaji mizigo na fuatilia moja kwa moja' },
      { type: 'feat', text: 'Ushirikiano wa gari la pamoja (carpool)' },
      { type: 'feat', text: 'Vocha za zawadi zinazoweza kuskaniwa kwa QR' },
      { type: 'feat', text: 'Utegemezi wa kikundi (Uanachama) na bima ya safari' },
      { type: 'feat', text: 'Uongozi wa urafiki na changamoto za kila wiki' },
      { type: 'feat', text: 'Uongozi wa usalama — SOS moja kwa moja na kasi ya kasi' },
      { type: 'feat', text: 'Miundo ya uwazi na ripoti za fedha' },
      { type: 'feat', text: 'Mikataba ya marudio na safari za kikundi' },
      { type: 'feat', text: 'Ujumbe wa moja kwa moja kati ya abiria na dereva' },
      { type: 'improvement', text: 'UI/UX iliyoboreshwa kwa miundo ya kijani' },
      { type: 'improvement', text: 'Upatikanaji bora na usaidizi wa klavu' },
      { type: 'fix', text: 'Sasisha hali ya mtandaoni na ukaribishaji upya' },
    ],
  },
  {
    version: 'v1.0.0', date: 'Juni 2026', title: 'Backend — Migrations 64, Routes 44, Services 8',
    changes: [
      { type: 'api', text: 'Usajili na uingiaji wa JWT na 2FA' },
      { type: 'api', text: 'Rides API — ongea, akcept, malipo, ukadiriaji' },
      { type: 'api', text: 'Cargo API — washa, fuatilia, thibitisha' },
      { type: 'api', text: 'Wallet API — salio, malipo, miamala' },
      { type: 'api', text: 'Payouts API — maombi, uthibitisho, hali' },
      { type: 'api', text: 'USSD API — menyu za simu za kawaida' },
      { type: 'api', text: 'Admin API — dashibodi, ripoti, usimamizi' },
      { type: 'api', text: 'WebSocket — safari moja kwa moja na arifa' },
      { type: 'feat', text: 'Hifadhidata ya SQLite na migrations 64' },
      { type: 'feat', text: 'Ushirikiano wa timu na mgawanyiko wa mapato' },
      { type: 'feat', text: 'Mikataba ya marudio na ratiba ya kiotomatiki' },
      { type: 'feat', text: 'Pointi za uaminifu na zawadi za upendeleo' },
      { type: 'improvement', text: 'Ulinzi wa helmet, CORS, na kiwango cha ombi' },
      { type: 'improvement', text: 'Mifumo ya idempotency na circuit breaker' },
      { type: 'fix', text: 'Usimamizi wa makosa na ufuatiliaji' },
    ],
  },
];

const BADGE_COLORS: Record<string, string> = {
  feat: '#00E676',
  improvement: '#2196F3',
  fix: '#FF9800',
  api: '#9C27B0',
};

export default function Changelog() {
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', paddingTop: 20 }}>
      <Link to="/profile" style={{ fontSize: 14, color: '#00E676', fontWeight: 600 }}>← Rudi</Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 12, marginBottom: 24 }}>Mabadiliko ya Toleo</h1>
      {VERSIONS.map(v => (
        <div key={v.version} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{v.version}</span>
            <span style={{ fontSize: 13, color: '#888' }}>{v.date}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{v.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {v.changes.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ display: 'inline-block', background: BADGE_COLORS[c.type] || '#eee', color: c.type === 'fix' ? '#000' : '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                  {c.type}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.5 }}>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
