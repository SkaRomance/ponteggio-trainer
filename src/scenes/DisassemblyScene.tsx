import { useState, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_TEXT = '#0a0a0a';
const MARS_MUTED = '#555555';
const MARS_BORDER = '#d1cdc7';
const MARS_FONT = 'Inter';

const panelShellStyle: CSSProperties = {
  width: 'min(400px, 90vw)',
  padding: '0.75rem',
  background: 'rgba(10,10,10,0.18)',
  borderRadius: '28px',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 20px 60px rgba(10,10,10,0.18)',
};

const panelCardStyle: CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${MARS_BORDER}`,
  borderRadius: '22px',
  padding: '1.5rem',
  color: MARS_TEXT,
  fontFamily: 'Inter, sans-serif',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
};

export default function DisassemblyScene() {
  const { addScore, addError, nextPhase, unlockPhase, isHooked, assembledItems, pushNotice } = useGameStore();
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
      pushNotice({
        severity: 'warning',
        title: 'Ordine di smontaggio errato',
        message: 'Procedi dall’alto verso il basso seguendo l’ordine inverso rispetto al montaggio.',
        phase: 'disassembly',
      });
      return;
    }

    if (avatarPosition.y > 1.8 && !isHooked) {
      addError({
        code: 'UNSAFE_DISASSEMBLY',
        severity: 'critical',
        messageKey: 'error.unsafeDisassembly',
        phase: 'disassembly'
      });
      pushNotice({
        severity: 'error',
        title: 'Smontaggio non sicuro',
        message: 'In quota devi mantenere il cordino ancorato prima di rimuovere gli elementi.',
        phase: 'disassembly',
      });
      return;
    }

    setRemovedItems([...removedItems, id]);
    addScore(100);

    if (removedItems.length + 1 === assembledItems.length) {
      pushNotice({
        severity: 'success',
        title: 'Smontaggio completato',
        message: 'La struttura e stata rimossa in sicurezza. Passaggio al report finale.',
        phase: 'disassembly',
      });
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
            <Text position={[0, 1, 0]} fontSize={0.15} color={MARS_ACCENT} font={MARS_FONT}>CLICCA PER SMONTARE</Text>
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
        <div style={panelShellStyle}>
          <div style={panelCardStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                PROCEDURA Pi.M.U.S.
              </span>
              <h2 style={{ margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '1.7rem', fontWeight: 700, color: MARS_PRIMARY }}>
                Smontaggio sicuro
              </h2>
            </div>
            <p style={{ fontSize: '0.95rem', color: MARS_MUTED, margin: '0 0 1.25rem 0', lineHeight: 1.55 }}>
              Esegui la procedura inversa rispettando gli ancoraggi in quota e mantenendo la rimozione dall&apos;alto verso il basso.
            </p>
            <div style={{ padding: '1rem 1.1rem', borderRadius: '18px', background: '#f5f2ed', border: `1px solid ${MARS_BORDER}` }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                Elementi rimanenti
              </span>
              <strong style={{ fontSize: '1.45rem', color: MARS_PRIMARY }}>
                {assembledItems.length - removedItems.length}
              </strong>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
