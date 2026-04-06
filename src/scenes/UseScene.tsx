import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

const ANOMALIES = [
  { id: 'missing_toe_board', label: 'TAVOLA FERMAPREDE MANCANTE', pos: [-4.5, 2.5, -2] },
  { id: 'loose_clamp', label: 'MORSETTO STRUTTURALE ALLENTATO', pos: [4.5, 4.5, -2] },
  { id: 'overload', label: 'SOVRACCARICO OLTRE 300KG/M2', pos: [0, 4.5, -2] },
  { id: 'missing_rail', label: 'PARAPETTO INTERMEDIO MANCANTE', pos: [1.5, 6.5, -2] },
];

export default function UseScene() {
  const { addScore, addError, nextPhase, unlockPhase, isHooked } = useGameStore();
  const [identified, setIdentified] = useState<string[]>([]);
  const [cartelloPosto, setCartelloPosto] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));

  const handleIdentify = (id: string) => {
    if (identified.includes(id)) return;
    
    if (avatarPosition.y > 1.8 && !isHooked) {
      addError({
        code: 'INSPECTION_UNSAFE',
        severity: 'high',
        messageKey: 'error.unsafeInspection',
        phase: 'use'
      });
      alert("ATTENZIONE: ISPEZIONE IN QUOTA SENZA ANCORAGGIO. INFRAZIONE RILEVATA.");
      return;
    }

    setIdentified([...identified, id]);
    addScore(150);
  };

  const handleFinish = () => {
    if (!cartelloPosto) {
      addError({
        code: 'MISSING_SIGNAGE',
        severity: 'medium',
        messageKey: 'error.missingSignage',
        phase: 'use'
      });
      alert("ERRORE: MANCA IL CARTELLO DI AGIBILITÀ (SCHEMA DI MONTAGGIO/LIBRETTO).");
      return;
    }

    if (identified.length < ANOMALIES.length) {
      alert("VERIFICA INCOMPLETA: CI SONO ANCORA CRITICITÀ NON RILEVATE.");
      return;
    }

    alert("ISPEZIONE DI CONFORMITÀ COMPLETATA.");
    unlockPhase('disassembly');
    nextPhase();
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Struttura Ponteggio Finita */}
      <Box args={[12, 10, 2]} position={[0, 5, -2]}>
        <meshStandardMaterial color="#111" wireframe />
      </Box>

      {/* Anomalie */}
      {ANOMALIES.map((anomaly) => (
        <group key={anomaly.id} position={anomaly.pos as [number, number, number]} onClick={() => handleIdentify(anomaly.id)}>
          <mesh>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial 
              color={identified.includes(anomaly.id) ? "#00ff00" : "#ff0000"} 
              emissive={identified.includes(anomaly.id) ? "#00ff00" : "#ff0000"}
              emissiveIntensity={0.8}
            />
          </mesh>
          {!identified.includes(anomaly.id) && (
            <Text position={[0, 0.8, 0]} fontSize={0.2} color="#ff0000" font="Space Grotesk">ANOMALIA</Text>
          )}
        </group>
      ))}

      {/* Cartello Agibilità */}
      <group position={[-6, 1.5, -1]} onClick={() => setCartelloPosto(true)}>
        <Box args={[0.8, 1, 0.1]}>
          <meshStandardMaterial color={cartelloPosto ? "white" : "#222"} />
        </Box>
        <Text position={[0, 0, 0.11]} fontSize={0.12} color={cartelloPosto ? "black" : "white"} font="Space Grotesk" fontWeight={900} textAlign="center">
          {cartelloPosto ? "PONTEGGIO\nAGIBILE" : "AFFIGGI\nCARTELLO"}
        </Text>
      </group>

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Html position={[-12, 10, 0]}>
        <div style={{ 
          background: 'rgba(0,0,0,0.95)', 
          color: '#ffcc00', 
          padding: '2rem', 
          border: '4px solid #ffcc00',
          fontFamily: 'Space Grotesk',
          width: '400px'
        }}>
          <h2 style={{ margin: '0 0 1rem 0', fontWeight: 900 }}>VERIFICA D'USO</h2>
          <p style={{ fontSize: '0.9rem', color: 'white', marginBottom: '1.5rem' }}>
            ISPEZIONA LA STRUTTURA FINITA. RILEVA LE INFRAZIONI E AUTORIZZA L'ACCESSO.
          </p>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            ANOMALIE RILEVATE: {identified.length} / {ANOMALIES.length}
          </div>
          <button 
            onClick={handleFinish}
            style={{ 
              marginTop: '2rem', width: '100%', background: '#ffcc00', 
              color: 'black', border: 'none', padding: '1rem', fontWeight: 900, cursor: 'pointer',
              fontSize: '1.1rem'
            }}
          >
            VALIDA STRUTTURA
          </button>
        </div>
      </Html>
    </group>
  );
}
