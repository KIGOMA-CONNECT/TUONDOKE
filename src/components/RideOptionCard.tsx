import React from 'react';
import { Badge } from '../ui';

export interface RideOption {
  id: string;
  name: string;
  etaMin: number;
  price: number;
  vehicleType: string;
  capacity?: number;
  best?: boolean;
  details?: string;
}

interface RideOptionCardProps {
  option: RideOption;
  selected?: boolean;
  onSelect: (id: string) => void;
  currency?: string;
  fmt: (n: number) => string;
}

export function RideOptionCard({ option, selected, onSelect, currency = 'TZS', fmt }: RideOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        border: selected ? '2px solid #00E676' : '1px solid #eee',
        background: selected ? '#f1fff7' : '#fff',
        boxShadow: selected ? '0 2px 8px rgba(0,230,118,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: 8,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{option.name}</div>
          {option.best && <Badge color="#4CAF50">Best</Badge>}
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          ETA ~{option.etaMin} min • {option.vehicleType}
          {option.capacity ? ` • ${option.capacity} seats` : ''}
        </div>
        {option.details && <div style={{ fontSize: 11, color: '#888' }}>{option.details}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#00C853' }}>{currency} {fmt(option.price)}</div>
        <div style={{ fontSize: 11, color: '#999' }}>Fare estimate</div>
      </div>
    </button>
  );
}
