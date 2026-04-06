import { useGameStore } from '../../stores/gameStore';
import type { GamePhase } from '../../stores/gameStore';
import { Lock, ShoppingCart } from 'lucide-react';

export default function StartMenu() {
  const { startGame, accessLevel, isPhaseLocked, setAccessLevel } = useGameStore();

  const phases: { id: GamePhase; label: string; icon: string }[] = [
    { id: 'warehouse', label: 'AREA ISPEZIONE', icon: '🔍' },
    { id: 'transport', label: 'LOGISTICA TRASPORTO', icon: '🚚' },
    { id: 'storage', label: 'STOCCAGGIO CANTIERE', icon: '🏗️' },
    { id: 'assembly', label: 'MONTAGGIO Pi.M.U.S.', icon: '🛠️' },
    { id: 'use', label: 'ISPEZIONE D\'USO', icon: '👷' },
    { id: 'disassembly', label: 'SMONTAGGIO SICURO', icon: '🧱' },
    { id: 'return', label: 'REPORT FINALE', icon: '📊' },
  ];

  const handlePurchase = () => {
    const confirmPurchase = window.confirm("ATTIVARE LICENZA PREMIUM PER ACCEDERE A TUTTI GLI STAGE?");
    if (confirmPurchase) {
      setAccessLevel('premium');
    }
  };

  return (
    <div className="start-menu">
      <div className="menu-content" style={{ border: '12px solid var(--mars-yellow)', background: 'black', padding: 'clamp(2rem, 5vw, 5rem)', position: 'relative' }}>
        
        {/* Badge Versione */}
        <div style={{ position: 'absolute', top: '-25px', left: '50px', background: 'var(--mars-yellow)', color: 'black', padding: '5px 20px', fontWeight: 900, fontSize: '1.2rem' }}>
          VER. 2.0.4 PROFESSIONAL
        </div>

        <h1 className="menu-title" style={{ fontSize: 'clamp(3rem, 12vw, 7rem)', lineHeight: '0.8', marginBottom: '1.5rem', textAlign: 'left' }}>
          MARS-SAFE<br/>
          <span style={{ WebkitTextStroke: '2px var(--mars-yellow)', color: 'transparent' }}>TRAINER</span>
        </h1>
        
        <p className="menu-subtitle" style={{ color: 'var(--mars-yellow)', fontWeight: '900', marginBottom: '3rem', fontSize: '1.5rem', textAlign: 'left', borderBottom: '4px solid var(--mars-yellow)', display: 'inline-block', paddingBottom: '0.5rem' }}>
          SIMULATORE ADDESTRAMENTO PONTEGGI / D.LGS 81/08
        </p>
        
        <div className="phases-grid" style={{ marginBottom: '4rem', gap: '1rem' }}>
          {phases.map((phase) => {
            const locked = isPhaseLocked(phase.id);
            return (
              <div 
                key={phase.id} 
                className="phase-item"
                style={{ 
                  background: locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,204,0,0.1)',
                  border: locked ? '1px solid #222' : '2px solid var(--mars-yellow)',
                  opacity: locked ? 0.4 : 1,
                  padding: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{phase.icon}</span>
                  <span style={{ fontWeight: '900', color: locked ? '#666' : 'white' }}>{phase.label}</span>
                </div>
                {locked && <Lock size={18} color="#444" />}
              </div>
            );
          })}
        </div>

        <div className="buttons-container" style={{ justifyContent: 'flex-start', gap: '2rem' }}>
          <button 
            className="start-btn" 
            onClick={startGame}
            style={{ padding: '2rem 5rem', fontSize: '2rem', boxShadow: '15px 15px 0px rgba(255,204,0,0.2)' }}
          >
            {accessLevel === 'free' ? 'AVVIA DEMO' : 'AVVIA SIMULAZIONE'}
          </button>

          {accessLevel === 'free' && (
            <button 
              className="purchase-btn"
              onClick={handlePurchase}
              style={{ border: '4px solid white', fontSize: '1.5rem', padding: '1.5rem 3rem' }}
            >
              <ShoppingCart size={30} style={{ marginRight: '1rem' }} />
              SBLOCCA TUTTI GLI STAGE
            </button>
          )}
        </div>

        <div style={{ marginTop: '4rem', color: '#444', fontSize: '0.8rem', textAlign: 'left' }}>
          SISTEMA DI VERIFICA COMPLIANCE CERTIFICATO DA MARS COMPLIANCE S.R.L. <br/>
          TUTTI I DIRITTI RISERVATI © 2026
        </div>
      </div>
    </div>
  );
}
