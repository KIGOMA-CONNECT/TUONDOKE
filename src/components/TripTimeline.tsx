import React from 'react';

export interface TimelineStep {
  key: string;
  title: string;
  time?: string;
  done: boolean;
  active?: boolean;
  detail?: string;
}

interface TripTimelineProps {
  steps: TimelineStep[];
}

export function TripTimeline({ steps }: TripTimelineProps) {
  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      {steps.map((s, i) => {
        const color = s.done ? '#00C853' : s.active ? '#2196F3' : '#9E9E9E';
        return (
          <div key={s.key} style={{ position: 'relative', marginBottom: i === steps.length - 1 ? 0 : 18 }}>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', left: -10, top: 16, width: 2, height: 18, background: s.done ? '#00C853' : '#eee' }} />
            )}
            <div style={{ position: 'absolute', left: -14, top: 4, width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #fff', boxShadow: '0 0 0 1px #ddd' }} />
            <div style={{ marginLeft: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.active ? '#000' : '#333' }}>{s.title}</div>
                {s.time && <div style={{ fontSize: 11, color: '#888' }}>{s.time}</div>}
              </div>
              {s.detail && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{s.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
