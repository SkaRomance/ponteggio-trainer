import { useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center, Html } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

// Definizione della sequenza Pi.M.U.S.
const ASSEMBLY_STEPS = [
  { id: 'basetta', label: 'BASETTE E TAVOLE APPOGGIO', count: 2 },
  { id: 'telaio', label: 'TELAI PREFABBRICATI', count: 2 },
  { id: 'corrente', label: 'CORRENTI E DIAGONALI', count: 4 },
  { id: 'impalcato', label: 'IMPALCATO (TAVOLE)', count: 2 },
  { id: 'fermapiede', label: 'TAVOLE FERMAPIEDI', count: 2 },
  { id: 'parapetto', label: 'PARAPETTI DI SICUREZZA', count: 2 },
  { id: 'ancoraggio', label: 'ANCORAGGIO A MURO', count: 1 },
];

function SnapPoint({ position, type, onSnap, active }: { 
  position: [number, number, number], 
  type: string, 
  onSnap: () => void,
  active: boolean 
}) {
  return (
    <mesh position={position} onClick={() => active && onSnap()}>
      <Box args={[0.5, 0.5, 0.5]}>
        <meshStandardMaterial 
          color={active ? "yellow" : "white"} 
          transparent 
          opacity={active ? 0.4 : 0.1} 
          wireframe={!active}
        />
      </Box>
      {active && (
        <Text position={[0, 0.5, 0]} fontSize={0.2} color="yellow">
          MONTA {type.toUpperCase()}
        </Text>
      )}
    </mesh>
  );
}

export default function AssemblyScene() {
  const { 
    addScore, addError, nextPhase, unlockPhase, 
    isHarnessed, setHarnessed, isHooked, setHooked,
    assembledItems, addAssembledItem,
    lastAssemblyStep, setLastAssemblyStep
  } = useGameStore();

  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 5));
  const currentStep = ASSEMBLY_STEPS[lastAssemblyStep];

  const handleSnap = (type: string) => {
    // Controllo DPI in quota (UX Sally)
    const isAtHeight = avatarPosition.y > 1.5;
    if (isAtHeight && (!isHarnessed || !isHooked)) {
      addError({
        code: 'PPE_FAILURE_HEIGHT',
        severity: 'critical',
        messageKey: 'error.ppeFall',
        phase: 'assembly'
      });
      alert("ERRORE CRITICO: Sei in quota senza ancoraggio DPI! Caduta simulata.");
      return;
    }

    if (type !== currentStep.id) {
      addError({
        code: 'SEQUENCE_ERROR',
        severity: 'medium',
        messageKey: 'error.sequence',
        phase: 'assembly'
      });
      alert(`ERRORE Pi.M.U.S.: Devi prima montare ${currentStep.label}`);
      return;
    }

    addAssembledItem(`${type}-${assembledItems.length}`);
    addScore(50);

    // Avanzamento step se raggiunto il count
    const itemsOfThisType = assembledItems.filter((id: string) => id.startsWith(type)).length + 1;
    if (itemsOfThisType >= currentStep.count) {
      if (lastAssemblyStep < ASSEMBLY_STEPS.length - 1) {
        setLastAssemblyStep(lastAssemblyStep + 1);
      } else {
        alert("MONTAGGIO COMPLETATO IN SICUREZZA!");
        unlockPhase('use');
        nextPhase();
      }
    }
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* Terreno e Muro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <Box args={[20, 20, 1]} position={[0, 10, -5]}>
        <meshStandardMaterial color="#333" />
      </Box>

      {/* Snap Points Dinamici */}
      {lastAssemblyStep === 0 && (
        <>
          <SnapPoint position={[-2, 0.25, -2]} type="basetta" onSnap={() => handleSnap('basetta')} active={true} />
          <SnapPoint position={[2, 0.25, -2]} type="basetta" onSnap={() => handleSnap('basetta')} active={true} />
        </>
      )}
      {lastAssemblyStep === 1 && (
        <>
          <SnapPoint position={[-2, 2, -2]} type="telaio" onSnap={() => handleSnap('telaio')} active={true} />
          <SnapPoint position={[2, 2, -2]} type="telaio" onSnap={() => handleSnap('telaio')} active={true} />
        </>
      )}
      {lastAssemblyStep >= 2 && (
        <group position={[0, 4, -2]}>
           <Text position={[0, 1, 0]} fontSize={0.3} color="white">LOGICA DI MONTAGGIO SUCCESSIVA IN CORSO...</Text>
           <SnapPoint position={[0, 0, 0]} type={currentStep.id} onSnap={() => handleSnap(currentStep.id)} active={true} />
        </group>
      )}

      {/* Rendering oggetti montati */}
      {assembledItems.map((id: string, index: number) => (
        <Box key={id} args={[1, 1, 1]} position={[index * 0.5 - 2, index * 0.5 + 0.5, -2]}>
          <meshStandardMaterial color="#ffcc00" />
        </Box>
      ))}

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      {/* UI Spaziale HUD (Sally UX) */}
      <Html position={[-8, 8, 0]}>
        <div style={{ 
          background: 'rgba(0,0,0,0.8)', 
          color: '#ffcc00', 
          padding: '1.5rem', 
          border: '2px solid #ffcc00',
          fontFamily: 'Space Grotesk',
          width: '300px',
          pointerEvents: 'auto'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', fontWeight: 900 }}>PROCEDURA Pi.M.U.S.</h4>
          <div style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            STEP ATTUALE: <br/>
            <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>{currentStep.label}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setHarnessed(!isHarnessed)}
              style={{ 
                background: isHarnessed ? '#ffcc00' : '#333', 
                color: isHarnessed ? 'black' : 'white',
                border: 'none', padding: '0.5rem', fontWeight: 800, cursor: 'pointer'
              }}
            >
              {isHarnessed ? 'IMBRACATURA INDOSSATA' : 'INDOSSA IMBRACATURA'}
            </button>
            <button 
              onClick={() => setHooked(!isHooked)}
              disabled={!isHarnessed}
              style={{ 
                background: isHooked ? '#ffcc00' : '#333', 
                color: isHooked ? 'black' : 'white',
                border: 'none', padding: '0.5rem', fontWeight: 800, cursor: 'pointer',
                opacity: isHarnessed ? 1 : 0.5
              }}
            >
              {isHooked ? 'CORDINO ANCORATO' : 'ANCORA CORDINO'}
            </button>
          </div>
          
          {avatarPosition.y > 1.5 && !isHooked && (
            <div style={{ color: 'red', marginTop: '1rem', fontWeight: 900 }}>
              ⚠️ PERICOLO: NON ANCORATO IN QUOTA!
            </div>
          )}
        </div>
      </Html>

      <Center top position={[0, 15, -10]}>
        <Text fontSize={0.8} color="white">
          FASE DI MONTAGGIO
        </Text>
      </Center>
    </group>
  );
}
