import { useGameStore } from '../../stores/gameStore';
import { Trophy } from 'lucide-react';
import SessionReportActions from './SessionReportActions';

export default function DemoEndOverlay() {
  const { totalScore, errors, resetGame } = useGameStore();
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';
  const hasErrors = errors.length > 0;

  if (!isDemoMode) return null;

  return (
    <div className="overlay-container demo-end-overlay">
      <div className="overlay-content demo-end-content">
        <div className="menu-badge">
          <Trophy size={14} aria-hidden="true" />
          Report demo
        </div>

        <div className={`score-circle${hasErrors ? ' danger' : ''}`} aria-hidden="true">
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
            <div className="menu-stat-value">{hasErrors ? 'Con osservazioni' : 'Conforme'}</div>
            <div className="menu-stat-label">Esito demo</div>
          </div>
        </div>

        <div className="tutorial-panel-footer">
          <SessionReportActions />

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
          Report simulativo esportabile per revisione del docente e allegazione al fascicolo corso.
        </p>
      </div>
    </div>
  );
}
