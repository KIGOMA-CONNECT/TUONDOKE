import React, { ReactNode } from 'react';

const P = '#00E676';
const PH = '#00C853';
const TXT = '#1a1a1a';
const BG = '#f5f5f5';

export function Card({ children, style, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', ...style }}>{children}</div>;
}

export function Btn({ children, onClick, color, disabled, style, loading, type }: { children: ReactNode; onClick?: () => void; color?: string; disabled?: boolean; style?: React.CSSProperties; loading?: boolean; type?: 'button' | 'submit' }) {
  const bg = color || P;
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: disabled ? '#ccc' : bg,
        color: bg === P ? '#000' : '#fff',
        padding: '12px 24px',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 15,
        width: '100%',
        opacity: loading ? 0.7 : 1,
        transition: 'background 0.2s',
        ...style,
      }}
    >
      {loading ? 'Inapakia...' : children}
    </button>
  );
}

export function Input({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>{label}</label>
      <input
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, outline: 'none' }}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, placeholder }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, outline: 'none', background: '#fff' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function TextArea({ label, value, onChange, placeholder, rows }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#555' }}>{label}</label>
      <textarea
        value={value}
        rows={rows || 3}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
      />
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        style={{ flex: 'none', padding: '6px 16px', borderRadius: 6, background: checked ? '#4caf50' : '#ddd', color: checked ? '#fff' : '#666', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
      >
        {checked ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const tone = color || (pct >= 90 ? '#f44336' : pct >= 70 ? '#ff9800' : '#4caf50');
  return (
    <div style={{ width: '100%', height: 12, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: tone, borderRadius: 6, transition: 'width 0.3s' }} />
    </div>
  );
}

export function Note({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' | 'info' }) {
  const styles = {
    ok: { background: '#e8f5e9', color: '#2e7d32' },
    warn: { background: '#ffebee', color: '#c62828' },
    info: { background: '#e3f2fd', color: '#1565c0' },
  } as const;
  const s = styles[tone || 'ok'];
  return <div style={{ background: s.background, color: s.color, padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{children}</div>;
}

export function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || TXT }}>{value}</div>
      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span style={{ display: 'inline-block', background: color || '#e8f5e9', color: color ? '#fff' : '#2e7d32', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: 16, overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ flex: 'none', padding: '10px 16px', background: 'none', borderBottom: active === t.key ? `3px solid ${P}` : '3px solid transparent', fontWeight: active === t.key ? 700 : 400, color: active === t.key ? P : '#666', fontSize: 14, whiteSpace: 'nowrap' }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 400, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div style={{ width: 32, height: 32, border: `3px solid #eee`, borderTopColor: P, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style></div>;
}

export function Error({ message }: { message: string }) {
  return <div style={{ background: '#ffebee', color: '#c62828', padding: 12, borderRadius: 8, fontSize: 14 }}>{message}</div>;
}

export function Empty({ message }: { message: string }) {
  return <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 14 }}>{message}</div>;
}

export function FieldErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return <div style={{ marginBottom: 8 }}>{errors.map((e, i) => <div key={i} style={{ color: '#c62828', fontSize: 13 }}>{e}</div>)}</div>;
}
