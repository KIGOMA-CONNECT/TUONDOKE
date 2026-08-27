import React from 'react';
import { Link } from 'react-router-dom';
import { Btn } from '../ui';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: '#ddd' }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>Ukurasa haujapatikana</div>
      <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Ukurasa unaoaugata haupo tena</div>
      <Link to="/">
        <Btn style={{ marginTop: 24, maxWidth: 200, margin: '24px auto 0' }}>Rudi Nyumbani</Btn>
      </Link>
    </div>
  );
}
