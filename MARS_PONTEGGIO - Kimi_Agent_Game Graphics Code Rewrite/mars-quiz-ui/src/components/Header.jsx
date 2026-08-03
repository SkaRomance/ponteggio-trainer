import React from 'react';
import './styles/variables.css';
import './styles/global.css';

/* Header — Mars Compliance branded navigation */
export default function Header({ variant = 'light' }) {
  const isDark = variant === 'dark';

  return (
    <header
      className="mars-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
        backgroundColor: isDark ? 'var(--mars-green)' : 'rgba(245,242,237,0.9)',
        backdropFilter: isDark ? 'none' : 'blur(8px)',
        borderBottom: isDark ? 'none' : '1px solid var(--mars-border)',
        transition: 'background-color var(--transition-base)',
      }}
    >
      {/* Logo area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <img
          src="/logo-mars.svg"
          alt="MARS Logo"
          style={{ height: 32, width: 'auto' }}
        />
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 800,
            fontSize: '1.125rem',
            letterSpacing: '0.05em',
            color: isDark ? 'var(--mars-white)' : 'var(--mars-dark)',
          }}
        >
          MARS
        </span>
      </div>

      {/* Right meta */}
      <span
        className="mars-label"
        style={{
          color: isDark ? 'rgba(255,255,255,0.7)' : 'var(--mars-text-secondary)',
          fontSize: '0.7rem',
        }}
      >
        THE COMPLIANCE WORKSPACE
      </span>
    </header>
  );
}
