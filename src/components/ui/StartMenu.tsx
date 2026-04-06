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
      <div className="menu-content" style={{ border: '4px solid var(--mars-yellow)', background: 'var(--mars-black)', padding: '4rem' }}>
        <h1 className="menu-title" style={{ fontSize: '4.5rem', lineHeight: '0.9', marginBottom: '1rem' }}>
          MARS-SAFE<br/>PONTEGGIO
        </h1>
        <p className="menu-subtitle" style={{ color: 'var(--mars-yellow)', fontWeight: '800', marginBottom: '2rem' }}>
          TRAINING PROFESSIONALE / D.LGS 81/08
        </p>
        
        <p className="menu-description" style={{ color: '#888', marginBottom: '3rem', maxWidth: '600px', textAlign: 'center' }}>
          SIMULATORE INTERATTIVO PER LA FORMAZIONE SULLA SICUREZZA NEL MONTAGGIO E SMONTAGGIO PONTEGGI. COMPATIBILE CON PROTOCOLLI VR.
        </p>

        <div className="menu-phases-preview" style={{ border: '1px solid var(--mars-iron)', background: 'rgba(255,255,255,0.02)', padding: '2rem' }}>
          <h3 style={{ color: 'white', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            STRUTTURA DEL CORSO {accessLevel === 'free' && <span style={{ background: 'var(--mars-yellow)', color: 'black', padding: '2px 8px', fontSize: '0.7rem' }}>DEMO</span>}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {phases.map((phase) => {
              const locked = isPhaseLocked(phase.id);
              return (
                <div 
                  key={phase.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '0.75rem', 
                    border: '1px solid var(--mars-iron)',
                    background: locked ? 'transparent' : 'rgba(255,204,0,0.1)',
                    opacity: locked ? 0.3 : 1
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{phase.icon}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>{phase.label}</span>
                  </span>
                  {locked ? <Lock size={14} /> : <Play size={14} fill="currentColor" />}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', justifyContent: 'center' }}>
          <button 
            className="start-btn" 
            onClick={startGame}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
          >
            <Play size={24} fill="black" />
            {accessLevel === 'free' ? 'AVVIA DEMO' : 'INIZIA CORSO'}
          </button>

          {accessLevel === 'free' && (
            <button 
              onClick={handlePurchase}
              style={{ 
                background: 'transparent', 
                color: 'white', 
                border: '2px solid white', 
                padding: '1rem 2rem', 
                fontWeight: '900', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
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
