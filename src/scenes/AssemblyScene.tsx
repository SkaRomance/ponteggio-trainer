import { useState, useMemo, type CSSProperties } from 'react';
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

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const MARS_TEXT = '#0a0a0a';
const MARS_MUTED = '#555555';
const MARS_BORDER = '#d1cdc7';

const panelShellStyle: CSSProperties = {
  width: 'min(420px, 90vw)',
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

const getToggleButtonStyle = (active: boolean, disabled = false): CSSProperties => ({
  width: '100%',
  padding: '0.95rem 1rem',
  borderRadius: '999px',
  border: `1px solid ${active ? MARS_PRIMARY : MARS_BORDER}`,
  background: active ? MARS_PRIMARY : '#f9f7f4',
  color: active ? '#ffffff' : MARS_PRIMARY,
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.95rem',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
});

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
        <Text position={[0, 0.8, 0]} fontSize={0.15} color={MARS_ACCENT}>
          MONTA {type.toUpperCase()}
        </Text>
      )}
    </group>
  );
}

export default function AssemblyScene() {
  const { 
    addScore, addError, nextPhase, unlockPhase, pushNotice, logEvent,
    isHarnessed, setHarnessed, isHooked, setHooked,
    assembledItems, addAssembledItem,
    lastAssemblyStep, setLastAssemblyStep,
    loadedItems, storageLocations,
  } = useGameStore();

  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));
  const currentStep = ASSEMBLY_STEPS[lastAssemblyStep];
  const storedUsableItems = useMemo(
    () => loadedItems.filter((itemId) => Boolean(storageLocations[itemId])),
    [loadedItems, storageLocations],
  );

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

  const handleSnap = (type: string, targetHeight: number) => {
    const isAtHeight = targetHeight > 1.8;
    logEvent({
      type: 'procedure_action',
      phase: 'assembly',
      payload: {
        action: 'snap_component',
        requestedType: type,
        expectedType: currentStep.id,
        targetHeight,
        harnessed: isHarnessed,
        hooked: isHooked,
      },
    });
    
    // Controllo DPI Critico
    if (isAtHeight && (!isHarnessed || !isHooked)) {
      addError({
        code: 'PPE_FAILURE_HEIGHT',
        severity: 'critical',
        messageKey: 'error.ppeFall',
        phase: 'assembly'
      });
      pushNotice({
        severity: 'error',
        title: 'Ancora il cordino',
        message: 'Sei in quota senza ancoraggio attivo. La procedura di montaggio resta bloccata.',
        phase: 'assembly',
      });
      return;
    }

    if (type !== currentStep.id) {
      addError({
        code: 'SEQUENCE_ERROR',
        severity: 'high',
        messageKey: 'error.sequence',
        phase: 'assembly'
      });
      pushNotice({
        severity: 'warning',
        title: 'Sequenza errata',
        message: `Lo step richiesto adesso e: ${currentStep.label}.`,
        phase: 'assembly',
      });
      return;
    }

    if (type !== 'ancoraggio') {
      const availableOfType = storedUsableItems.filter((id) => id.startsWith(type)).length;
      const alreadyUsedOfType = assembledItems.filter((id: string) => id.startsWith(type)).length;

      if (alreadyUsedOfType >= availableOfType) {
        addError({
          code: 'INVENTORY_NOT_AVAILABLE',
          severity: 'high',
          messageKey: 'error.inventoryMissing',
          phase: 'assembly',
        });
        pushNotice({
          severity: 'error',
          title: 'Inventario non disponibile',
          message: 'Puoi montare solo componenti ispezionati, trasportati e stoccati correttamente.',
          phase: 'assembly',
        });
        return;
      }
    }

    addAssembledItem(`${type}-${assembledItems.length}`);
    addScore(75);

    const itemsOfThisType = assembledItems.filter((id: string) => id.startsWith(type)).length + 1;
    if (itemsOfThisType >= currentStep.count) {
      if (lastAssemblyStep < ASSEMBLY_STEPS.length - 1) {
        setLastAssemblyStep(lastAssemblyStep + 1);
        pushNotice({
          severity: 'success',
          title: 'Step completato',
          message: `Passaggio successivo: ${ASSEMBLY_STEPS[lastAssemblyStep + 1].label}.`,
          phase: 'assembly',
        });
      } else {
        pushNotice({
          severity: 'success',
          title: 'Montaggio completato',
          message: 'La procedura Pi.M.U.S. e stata completata correttamente. Passaggio alla verifica d’uso.',
          phase: 'assembly',
        });
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
          onSnap={() => handleSnap(p.type, p.pos[1])}
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
        <div style={panelShellStyle}>
          <div style={panelCardStyle}>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                PROCEDURA Pi.M.U.S.
              </span>
              <h2 style={{ margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '1.7rem', fontWeight: 700, color: MARS_PRIMARY }}>
                Protocollo montaggio
              </h2>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem 1.1rem', borderRadius: '18px', background: '#f5f2ed', border: `1px solid ${MARS_BORDER}` }}>
              <span style={{ display: 'block', marginBottom: '0.4rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                Fase attuale
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: MARS_TEXT, lineHeight: 1.4 }}>
                {currentStep.label}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <button onClick={() => setHarnessed(!isHarnessed)} style={getToggleButtonStyle(isHarnessed)}>
                {isHarnessed ? 'IMBRACATURA ATTIVA' : 'INDOSSA IMBRACATURA'}
              </button>
              <button onClick={() => setHooked(!isHooked)} disabled={!isHarnessed} style={getToggleButtonStyle(isHooked, !isHarnessed)}>
                {isHooked ? 'CORDINO ANCORATO' : 'ANCORA CORDINO'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '18px', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}` }}>
                <span style={{ display: 'block', color: MARS_MUTED, fontSize: '0.74rem', marginBottom: '0.3rem' }}>Imbracatura</span>
                <strong style={{ color: isHarnessed ? MARS_SUCCESS : MARS_MUTED }}>{isHarnessed ? 'Attiva' : 'Assente'}</strong>
              </div>
              <div style={{ flex: 1, padding: '0.85rem 1rem', borderRadius: '18px', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}` }}>
                <span style={{ display: 'block', color: MARS_MUTED, fontSize: '0.74rem', marginBottom: '0.3rem' }}>Ancoraggio</span>
                <strong style={{ color: isHooked ? MARS_SUCCESS : MARS_DANGER }}>{isHooked ? 'Confermato' : 'Mancante'}</strong>
              </div>
            </div>

            {lastAssemblyStep >= 2 && !isHooked && (
              <div style={{ marginTop: '1rem', padding: '0.95rem 1rem', borderRadius: '18px', border: `1px solid ${MARS_DANGER}`, background: 'rgba(220, 38, 38, 0.08)', color: MARS_DANGER, fontWeight: 700, textAlign: 'center' }}>
                Pericolo caduta: operatore non ancorato
              </div>
            )}
          </div>
        </div>
      </Html>

      <Center top position={[0, 18, -8]}>
        <Text fontSize={1} color={MARS_PRIMARY}>MONTAGGIO STRUTTURALE</Text>
      </Center>
    </group>
  );
}
