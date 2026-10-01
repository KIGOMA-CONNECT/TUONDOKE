import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tabs } from '../ui';

const TERMS = [
  { h: '1. Mapokeano', p: 'Kwa kutumia TUONDOKE, unakubali masharti haya yote. Ikiwa hukubaliani, tafadhali usitumie jukwaa hili.' },
  { h: '2. Huduma', p: 'TUONDOKE inatoa huduma za usafiri, usafirishaji mizigo, na malipo ya dijitali. Tunajihifadhi haki ya kubadilisha au kusimamisha huduma wakati wowote.' },
  { h: '3. Akaunti yako', p: 'Unawajibika kwa usalama wa akaunti yako. Fanya taarifa zako kuwa za sasa na ushirikiane nasi katika masuala ya usalama.' },
  { h: '4. Malipo', p: 'Malipo hufanywa kupitia M-Pesa au pochi yaTUONDOKE. ada za huduma zinaweza kubadilika kulingana na safari.' },
  { h: '5. Sarafi na Kupokea', p: 'Abiria na watoa huduma wote wanapaswa kuheshimu kanuni za adabu na usalama. TUONDOKE inajihifadhi haki ya kufunga akaunti kwa ukiukwaji.' },
  { h: '6. Faragha', p: 'Taarifa zako zinalindwa kulingana na Sera yetu ya Faragha. Hatutashiriki taarifa zako na wahusika b idhaa yako.' },
  { h: '7. Jukumu', p: 'TUONDOKE haiwajibikia ajali, hasara za moja kwa moja, au madhara ya matumizi mabaya ya jukwaa.' },
  { h: '8. Kufunga', p: 'Unaweza kufunga akaunti yako wakati wowote. TUONDOKE inaweza pia kufunga akaunti kwa ukiukwaji wa masharti.' },
  { h: '9. Mabadiliko', p: 'Tunaweza kusasisha masharti haya mara kwa mara. Mtumiaji atapewa taarifa kwa barua pepe au ndani ya programu.' },
  { h: '10. Mawasiliano', p: 'Maswali kuhusu masharti? Wasiliana nasi: support@tuondoke.tz' },
];

const PRIVACY = [
  { h: '1. Taarifa Tunazokusanya', p: 'Tunakusanya jina, nambari ya simu, barua pepe, eneo la GPS wakati wa safari, na maelezo ya malipo.' },
  { h: '2. Matumizi ya Taarifa', p: 'Taarifa zinatumika kutoa huduma, kuboresha jukwaa, kuhakikisha usalama, na kushughulikia malipo.' },
  { h: '3. Kushiriki Taarifa', p: 'Hatushiriki taarifa zako na wahusika wa tatu b idhaa yako, isipokuwa kwa mahitaji ya kisheria au kutoa huduma (kwa mfano, M-Pesa).' },
  { h: '4. Ulinzi', p: 'Tunatumia encryption na kanuni za usalama kulinda taarifa zako. Lakini hakuna mtandao unaolindwa 100%.' },
  { h: '5. Kuki', p: 'Programu yetu inatumia kuki kuboresha uzoefu wako. Unaweza kukataa kuki kupitia mipangilio ya kivinjari.' },
  { h: '6. Haki Zako', p: 'Una haki ya kuona, kusasisha, au kufuta taarifa zako. Wasiliana nasi: privacy@tuondoke.tz' },
  { h: '7. Uhifadhi', p: 'Taarifa zako zinahifadhiwa kwa muda unaohitajika kutoa huduma. Baada ya kufunga akaunti, taarifa zinafutwa ndani ya siku 90.' },
  { h: '8. Mawasiliano', p: 'Maswali ya faragha? Wasiliana: privacy@tuondoke.tz au +255 700 000 000' },
];

export default function Legal() {
  const [tab, setTab] = useState('terms');
  const items = tab === 'terms' ? TERMS : PRIVACY;
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', paddingTop: 20 }}>
      <Link to="/profile" style={{ fontSize: 14, color: '#00E676', fontWeight: 600 }}>← Rudi</Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 12, marginBottom: 16 }}>Kisheria</h1>
      <Tabs tabs={[{ key: 'terms', label: 'Masharti ya Kutumia' }, { key: 'privacy', label: 'Sera ya Faragha' }]} active={tab} onChange={setTab} />
      <div style={{ fontSize: 14, lineHeight: 1.8, color: '#444' }}>
        {items.map((s, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.h}</div>
            <div>{s.p}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 32, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 13, color: '#888', textAlign: 'center' }}>
        TUONDOKE &copy; {new Date().getFullYear()} — Healing & Logistics Platform
      </div>
    </div>
  );
}
