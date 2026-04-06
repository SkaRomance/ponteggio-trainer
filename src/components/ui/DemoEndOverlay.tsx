import { useGameStore } from '../../stores/gameStore';
import { Trophy } from 'lucide-react';

export default function DemoEndOverlay() {
  const { totalScore, errors, resetGame } = useGameStore();
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';

  if (!isDemoMode) return null;

  return (
    <div className="overlay-container">
      <div className="overlay-content" style={{ border: '8px solid var(--mars-yellow)', maxWidth: '800px' }}>
        
        <div className="relative">
          <div style={{ width: '6rem', height: '6rem', background: 'var(--mars-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 0 20px var(--mars-yellow)' }}>
            <Trophy color="black" size={48} />
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 900, color: 'var(--mars-yellow)', marginBottom: '1rem', lineHeight: 0.9 }}>
            SESSIONE<br/>COMPLETATA
          </h2>
          <p style={{ color: '#888', marginBottom: '3rem', fontSize: '0.9rem', letterSpacing: '3px' }}>
            VERIFICA MAGAZZINO E LOGISTICA TERMINATA.
          </p>

          <div className="stats-grid" style={{ gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ border: '2px solid var(--mars-iron)', padding: '2rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>PUNTEGGIO TOTALE</span>
              <span style={{ fontSize: '3.5rem', fontWeight: 900, color: 'white' }}>{totalScore}</span>
            </div>
            <div style={{ border: '2px solid var(--danger-red)', padding: '2rem', background: 'rgba(255,51,51,0.05)' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--danger-red)', marginBottom: '1rem' }}>INFRAZIONI</span>
              <span style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--danger-red)' }}>{errors.length}</span>
            </div>
          </div>

          <div style={{ background: 'var(--mars-iron)', padding: '2rem', marginBottom: '3rem' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem' }}>
              PROCEDI ALLE FASI DI **MONTAGGIO E USO**?
            </p>
            
            <div className="buttons-container" style={{ gap: '1.5rem' }}>
              <a 
                href="https://marscompliance.com/soluzioni" 
                target="_blank"
                rel="noopener noreferrer"
                className="start-btn"
                style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}
              >
                SBLOCCA CORSO COMPLETO
              </a>

              <button 
                onClick={resetGame}
                className="purchase-btn"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                RIPETI ADDESTRAMENTO
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.7rem', color: '#444', fontStyle: 'italic' }}>
            * CONFORME AI PROTOCOLLI DI SICUREZZA MARS COMPLIANCE.
          </p>
        </div>
      </div>
    </div>
  );
}
