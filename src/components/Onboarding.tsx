import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Btn } from '../ui';

const STEPS = [
  { icon: '👋', title: 'Karibu TUONDOKE', desc: 'Jukwaa la usafiri na lojistiki linalokuletea safari rahisi, mizigo salama, na huduma bora zaidi.' },
  { icon: '🚖', title: 'Panga Safari', desc: 'Chagua eneo la kuanzia na kufika, thibitisha bei, na dereva atakufuata. Fuatilia safari yako moja kwa moja.' },
  { icon: '📦', title: 'Tuma Mizigo', desc: 'Wasilisha mzigo wako kwa usalama. Fuatilia hadi unapofika kwa mtumaji.' },
  { icon: '💰', title: 'Pochi Yako', desc: 'Simamia salio lako, ongeza pesa, kohoa, na lipa kwa urahisi kupitia pochi yaTUONDOKE.' },
  { icon: '🛡️', title: 'Usalama Kwanza', desc: 'Tumia mfumo wa dharura wa SOS, Shiriki safari, na pata taarifa za kasi ya dereva.' },
  { icon: '🎉', title: 'Pata Zawadi', desc: 'Wana watu, jipatie pointi za uaminifu, na ubadilishe zawadi za pesa, safari, au hewa.' },
];

const KEY = 'tuondoke_onboarded';

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(KEY) === '1';
}

export function completeOnboarding() {
  localStorage.setItem(KEY, '1');
}

export default function Onboarding({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const nav = useNavigate();
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = () => { completeOnboarding(); onDone?.(); nav('/book'); };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <Card style={{ maxWidth: 380, width: '100%', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{s.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
        <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>{s.desc}</div>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? '#00E676' : '#ddd', transition: 'all 0.3s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {!last && (
            <Btn onClick={finish} color="#fff" style={{ flex: 1, border: '2px solid #ddd', background: '#fff', color: '#666' }}>
              Ruka
            </Btn>
          )}
          <Btn onClick={last ? finish : () => setStep(step + 1)} style={{ flex: 1 }}>
            {last ? 'Anza' : 'Ifuatayo'}
          </Btn>
        </div>
      </Card>
    </div>
  );
}

