import React from 'react';

interface Point { x: number; y: number; label?: string }
interface ZoneMapProps {
  origin?: string;
  destination?: string;
  points?: Point[];
  height?: number;
  showRoute?: boolean;
}

export function ZoneMap({ origin, destination, points = [], height = 280, showRoute = true }: ZoneMapProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = React.useState('0 0 320 280');

  React.useEffect(() => {
    if (points.length >= 2) {
      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      const pad = 20;
      setViewBox(`${minX - pad} ${minY - pad} ${Math.max(120, maxX - minX + pad * 2)} ${Math.max(120, maxY - minY + pad * 2)}`);
    } else {
      setViewBox('0 0 320 280');
    }
  }, [points]);

  const p = points;
  return (
    <div style={{ background: '#f1f8f4', borderRadius: 12, overflow: 'hidden', height }}>
      <svg ref={svgRef} viewBox={viewBox} width="100%" height="100%" style={{ background: 'radial-gradient(circle at 50% 30%, #f9fffb, #f1f8f4)' }}>
        {showRoute && p.length >= 2 && (
          <polyline
            points={p.map(pt => `${pt.x},${pt.y}`).join(' ')}
            stroke="#00C853"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.85}
          />
        )}
        {p.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r={8} fill={i === 0 ? '#4CAF50' : i === p.length - 1 ? '#FF5722' : '#00E676'} stroke="#fff" strokeWidth="2" />
            {pt.label && (
              <text x={pt.x} y={pt.y - 12} fontSize="10" textAnchor="middle" fill="#2e7d32" style={{ fontWeight: 600 }}>
                {pt.label}
              </text>
            )}
          </g>
        ))}
        {origin && p.length > 0 && <text x={p[0]?.x || 10} y={(p[0]?.y || 10) + 20} fontSize="9" fill="#555">Kuanzia: {origin}</text>}
        {destination && p.length > 1 && <text x={p[p.length - 1]?.x || 10} y={(p[p.length - 1]?.y || 10) + 20} fontSize="9" fill="#555">Kufika: {destination}</text>}
      </svg>
    </div>
  );
}
