import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

// Anomalie da identificare (Logica Sally UX)
const ANOMALIES = [
  { id: 'missing_toe_board', label: 'TAVOLA FERMAPREDE MANCANTE', pos: [-2, 2.5, -2], icon: '🚫' },
  { id: 'loose_clamp', label: 'MORSETTO NON SERRATO', pos: [2, 4.5, -2], icon: '🔧' },
  { id: 'overload', label: 'SOVRACCARICO MATERIALE', pos: [0, 4.2, -2], icon: '⚖️' },
];

export default function UseScene() {
  const { addScore, addError, nextPhase, unlockPhase, isHooked } = useGameStore();
  const [identified, setIdentified] = useState<string[]>([]);
  const [cartelloPosto, setCartelloPosto] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 5));

  const handleIdentify = (id: string) => {
    if (identified.includes(id)) return;
    
    // Controllo sicurezza durante ispezione
    if (avatarPosition.y > 1.5 && !isHooked) {
      addError({
        code: 'INSPECTION_UNSAFE',
        severity: 'high',
        messageKey: 'error.unsafeInspection',
        phase: 'use'
      });
      alert("ATTENZIONE: Non puoi ispezionare punti critici senza essere ancorato!");
      return;
    }

    setIdentified([...identified, id]);
    addScore(100);
  };

  const handleFinish = () => {
    if (!cartelloPosto) {
      addError({
        code: 'MISSING_SIGNAGE',
        severity: 'medium',
        messageKey: 'error.missingSignage',
        phase: 'use'
      });
      alert("ERRORE: Non hai apposto il cartello di AGIBILITÀ del ponteggio!");
      return;
    }

    if (identified.length < ANOMALIES.length) {
      alert("Ci sono ancora anomalie non identificate sul ponteggio!");
      return;
    }

    alert("ISPEZIONE COMPLETATA. PONTEGGIO PRONTO ALL'USO.");
    unlockPhase('disassembly');
    nextPhase();
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* Il Ponteggio Montato (Rappresentazione statica per questa fase) */}
      <Box args={[10, 8, 2]} position={[0, 4, -2]}>
        <meshStandardMaterial color="#333" wireframe />
      </Box>

      {/* Anomalie Clickabili */}
      {ANOMALIES.map((anomaly) => (
        <group key={anomaly.id} position={[anomaly.pos[0], anomaly.pos[1], anomaly.pos[2]]} onClick={() => handleIdentify(anomaly.id)}>
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial 
              color={identified.includes(anomaly.id) ? "green" : "red"} 
              emissive={identified.includes(anomaly.id) ? "green" : "red"}
              emissiveIntensity={0.5}
            />
          </mesh>
          {!identified.includes(anomaly.id) && (
            <Text position={[0, 0.5, 0]} fontSize={0.2} color="red">RIPRISTINA</Text>
          )}
        </group>
      ))}

      {/* Punto affissione cartello */}
      <group position={[-4, 1.5, -1]} onClick={() => setCartelloPosto(true)}>
        <Box args={[0.6, 0.8, 0.1]}>
          <meshStandardMaterial color={cartelloPosto ? "white" : "#444"} />
        </Box>
        {cartelloPosto ? (
          <Text position={[0, 0, 0.1]} fontSize={0.1} color="green" fontWeight="bold">PONTEGGIO<br/>AGIBILE</Text>
        ) : (
          <Text position={[0, 0, 0.1]} fontSize={0.1} color="white">METTI<br/>CARTELLO</Text>
        )}
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html position={[-8, 8, 0]}>
        <div style={{ 
          background: 'rgba(0,0,0,0.8)', 
          color: '#ffcc00', 
          padding: '1.5rem', 
          border: '2px solid #ffcc00',
          fontFamily: 'Space Grotesk',
          width: '300px'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontWeight: 900 }}>FASE 5: USO E ISPEZIONE</h4>
          <p style={{ fontSize: '0.8rem' }}>IDENTIFICA TUTTE LE ANOMALIE E AFFIGGI IL CARTELLO DI AGIBILITÀ.</p>
          <div style={{ marginTop: '1rem' }}>
            ANOMALIE: {identified.length} / {ANOMALIES.length}
          </div>
          <button 
            onClick={handleFinish}
            style={{ 
              marginTop: '1rem', width: '100%', background: '#ffcc00', 
              color: 'black', border: 'none', padding: '0.5rem', fontWeight: 800, cursor: 'pointer'
            }}
          >
            CONFERMA ISPEZIONE
          </button>
        </div>
      </Html>
    </group>
  );
}
