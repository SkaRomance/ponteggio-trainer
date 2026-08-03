import React from 'react';

/* HeroScreen — Landing page del quiz con stile Mars Compliance */
export default function HeroScreen({ onStart, stats = [] }) {
  return (
    <div
      className="mars-animate-fade-in-up"
      style={{
        minHeight: 'calc(100vh - var(--header-height))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        background: 'linear-gradient(180deg, var(--mars-cream) 0%, var(--mars-light-cream) 100%)',
      }}
    >
      <div className="mars-container mars-container-wide" style={{ maxWidth: 720 }}>
        {/* Badge */}
        <div
          className="mars-badge"
          style={{ marginBottom: 'var(--space-6)', fontSize: '0.8rem', padding: 'var(--space-2) var(--space-4)' }}
        >
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--mars-green)' }} />
          PONTEGGIO TRAINER
        </div>

        {/* Title */}
        <h1 className="mars-heading-hero" style={{ marginBottom: 'var(--space-4)' }}>
          La sicurezza si impara
          <br />
          <span style={{ color: 'var(--mars-green)' }}>giocando.</span>
        </h1>

        {/* Subtitle */}
        <p className="mars-body" style={{ marginBottom: 'var(--space-8)', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          Un quiz interattivo per testare le tue conoscenze su ponteggi,
          DPI e sicurezza nei luoghi di lavoro. Corretto, veloce, conforme.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-12)' }}>
          <button className="mars-btn mars-btn-primary" onClick={onStart}>
            Inizia il Quiz
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 4 }}>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="mars-btn mars-btn-secondary">
            Vedi Regolamento
          </button>
        </div>

        {/* Stats row */}
        {stats.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 'var(--space-6)',
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            {stats.map((s, i) => (
              <div key={i} className="mars-animate-fade-in-up" style={{ animationDelay: `${0.3 + i * 0.1}s` }}>
                <div className="mars-number">{s.value}</div>
                <div className="mars-label" style={{ marginTop: 'var(--space-2)', color: 'var(--mars-text-secondary)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
