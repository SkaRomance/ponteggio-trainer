import { useState, useMemo } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

// Sequenza Operativa Pi.M.U.S. Professionale
const ASSEMBLY_STEPS = [
  { id: 'basetta', label: '1. POSIZIONAMENTO BASETTE E TAVOLE', count: 4 },
  { id: 'telaio', label: '2. INNESTO TELAI PRIMO PIANO', count: 4 },
  { id: 'corrente', label: '3. COLLEGAMENTI ORIZZONTALI (CORRENTI)', count: 8 },
  { id: 'diagonale', label: '4. CONTROVENTATURE (DIAGONALI)', count: 4 },
  { id: 'impalcato', label: '5. PIANI DI CALPESTIO', count: 4 },
  { id: 'fermapiede', label: '6. TAVOLE FERMAPIEDE', count: 4 },
  { id: 'parapetto', label: '7. PARAPETTI DI SICUREZZA', count: 4 },
  { id: 'ancoraggio', label: '8. ANCORAGGI STRUTTURALI', count: 2 },
];

function SnapPoint({ position, type, onSnap, active }: { 
  position: [number, number, number], 
  type: string, 
  onSnap: () => void,
  active: boolean 
}) {
  return (
    <group position={position}>
      <mesh onClick={() => active && onSnap()}>
        <Box args={[0.6, 0.6, 0.6]}>
          <meshStandardMaterial 
            color={active ? "#ffcc00" : "#333"} 
            transparent 
            opacity={active ? 0.6 : 0.2} 
            wireframe={!active}
          />
        </Box>
      </mesh>
      {active && (
        <Text position={[0, 0.8, 0]} fontSize={0.15} color="#ffcc00" font="Space Grotesk">
          MONTA {type.toUpperCase()}
        </Text>
      )}
    </group>
  );
}

