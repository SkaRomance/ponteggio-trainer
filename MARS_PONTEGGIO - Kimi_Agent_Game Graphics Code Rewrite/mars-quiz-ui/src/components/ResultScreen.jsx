import React from 'react';

/* ResultScreen — Schermata punteggio finale con riepilogo */
export default function ResultScreen({ score, total, onRetry, onHome }) {
  const pct = Math.round((score / total) * 100);
  const isPass = pct >= 80;

  return (
    <div
      className="mars-animate-fade-in-up"
      style={{
        minHeight: 'calc(100vh - var(--header-height))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        background: 'linear-gradient(180deg, var(--mars-cream) 0%, var(--mars-light-cream) 100%)',
      }}
    >
      <div className="mars-container" style={{ maxWidth: 560, textAlign: 'center' }}>
        {/* Score circle */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            backgroundColor: isPass ? 'var(--mars-green-pale)' : '#fee2e2',
            border: `4px solid ${isPass ? 'var(--mars-green)' : 'var(--safety-red)'}`,
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto var(--space-8)',
          }}
        >
          <div>
            <div
              className="mars-number"
              style={{
                fontSize: '3rem',
                color: isPass ? 'var(--mars-green)' : 'var(--safety-red)',
              }}
            >
              {pct}%
            </div>
            <div className="mars-label" style={{ marginTop: 'var(--space-1)' }}>
              {score}/{total} CORRETTE
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="mars-heading-section" style={{ marginBottom: 'var(--space-4)' }}>
          {isPass ? 'Ottimo lavoro!' : 'Da rivedere qualche concetto.'}
        </h2>
        <p className="mars-body" style={{ marginBottom: 'var(--space-8)' }}>
          {isPass
            ? 'Hai dimostrato di conoscere bene le normative sui ponteggi e la sicurezza sul lavoro.'
            : 'Ti consigliamo di ripassare le sezioni su DPI e segnaletica di sicurezza prima di riprovare.'}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="mars-btn mars-btn-primary" onClick={onRetry}>
            Riprova Quiz
          </button>
          <button className="mars-btn mars-btn-secondary" onClick={onHome}>
            Torna all'Indice
          </button>
        </div>

        {/* Certification note */}
        {isPass && (
          <div
            className="mars-card mars-animate-fade-in-up mars-stagger-2"
            style={{ marginTop: 'var(--space-8)', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mars-green)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--mars-white)',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="mars-heading-card" style={{ fontSize: '1rem' }}>Attestato completamento</div>
                <div className="mars-label" style={{ fontSize: '0.65rem', marginTop: 2 }}>VALIDO 12 MESI</div>
              </div>
            </div>
            <p className="mars-body" style={{ fontSize: '0.875rem', color: 'var(--mars-text-secondary)' }}>
              Scarica il tuo attestato di formazione sulla sicurezza ponteggi. Riconosciuto ai sensi del D.Lgs. 81/08.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
