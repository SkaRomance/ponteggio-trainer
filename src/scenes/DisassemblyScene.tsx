import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

export default function DisassemblyScene() {
  const { addScore, addError, nextPhase, unlockPhase, isHooked, assembledItems } = useGameStore();
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));

  const handleRemove = (id: string, index: number) => {
    // Regola Pi.M.U.S.: Smontaggio dall'alto verso il basso (ordine inverso rispetto a assembledItems)
    const currentRemainingCount = assembledItems.length - removedItems.length;
    // In questo modello semplificato, assumiamo che l'ultimo inserito sia il più in alto
    const isTopItem = (assembledItems.length - index) === currentRemainingCount;
    
    if (!isTopItem) {
      addError({
        code: 'DISASSEMBLY_SEQUENCE_ERROR',
        severity: 'high',
        messageKey: 'error.disassemblySequence',
        phase: 'disassembly'
      });
      alert("ERRORE Pi.M.U.S.: PROCEDERE ALLO SMONTAGGIO DALL'ALTO VERSO IL BASSO.");
      return;
    }

    if (avatarPosition.y > 1.8 && !isHooked) {
      addError({
        code: 'UNSAFE_DISASSEMBLY',
        severity: 'critical',
        messageKey: 'error.unsafeDisassembly',
        phase: 'disassembly'
      });
      alert("ERRORE CRITICO: SMONTAGGIO IN QUOTA SENZA ANCORAGGIO.");
      return;
    }

    setRemovedItems([...removedItems, id]);
    addScore(100);

    if (removedItems.length + 1 === assembledItems.length) {
      alert("SMONTAGGIO COMPLETATO IN SICUREZZA.");
      unlockPhase('return');
      nextPhase();
    }
  };

  return (
    <group>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Rendering oggetti da smontare */}
      {assembledItems.map((id, index) => {
        const isRemoved = removedItems.includes(id);
        if (isRemoved) return null;

        return (
          <group key={id} position={[ (index % 4) * 3 - 4.5, 2, -2]} onClick={() => handleRemove(id, index)}>
            <Box args={[1.5, 1.5, 1.5]}>
              <meshStandardMaterial color="#ffcc00" metalness={0.8} />
            </Box>
            <Text position={[0, 1, 0]} fontSize={0.15} color="white" font="Space Grotesk">CLICCA PER SMONTARE</Text>
          </group>
        );
      })}

      {/* Pezzi a terra */}
      {removedItems.map((id, index) => (
        <group key={`ground-${id}`} position={[index * 1.5 - 8, 0.1, 4]}>
          <Box args={[1.2, 0.2, 1.2]}>
            <meshStandardMaterial color="#333" />
          </Box>
        </group>
      ))}

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
          <h2 style={{ margin: '0 0 1rem 0', fontWeight: 900 }}>SMONTAGGIO SICURO</h2>
          <p style={{ fontSize: '0.9rem', color: 'white', marginBottom: '1.5rem' }}>
            ESEGUI LA PROCEDURA INVERSA RISPETTANDO GLI ANCORAGGI IN QUOTA.
          </p>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            ELEMENTI RIMANENTI: {assembledItems.length - removedItems.length}
          </div>
        </div>
      </Html>
    </group>
  );
}
