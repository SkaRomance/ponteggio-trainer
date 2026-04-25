import { useGameStore } from '../../stores/gameStore';
import { Trophy } from 'lucide-react';

export default function DemoEndOverlay() {
  const { totalScore, errors, resetGame } = useGameStore();
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';
  const hasCriticalErrors = errors.length > 0;

  if (!isDemoMode) return null;

  return (
    <div className="overlay-container demo-end-overlay">
      <div className="overlay-content demo-end-content">
        <div className="menu-badge">
          <Trophy size={14} aria-hidden="true" />
          Report demo
        </div>

        <div className={`score-circle${hasCriticalErrors ? ' danger' : ''}`} aria-hidden="true">
          <span className="score-number">{totalScore}</span>
        </div>

        <h2>Sessione completata</h2>
        <p>
          La demo termina dopo la verifica iniziale di magazzino e logistica. Puoi ripetere l'addestramento oppure proseguire con il percorso completo.
        </p>

        <div className="menu-stats" aria-label="Riepilogo della sessione">
          <div>
            <div className="menu-stat-value">{totalScore}</div>
            <div className="menu-stat-label">Punteggio totale</div>
          </div>
          <div>
            <div className="menu-stat-value">{errors.length}</div>
            <div className="menu-stat-label">Infrazioni rilevate</div>
          </div>
          <div>
            <div className="menu-stat-value">{hasCriticalErrors ? 'Da rivedere' : 'Conforme'}</div>
            <div className="menu-stat-label">Esito demo</div>
          </div>
        </div>

        <div className="tutorial-panel-footer">
          <a
            href="https://marscompliance.com/soluzioni"
            target="_blank"
            rel="noopener noreferrer"
            className="start-btn"
          >
            Sblocca il corso completo
          </a>

          <button
            type="button"
            onClick={resetGame}
            className="btn-secondary"
          >
            Ripeti l'addestramento
          </button>
        </div>

        <p className="menu-legal">
          Conforme ai protocolli di sicurezza Mars Compliance.
        </p>
      </div>
    </div>
  );
}
