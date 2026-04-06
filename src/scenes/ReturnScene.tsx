import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

export default function ReturnScene() {
  const { totalScore, errors, resetGame } = useGameStore();
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 5));

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Camion pronto per il ritorno */}
      <group position={[0, 0, -5]}>
        <Box args={[8, 1, 10]}>
          <meshStandardMaterial color="#333" />
        </Box>
        <Box args={[4, 4, 3]} position={[0, 2, -6]}>
          <meshStandardMaterial color="#222" />
        </Box>
        <Text position={[0, 5, -6]} fontSize={0.5} color="#ffcc00">MEZZO DI RITORNO PRONTO</Text>
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html center position={[0, 5, 0]}>
        <div style={{ 
          background: 'var(--mars-black)', 
          color: 'white', 
          padding: '3rem', 
          border: '4px solid var(--mars-yellow)',
          fontFamily: 'Space Grotesk',
          width: '500px',
          textAlign: 'center',
          pointerEvents: 'auto'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--mars-yellow)', marginBottom: '1rem' }}>
            REPORT FINALE CORSO
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ border: '1px solid var(--mars-iron)', padding: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--mars-iron)' }}>PUNTEGGIO TOTALE</span>
              <div style={{ fontSize: '2rem', fontWeight: 900 }}>{totalScore}</div>
            </div>
            <div style={{ border: '1px solid var(--danger-red)', padding: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--danger-red)' }}>INFRAZIONI SICUREZZA</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger-red)' }}>{errors.length}</div>
            </div>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '2rem', maxHeight: '150px', overflowY: 'auto', fontSize: '0.7rem' }}>
            <h4 style={{ color: 'var(--mars-yellow)' }}>DETTAGLIO ERRORI:</h4>
            {errors.length === 0 ? (
              <p style={{ color: 'green' }}>✓ NESSUN ERRORE RILEVATO. OTTIMA CONDOTTA.</p>
            ) : (
              errors.map((e, i) => (
                <div key={i} style={{ borderBottom: '1px solid #333', padding: '0.2rem 0' }}>
                  • {e.code}: {e.phase.toUpperCase()}
                </div>
              ))
            )}
          </div>

          <button 
            onClick={resetGame}
            style={{ 
              width: '100%', background: 'var(--mars-yellow)', 
              color: 'black', border: 'none', padding: '1rem', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer'
            }}
          >
            TORNA AL MENU PRINCIPALE
          </button>
        </div>
      </Html>
    </group>
  );
}
