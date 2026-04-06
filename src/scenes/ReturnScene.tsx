import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

export default function ReturnScene() {
  const { totalScore, errors, resetGame } = useGameStore();
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));

  return (
    <group>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Camion carico pronto */}
      <group position={[0, 0, -5]}>
        <Box args={[8, 1, 12]}>
          <meshStandardMaterial color="#111" metalness={0.8} />
        </Box>
        <Box args={[4.5, 4, 4]} position={[0, 2, -8]}>
          <meshStandardMaterial color="#111" metalness={0.9} />
        </Box>
        <Text position={[0, 6, -8]} fontSize={0.6} color="#ffcc00" font="Space Grotesk">MEZZO DI RITORNO PRONTO</Text>
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html center position={[0, 5, 0]}>
        <div style={{ 
          background: 'black', 
          color: 'white', 
          padding: '4rem', 
          border: '12px solid #ffcc00',
          fontFamily: 'Space Grotesk',
          width: '700px',
          textAlign: 'center',
          pointerEvents: 'auto',
          boxShadow: '0 0 50px rgba(255,204,0,0.3)'
        }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#ffcc00', marginBottom: '1.5rem', lineHeight: 0.8 }}>
            VALUTAZIONE<br/>FINALE
          </h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
            <div style={{ border: '2px solid #333', padding: '2rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>COMPETENZA ACQUISITA</span>
              <div style={{ fontSize: '3rem', fontWeight: 900 }}>{totalScore}</div>
            </div>
            <div style={{ border: '2px solid #ff0000', padding: '2rem', background: 'rgba(255,0,0,0.05)' }}>
              <span style={{ fontSize: '0.9rem', color: '#ff0000' }}>INFRAZIONI RILEVATE</span>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ff0000' }}>{errors.length}</div>
            </div>
          </div>

          <div style={{ textAlign: 'left', marginBottom: '3rem', maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem', padding: '1.5rem', background: '#0a0a0a', border: '1px solid #222' }}>
            <h4 style={{ color: '#ffcc00', marginBottom: '1rem', fontWeight: 900 }}>LOG DEGLI ERRORI:</h4>
            {errors.length === 0 ? (
              <p style={{ color: '#00ff00', fontWeight: 700 }}>✓ CONDOTTA ESEMPLARE. NESSUNA INFRAZIONE AI PROTOCOLLI.</p>
            ) : (
              errors.map((e, i) => (
                <div key={i} style={{ borderBottom: '1px solid #222', padding: '0.5rem 0', color: '#888' }}>
                  [STAGE: {e.phase.toUpperCase()}] {'>'} {e.code}: ERRORE PROCEDURALE
                </div>
              ))
            )}
          </div>

          <button 
            onClick={resetGame}
            style={{ 
              width: '100%', background: '#ffcc00', 
              color: 'black', border: 'none', padding: '1.5rem', fontSize: '1.5rem', fontWeight: 900, cursor: 'pointer',
              boxShadow: '8px 8px 0px black'
            }}
          >
            FINE ADDESTRAMENTO
          </button>
        </div>
      </Html>
    </group>
  );
}
