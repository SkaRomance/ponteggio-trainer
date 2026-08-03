import React from 'react';

/* ProgressBar — Barra avanzamento quiz */
export default function ProgressBar({ current, total }) {
  const pct = Math.min((current / total) * 100, 100);
  return (
    <div style={{ marginBottom: 'var(--space-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <span className="mars-label" style={{ fontSize: '0.65rem' }}>AVANZAMENTO</span>
        <span className="mars-label" style={{ fontSize: '0.65rem' }}>
          {String(current).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div className="mars-progress-track">
        <div className="mars-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
