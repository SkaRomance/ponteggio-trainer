import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html, Float } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

export default function DisassemblyScene() {
  const { addScore, addError, nextPhase, unlockPhase, isHooked, assembledItems } = useGameStore();
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 5));

  const handleRemove = (id: string, index: number) => {
    // Regola Pi.M.U.S.: Smontaggio dall'alto verso il basso
    const isTopItem = index === (assembledItems.length - removedItems.length - 1);
    
    if (!isTopItem) {
      addError({
        code: 'DISASSEMBLY_SEQUENCE_ERROR',
        severity: 'high',
        messageKey: 'error.disassemblySequence',
        phase: 'disassembly'
      });
      alert("ERRORE Pi.M.U.S.: Devi smontare partendo dall'elemento più in alto!");
      return;
    }

    if (avatarPosition.y > 1.5 && !isHooked) {
      addError({
        code: 'UNSAFE_DISASSEMBLY',
        severity: 'critical',
        messageKey: 'error.unsafeDisassembly',
        phase: 'disassembly'
      });
      alert("ERRORE CRITICO: Stai smontando elementi in quota senza ancoraggio!");
      return;
    }

    setRemovedItems([...removedItems, id]);
    addScore(50);

    if (removedItems.length + 1 === assembledItems.length) {
      alert("SMONTAGGIO COMPLETATO. TUTTI I PEZZI SONO A TERRA.");
      unlockPhase('return');
      nextPhase();
    }
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {assembledItems.map((id, index) => {
        const isRemoved = removedItems.includes(id);
        if (isRemoved) return null;

        return (
          <group key={id} position={[index * 0.5 - 2, index * 0.5 + 0.5, -2]} onClick={() => handleRemove(id, index)}>
            <Box args={[1, 1, 1]}>
              <meshStandardMaterial color="#ffcc00" />
            </Box>
            <Text position={[0, 0.6, 0]} fontSize={0.15} color="white">CLICCA PER SMONTARE</Text>
          </group>
        );
      })}

      {removedItems.map((id, index) => (
        <Float key={`ground-${id}`} speed={0} rotationIntensity={0}>
          <Box args={[1, 0.2, 1]} position={[index * 1.2 - 5, 0.1, 2]}>
            <meshStandardMaterial color="#444" />
          </Box>
        </Float>
      ))}

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
          <h4 style={{ margin: '0 0 1rem 0', fontWeight: 900 }}>FASE 6: SMONTAGGIO</h4>
          <p style={{ fontSize: '0.8rem' }}>SMONTA IL PONTEGGIO DALL'ALTO VERSO IL BASSO RISPETTANDO LE NORME DPI.</p>
          <div style={{ marginTop: '1rem' }}>
            PEZZI RIMANENTI: {assembledItems.length - removedItems.length}
          </div>
        </div>
      </Html>
    </group>
  );
}
