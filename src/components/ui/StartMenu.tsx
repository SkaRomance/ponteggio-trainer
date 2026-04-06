import { useGameStore } from '../../stores/gameStore';
import type { GamePhase } from '../../stores/gameStore';
import { Lock, Play, ShoppingCart } from 'lucide-react';

export default function StartMenu() {
  const { startGame, accessLevel, isPhaseLocked, setAccessLevel } = useGameStore();

  const phases: { id: GamePhase; label: string; icon: string }[] = [
    { id: 'warehouse', label: 'Magazzino', icon: '📦' },
    { id: 'transport', label: 'Trasporto', icon: '🚛' },
    { id: 'storage', label: 'Stoccaggio', icon: '🏗️' },
    { id: 'assembly', label: 'Montaggio', icon: '🔧' },
    { id: 'use', label: 'Uso', icon: '👷' },
    { id: 'disassembly', label: 'Smontaggio', icon: '🔨' },
    { id: 'return', label: 'Ritorno', icon: '🏭' },
  ];

  const handlePurchase = () => {
    const confirmPurchase = window.confirm("VUOI SBLOCCARE LA VERSIONE COMPLETA DEL CORSO?");
    if (confirmPurchase) {
      setAccessLevel('premium');
    }
  };

  return (
    <div className="start-menu">
      <div className="menu-content">
        <h1 className="menu-title">
          MARS-SAFE<br/>PONTEGGIO
        </h1>
        <p className="menu-subtitle">
          TRAINING PROFESSIONALE / D.LGS 81/08
        </p>
        
        <p className="menu-description">
          SIMULATORE INTERATTIVO PER LA FORMAZIONE SULLA SICUREZZA NEL MONTAGGIO E SMONTAGGIO PONTEGGI. COMPATIBILE CON PROTOCOLLI VR.
        </p>

        <div className="menu-phases-preview">
          <h3 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            STRUTTURA DEL CORSO {accessLevel === 'free' && <span style={{ background: 'var(--mars-yellow)', color: 'black', padding: '2px 8px', fontSize: '0.7rem' }}>DEMO</span>}
          </h3>
          <div className="phases-grid">
            {phases.map((phase) => {
              const locked = isPhaseLocked(phase.id);
              return (
                <div 
                  key={phase.id} 
                  className="phase-item"
                  style={{ 
                    background: locked ? 'transparent' : 'rgba(255,204,0,0.1)',
                    opacity: locked ? 0.3 : 1
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{phase.icon}</span>
                    <span>{phase.label}</span>
                  </span>
                  {locked ? <Lock size={14} /> : <Play size={14} fill="currentColor" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="buttons-container">
          <button 
            className="start-btn" 
            onClick={startGame}
          >
            <Play size={24} fill="black" />
            {accessLevel === 'free' ? 'AVVIA DEMO' : 'INIZIA CORSO'}
          </button>

          {accessLevel === 'free' && (
            <button 
              className="purchase-btn"
              onClick={handlePurchase}
            >
              <ShoppingCart size={24} />
              SBLOCCA FULL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
