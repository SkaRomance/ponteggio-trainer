import { useGameStore } from '../../stores/gameStore';
import { Trophy, ArrowRight, ShoppingCart, RefreshCcw } from 'lucide-react';

export default function DemoEndOverlay() {
  const { totalScore, errors, resetGame } = useGameStore();
  const isDemoMode = import.meta.env.VITE_APP_MODE === 'demo';

  if (!isDemoMode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', padding: '1rem' }}>
      <div className="bg-black border-4 border-mars-yellow p-12 text-center relative max-w-2xl w-full" style={{ background: 'var(--mars-black)', border: '4px solid var(--mars-yellow)', padding: '3rem', textAlign: 'center', position: 'relative', maxWidth: '42rem', width: '100%' }}>
        
        <div className="relative">
          <div className="w-20 h-20 bg-mars-yellow flex items-center justify-center mx-auto mb-6" style={{ width: '5rem', height: '5rem', background: 'var(--mars-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <Trophy color="black" size={40} />
          </div>

          <h2 className="text-3xl font-black text-mars-yellow mb-2" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--mars-yellow)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            DEMO COMPLETATA.
          </h2>
          <p className="text-gray-400 mb-8" style={{ color: '#888', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            FASE DI **ISPEZIONE IN MAGAZZINO** TERMINATA.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ border: '1px solid var(--mars-iron)', padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mars-iron)', marginBottom: '0.5rem' }}>PUNTEGGIO</span>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white' }}>{totalScore}</span>
            </div>
            <div style={{ border: '1px solid var(--danger-red)', padding: '1.5rem', background: 'rgba(255,51,51,0.05)' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--danger-red)', marginBottom: '0.5rem' }}>ERRORI</span>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--danger-red)' }}>{errors.length}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '1rem' }}>
              VUOI AFFRONTARE LE FASI DI **MONTAGGIO, USO E SMONTAGGIO**?
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <a 
                href="https://marscompliance.com/soluzioni" 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: 'var(--mars-yellow)', 
                  color: 'black', 
                  padding: '1rem 2rem', 
                  fontWeight: '900', 
                  textDecoration: 'none',
                  textTransform: 'uppercase'
                }}
              >
                <ShoppingCart size={20} />
                ACQUISTA FULL
                <ArrowRight size={18} />
              </a>

              <button 
                onClick={resetGame}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: 'transparent', 
                  color: 'white', 
                  border: '1px solid white', 
                  padding: '1rem 2rem', 
                  fontWeight: '900', 
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                <RefreshCcw size={20} />
                RIPROVA DEMO
              </button>
            </div>
          </div>

          <p style={{ marginTop: '2rem', fontSize: '0.7rem', color: 'var(--mars-iron)', fontStyle: 'italic' }}>
            * LA VERSIONE COMPLETA INCLUDE L'INTERO CICLO VITA E IL CERTIFICATO FINALE.
          </p>
        </div>
      </div>
    </div>
  );
}
