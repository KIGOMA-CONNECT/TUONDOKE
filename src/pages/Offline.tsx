import React from 'react';
import { Btn } from '../ui';

export default function Offline() {
  return (
    <div style={{ textAlign: 'center', padding: 60, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📡</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Huna Mtandao</div>
      <div style={{ fontSize: 14, color: '#888', marginBottom: 24, maxWidth: 280 }}>
        Tafadhali angalia muunganisho wako wa intaneti na ujaribu tena.
      </div>
      <Btn onClick={() => location.reload()} style={{ maxWidth: 200 }}>Jaribu Tena</Btn>
    </div>
  );
}
