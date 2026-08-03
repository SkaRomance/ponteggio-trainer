import React from 'react';

/* SafetyBadge — Badge colorato per oggetti reali di sicurezza */
export default function SafetyBadge({ type, children }) {
  const styles = {
    danger: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', icon: '🔴' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24', icon: '⚠️' },
    mandatory: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', icon: '🔵' },
    safe: { bg: '#dcfce7', text: '#166534', border: '#86efac', icon: '✅' },
    info: { bg: 'var(--mars-green-pale)', text: 'var(--mars-green)', border: 'var(--mars-green)', icon: 'ℹ️' },
  };

  const s = styles[type] || styles.info;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 700,
        fontSize: '0.75rem',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        padding: 'var(--space-1) var(--space-3)',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      <span aria-hidden>{s.icon}</span>
      {children}
    </span>
  );
}
