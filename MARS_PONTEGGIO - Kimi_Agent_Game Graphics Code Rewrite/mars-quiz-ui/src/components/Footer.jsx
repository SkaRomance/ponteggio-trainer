import React from 'react';

/* Footer — Mars Compliance styled footer */
export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--mars-dark)',
        color: '#9ca3af',
        padding: 'var(--space-8) var(--space-4)',
        marginTop: 'auto',
      }}
    >
      <div
        className="mars-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <img src="/logo-mars-white.svg" alt="MARS" style={{ height: 28 }} />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '0.05em',
              color: 'var(--mars-white)',
            }}
          >
            MARS
          </span>
        </div>

        <p style={{ fontSize: '0.875rem', maxWidth: 480, lineHeight: 1.5 }}>
          The Compliance Workspace — Consulenza reale. Strumenti digitali proprietari. Compliance sotto controllo.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <a href="https://marscompliance.com/piattaforma" style={{ color: '#9ca3af', transition: 'color var(--transition-fast)' }} onMouseEnter={e => e.target.style.color = 'var(--mars-green-pale)'} onMouseLeave={e => e.target.style.color = '#9ca3af'}>
            Piattaforma
          </a>
          <a href="https://marscompliance.com/formazione" style={{ color: '#9ca3af', transition: 'color var(--transition-fast)' }} onMouseEnter={e => e.target.style.color = 'var(--mars-green-pale)'} onMouseLeave={e => e.target.style.color = '#9ca3af'}>
            Formazione
          </a>
          <a href="https://marscompliance.com/contatti" style={{ color: '#9ca3af', transition: 'color var(--transition-fast)' }} onMouseEnter={e => e.target.style.color = 'var(--mars-green-pale)'} onMouseLeave={e => e.target.style.color = '#9ca3af'}>
            Contatti
          </a>
        </div>

        <div className="mars-label" style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 'var(--space-2)' }}>
          © {new Date().getFullYear()} MARS COMPLIANCE · GDPR COMPLIANT & SECURE
        </div>
      </div>
    </footer>
  );
}
