import { useGameStore } from '../../stores/gameStore';
import type { GamePhase } from '../../stores/gameStore';
import { Lock, ShoppingCart } from 'lucide-react';

export default function StartMenu() {
  const { startGame, accessLevel, isPhaseLocked, setAccessLevel } = useGameStore();

  const phases: { id: GamePhase; label: string; icon: string }[] = [
    { id: 'warehouse', label: 'Ispezione iniziale', icon: '🔍' },
    { id: 'transport', label: 'Trasporto', icon: '🚚' },
    { id: 'storage', label: 'Stoccaggio in cantiere', icon: '🏗️' },
    { id: 'assembly', label: 'Montaggio Pi.M.U.S.', icon: '🛠️' },
    { id: 'use', label: 'Controllo in uso', icon: '👷' },
    { id: 'disassembly', label: 'Smontaggio sicuro', icon: '🧱' },
    { id: 'return', label: 'Report finale', icon: '📊' },
  ];

  const handlePurchase = () => {
    const confirmPurchase = window.confirm('Attivare la licenza premium per accedere a tutte le fasi?');
    if (confirmPurchase) {
      setAccessLevel('premium');
    }
  };

  return (
    <div className="start-menu">
      <div className="menu-content">
        <div className="menu-header-row">
          <img className="mars-logo" src="/logo-mars.png" alt="Mars Compliance" />
          <div className="menu-badge">
            Mars Compliance trainer
          </div>
        </div>

        <h1 className="menu-title">
          Ponteggio <span className="menu-title-accent">Trainer</span>
        </h1>

        <p className="menu-subtitle">
          Simulatore Mars Compliance per la verifica dei componenti, la logistica di cantiere e le procedure di montaggio in sicurezza.
        </p>

        <div className="menu-stats" aria-label="Panoramica del corso">
          <div>
            <div className="menu-stat-value">{phases.length}</div>
            <div className="menu-stat-label">Fasi operative</div>
          </div>
          <div>
            <div className="menu-stat-value">{accessLevel === 'free' ? 'Demo' : 'Premium'}</div>
            <div className="menu-stat-label">Accesso attivo</div>
          </div>
          <div>
            <div className="menu-stat-value">81/08</div>
            <div className="menu-stat-label">Riferimento normativo</div>
          </div>
        </div>

        <ul className="phases-grid" aria-label="Fasi del percorso">
          {phases.map((phase) => {
            const locked = isPhaseLocked(phase.id);
            return (
              <li
                key={phase.id} 
                className="phase-item"
                aria-disabled={locked}
                data-state={locked ? 'locked' : 'available'}
              >
                <div className="phase-item-copy">
                  <span className="phase-item-icon" aria-hidden="true">{phase.icon}</span>
                  <div>
                    <span className="phase-item-title">{phase.label}</span>
                    <span className="phase-item-status">
                      {locked ? 'Disponibile con licenza premium' : 'Inclusa nel percorso attivo'}
                    </span>
                  </div>
                </div>
                {locked ? <Lock size={18} aria-hidden="true" /> : <span className="phase-check" aria-hidden="true">✓</span>}
              </li>
            );
          })}
        </ul>

        <div className="buttons-container">
          <button 
            type="button"
            className="start-btn" 
            onClick={startGame}
          >
            {accessLevel === 'free' ? 'Avvia la demo' : 'Avvia la simulazione'}
          </button>

          {accessLevel === 'free' && (
            <button 
              type="button"
              className="btn-secondary"
              onClick={handlePurchase}
            >
              <ShoppingCart size={18} aria-hidden="true" />
              Sblocca tutte le fasi
            </button>
          )}
        </div>

        <p className="menu-legal">
          Piattaforma dimostrativa Mars Compliance S.r.l. Tutti i diritti riservati © 2026.
        </p>
      </div>
    </div>
  );
}
