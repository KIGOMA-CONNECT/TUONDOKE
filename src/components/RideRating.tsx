import React, { useState } from 'react';
import { Btn } from '../ui';

interface RideRatingProps {
  onSubmit: (rating: number, tipTzs: number, comment: string) => void | Promise<void>;
  maxTip?: number;
  loading?: boolean;
}

const TIPS = [0, 500, 1000, 2000, 5000];

export function RideRating({ onSubmit, maxTip = 20000, loading }: RideRatingProps) {
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState(0);
  const [comment, setComment] = useState('');

  const submit = async () => {
    if (rating < 1) return;
    await onSubmit(rating, tip, comment.trim());
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Tathmini dereva wako</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} type="button" onClick={() => setRating(s)} style={{ fontSize: 28, background: 'none', border: 'none', cursor: 'pointer', color: s <= rating ? '#FFD600' : '#E0E0E0' }}>★</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Zawadi (Tip) — TZS</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPS.map(t => (
            <button key={t} type="button" onClick={() => setTip(t)} style={{ padding: '6px 10px', borderRadius: 20, border: tip === t ? '2px solid #00E676' : '1px solid #ddd', background: tip === t ? '#e8f5e9' : '#fff', fontSize: 12 }}>{t === 0 ? 'Hakuna' : `TZS ${t.toLocaleString()}`}</button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <input type="number" value={tip} onChange={e => setTip(Math.max(0, Math.min(maxTip, parseInt(e.target.value) || 0)))} placeholder="Kiasi mingine" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Maoni yako (hiari)" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' }} />
      </div>

      <Btn onClick={submit} disabled={rating < 1} loading={loading}>Tuma Tathmini</Btn>
    </div>
  );
}