export default function AssemblyScene() {
  const { 
    addScore, addError, nextPhase, unlockPhase, 
    isHarnessed, setHarnessed, isHooked, setHooked,
    assembledItems, addAssembledItem,
    lastAssemblyStep, setLastAssemblyStep
  } = useGameStore();

  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));
  const currentStep = ASSEMBLY_STEPS[lastAssemblyStep];

  // Generazione dinamica snap points per il ponteggio
  const snapPoints = useMemo(() => {
    const points: {pos: [number, number, number], type: string}[] = [];
    
    // Basette (Piano 0)
    for(let i=0; i<4; i++) points.push({ pos: [i*3 - 4.5, 0.1, -2], type: 'basetta' });
    
    // Telai (Piano 1)
    for(let i=0; i<4; i++) points.push({ pos: [i*3 - 4.5, 1.5, -2], type: 'telaio' });

    // Fallback per altri step
    if (lastAssemblyStep >= 2) {
      points.push({ pos: [0, lastAssemblyStep * 0.5 + 2, -2], type: currentStep.id });
    }

    return points;
  }, [lastAssemblyStep, currentStep]);

  const handleSnap = (type: string) => {
    const isAtHeight = avatarPosition.y > 1.8;
    
    // Controllo DPI Critico
    if (isAtHeight && (!isHarnessed || !isHooked)) {
      addError({
        code: 'PPE_FAILURE_HEIGHT',
        severity: 'critical',
        messageKey: 'error.ppeFall',
        phase: 'assembly'
      });
      alert("ERRORE CRITICO: MANCATO ANCORAGGIO IN QUOTA. PROCEDURA BLOCCATA.");
      return;
    }

    if (type !== currentStep.id) {
      addError({
        code: 'SEQUENCE_ERROR',
        severity: 'high',
        messageKey: 'error.sequence',
        phase: 'assembly'
      });
      alert(`ERRORE Pi.M.U.S.: SEQUENZA ERRATA. INSTALLARE: ${currentStep.label}`);
      return;
    }

    addAssembledItem(`${type}-${assembledItems.length}`);
    addScore(75);

    const itemsOfThisType = assembledItems.filter((id: string) => id.startsWith(type)).length + 1;
    if (itemsOfThisType >= currentStep.count) {
      if (lastAssemblyStep < ASSEMBLY_STEPS.length - 1) {
        setLastAssemblyStep(lastAssemblyStep + 1);
      } else {
        alert("MONTAGGIO COMPLETATO SECONDO Pi.M.U.S.");
        unlockPhase('use');
        nextPhase();
      }
    }
  };

  return (
    <group>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      {/* Terreno e Muro Edificio */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />
      
      <Box args={[40, 30, 1]} position={[0, 15, -6]}>
        <meshStandardMaterial color="#111" metalness={0.5} roughness={0.5} />
      </Box>

      {/* Snap Points */}
      {snapPoints.map((p, i) => (
        <SnapPoint 
          key={`${p.type}-${i}`} 
          position={p.pos} 
          type={p.type} 
          onSnap={() => handleSnap(p.type)} 
          active={p.type === currentStep.id} 
        />
      ))}

      {/* Elementi Assemblati */}
      {assembledItems.map((id, index) => {
        const type = id.split('-')[0];
        const yPos = type === 'basetta' ? 0.1 : (type === 'telaio' ? 1.5 : index * 0.2 + 2.5);
        return (
          <Box key={id} args={[1, type === 'telaio' ? 2 : 0.2, 1]} position={[ (index % 4) * 3 - 4.5, yPos, -2]}>
            <meshStandardMaterial color="#ffcc00" metalness={0.8} roughness={0.2} />
          </Box>
        );
      })}

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      {/* HUD PROCEDURA Pi.M.U.S. */}
      <Html position={[-12, 10, 0]}>
        <div style={{ 
          background: 'rgba(0,0,0,0.95)', 
          color: '#ffcc00', 
          padding: '2rem', 
          border: '4px solid #ffcc00',
          fontFamily: 'Space Grotesk',
          width: '400px',
          boxShadow: '0 0 30px rgba(255,204,0,0.2)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontWeight: 900, borderBottom: '2px solid #ffcc00', paddingBottom: '0.5rem' }}>
            PROTOCOLLO MONTAGGIO
          </h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ color: '#666', fontSize: '0.8rem' }}>FASE ATTUALE:</span><br/>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{currentStep.label}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              onClick={() => setHarnessed(!isHarnessed)}
              style={{ 
                background: isHarnessed ? '#ffcc00' : '#222', 
                color: isHarnessed ? 'black' : 'white',
                border: 'none', padding: '1rem', fontWeight: 900, cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {isHarnessed ? 'IMBRACATURA ATTIVA' : 'INDOSSA IMBRACATURA'}
            </button>
            <button 
              onClick={() => setHooked(!isHooked)}
              disabled={!isHarnessed}
              style={{ 
                background: isHooked ? '#ffcc00' : '#222', 
                color: isHooked ? 'black' : 'white',
                border: 'none', padding: '1rem', fontWeight: 900, cursor: 'pointer',
                fontSize: '1rem', opacity: isHarnessed ? 1 : 0.3
              }}
            >
              {isHooked ? 'CORDINO ANCORATO' : 'ANCORA CORDINO'}
            </button>
          </div>

          {avatarPosition.y > 1.8 && !isHooked && (
            <div style={{ 
              background: 'red', color: 'white', marginTop: '1.5rem', 
              padding: '1rem', fontWeight: 900, textAlign: 'center',
              animation: 'blink 0.5s infinite' 
            }}>
              PERICOLO CADUTA: NON ANCORATO
            </div>
          )}
        </div>
      </Html>

      <Center top position={[0, 18, -8]}>
        <Text fontSize={1} color="white" font="Space Grotesk">MONTAGGIO STRUTTURALE</Text>
      </Center>
    </group>
  );
}
