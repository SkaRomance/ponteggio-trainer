import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center, Float, Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const MARS_TEXT = '#0a0a0a';
const MARS_MUTED = '#555555';
const MARS_BORDER = '#d1cdc7';
const MARS_FONT = 'Inter';

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

function LoadableItem({ id, type, position, onLoad, isSelected }: { 
  id: string; 
  type: string; 
  position: [number, number, number]; 
  onLoad: (id: string) => void;
  isSelected: boolean;
}) {
  const getColor = () => {
    if (isSelected) return '#ffcc00';
    switch (type) {
      case 'basetta': return '#555';
      case 'telaio': return '#2d5a9e';
      case 'impalcato': return '#777';
      default: return '#999';
    }
  };

  return (
    <group position={position} onClick={() => onLoad(id)}>
      <Float speed={isSelected ? 5 : 0} rotationIntensity={0.5} floatIntensity={0.5}>
        <Box args={[1, 0.2, 1]} castShadow>
          <meshStandardMaterial 
            color={getColor()} 
            metalness={0.8} 
            roughness={0.2} 
            emissive={isSelected ? '#ffcc00' : '#000'}
            emissiveIntensity={isSelected ? 0.5 : 0}
          />
        </Box>
      </Float>
      <Text position={[0, 0.5, 0]} fontSize={0.15} color={MARS_ACCENT} font={MARS_FONT}>
        {type.toUpperCase()}
      </Text>
    </group>
  );
}

export default function TransportScene() {
  const {
    loadedItems,
    setLoadedItems,
    nextPhase,
    unlockPhase,
    addError,
    addScore,
    pushNotice,
    isStrapped,
    setStrapped,
    weightBalance,
    setWeightBalance,
  } = useGameStore();
  const [itemsOnGround, setItemsOnGround] = useState<string[]>(() => loadedItems);
  const [itemsOnTruck, setItemsOnTruck] = useState<{id: string, pos: Vector3}[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 10));

  const balanceLabel = useMemo(() => {
    if (itemsOnTruck.length === 0) return 'In attesa di carico';
    if (Math.abs(weightBalance) <= 0.18) return 'Bilanciamento corretto';
    if (Math.abs(weightBalance) <= 0.3) return 'Bilanciamento da rifinire';
    return 'Bilanciamento critico';
  }, [itemsOnTruck.length, weightBalance]);

  useEffect(() => {
    setLoadedItems([]); 
    setStrapped(false);
    setWeightBalance(0);
  }, [setLoadedItems, setStrapped, setWeightBalance]);

  useEffect(() => {
    if (itemsOnTruck.length === 0) {
      setWeightBalance(0);
      return;
    }

    const avgX = itemsOnTruck.reduce((acc, item) => acc + item.pos.x, 0) / itemsOnTruck.length;
    setWeightBalance(avgX / 4);
  }, [itemsOnTruck, setWeightBalance]);

  const handleLoadItem = (id: string) => {
    setSelectedItemId(id === selectedItemId ? null : id);
  };

  const handlePlaceOnTruck = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedItemId) return;
    e.stopPropagation();

    const point = e.point;
    // Area cassone
    if (point.z < -2 && point.z > -12 && Math.abs(point.x) < 4) {
      const newItem = { id: selectedItemId, pos: new Vector3(point.x, 1.2, point.z) };
      setItemsOnTruck(prev => [...prev, newItem]);
      setItemsOnGround(prev => prev.filter(item => item !== selectedItemId));
      setSelectedItemId(null);
      setStrapped(false);
      addScore(25);
      pushNotice({
        severity: 'info',
        title: 'Carico aggiornato',
        message: 'Il materiale e stato caricato sul mezzo. Conferma di nuovo il fissaggio prima della partenza.',
        phase: 'transport',
      });
    }
  };

  const handleFinishPhase = () => {
    if (itemsOnGround.length > 0) {
      addError({
        code: 'ITEMS_LEFT_BEHIND',
        severity: 'medium',
        messageKey: 'error.itemsLeft',
        phase: 'transport'
      });
      pushNotice({
        severity: 'warning',
        title: 'Carico incompleto',
        message: 'Ci sono ancora componenti a terra. Carica tutto il materiale prima di partire.',
        phase: 'transport',
      });
      return;
    }

    if (!isStrapped) {
      addError({
        code: 'LOAD_NOT_STRAPPED',
        severity: 'high',
        messageKey: 'error.loadNotStrapped',
        phase: 'transport',
      });
      pushNotice({
        severity: 'error',
        title: 'Fissaggio mancante',
        message: 'Il carico non e stato fissato. Conferma il bloccaggio del materiale prima della partenza.',
        phase: 'transport',
      });
      return;
    }

    if (Math.abs(weightBalance) > 0.3) {
      addError({
        code: 'BAD_BALANCE',
        severity: 'high',
        messageKey: 'error.badBalance',
        phase: 'transport'
      });
      pushNotice({
        severity: 'error',
        title: 'Carico sbilanciato',
        message: 'Il baricentro del materiale e fuori tolleranza. Ridistribuisci il peso nel cassone.',
        phase: 'transport',
      });
      return;
    }

    setLoadedItems(itemsOnTruck.map(i => i.id));
    pushNotice({
      severity: 'success',
      title: 'Trasporto validato',
      message: 'Carico completo, fissato e bilanciato. Passaggio allo stoccaggio in corso.',
      phase: 'transport',
    });
    unlockPhase('storage');
    nextPhase();
  };

  return (
    <group>
      {/* Terreno Industriale */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <gridHelper args={[100, 50, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Camion Brutalista */}
      <group position={[0, 0, -7]}>
        <Box args={[4.5, 4, 4]} position={[0, 2, -8]} castShadow>
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        </Box>
        {/* Cassone */}
        <mesh position={[0, 0.5, 0]} receiveShadow onClick={handlePlaceOnTruck}>
          <Box args={[8, 1, 12]}>
            <meshStandardMaterial color="#222" metalness={0.5} />
          </Box>
        </mesh>
        <Box args={[0.3, 2, 12]} position={[4, 1.5, 0]}><meshStandardMaterial color="#333" /></Box>
        <Box args={[0.3, 2, 12]} position={[-4, 1.5, 0]}><meshStandardMaterial color="#333" /></Box>
      </group>

      {/* Oggetti a terra */}
      <group position={[-8, 0.5, 2]}>
        {itemsOnGround.map((id, index) => {
          const type = id.split('-')[0];
          return (
            <LoadableItem 
              key={id} 
              id={id} 
              type={type} 
              position={[ (index % 4) * 2, 0, Math.floor(index / 4) * 2 ]} 
              onLoad={handleLoadItem}
              isSelected={selectedItemId === id}
            />
          );
        })}
      </group>

      {/* Oggetti sul camion */}
      {itemsOnTruck.map((item) => (
        <Box key={item.id} args={[1, 0.2, 1]} position={[item.pos.x, item.pos.y, item.pos.z]} castShadow>
          <meshStandardMaterial color="#ffcc00" metalness={0.8} />
        </Box>
      ))}

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      {/* HUD Spaziale */}
      <Center top position={[0, 8, -10]}>
        <Text fontSize={0.6} color={MARS_PRIMARY} font={MARS_FONT}>LOGISTICA TRASPORTO</Text>
        <Text position={[0, -0.8, 0]} fontSize={0.25} color={MARS_ACCENT} font={MARS_FONT}>CARICA TUTTI I PEZZI E BILANCIA IL PESO</Text>
      </Center>

      <Html position={[-12, 10, 0]}>
        <div style={panelShellStyle}>
          <div style={panelCardStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                LOGISTICA DI CARICO
              </span>
              <h2 style={{ margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '1.7rem', fontWeight: 700, color: MARS_PRIMARY }}>
                Verifica del mezzo
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.9rem 1rem', borderRadius: '18px', background: '#f5f2ed', border: `1px solid ${MARS_BORDER}` }}>
                <span style={{ display: 'block', color: MARS_MUTED, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Pezzi caricati</span>
                <strong style={{ color: MARS_PRIMARY, fontSize: '1.35rem' }}>{itemsOnTruck.length}</strong>
              </div>
              <div style={{ padding: '0.9rem 1rem', borderRadius: '18px', background: '#f5f2ed', border: `1px solid ${MARS_BORDER}` }}>
                <span style={{ display: 'block', color: MARS_MUTED, fontSize: '0.75rem', marginBottom: '0.25rem' }}>Pezzi a terra</span>
                <strong style={{ color: itemsOnGround.length === 0 ? MARS_SUCCESS : MARS_DANGER, fontSize: '1.35rem' }}>{itemsOnGround.length}</strong>
              </div>
            </div>

            <div style={{ padding: '1rem 1.1rem', borderRadius: '18px', background: '#f9f7f4', border: `1px solid ${MARS_BORDER}` }}>
              <span style={{ display: 'block', marginBottom: '0.35rem', color: MARS_MUTED, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                Bilanciamento
              </span>
              <strong style={{ display: 'block', color: Math.abs(weightBalance) <= 0.18 ? MARS_SUCCESS : Math.abs(weightBalance) <= 0.3 ? MARS_ACCENT : MARS_DANGER, fontSize: '1.1rem', marginBottom: '0.45rem' }}>
                {balanceLabel}
              </strong>
              <span style={{ color: MARS_MUTED, fontSize: '0.85rem' }}>
                Scostamento asse: {(weightBalance * 100).toFixed(0)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextStrappedState = !isStrapped;
                setStrapped(nextStrappedState);
                pushNotice({
                  severity: 'info',
                  title: nextStrappedState ? 'Fissaggio confermato' : 'Fissaggio rimosso',
                  message: nextStrappedState
                    ? 'Il carico e stato marcato come fissato.'
                    : 'Il fissaggio del carico e stato disattivato.',
                  phase: 'transport',
                });
              }}
              style={{
                marginTop: '1rem',
                width: '100%',
                background: isStrapped ? MARS_SUCCESS : MARS_PRIMARY,
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '0.95rem 1rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.98rem',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              {isStrapped ? 'Fissaggio confermato' : 'Conferma fissaggio del carico'}
            </button>
          </div>
        </div>
      </Html>

      {/* Pulsante Azione */}
      <group position={[8, 1, 0]} onClick={handleFinishPhase}>
        <Box args={[3, 1.2, 0.2]} castShadow>
          <meshStandardMaterial color={itemsOnGround.length === 0 ? "#ffcc00" : "#222"} />
        </Box>
        <Text position={[0, 0, 0.15]} fontSize={0.2} color={itemsOnGround.length === 0 ? '#0a0a0a' : '#f5f2ed'} font={MARS_FONT} fontWeight={900}>
          PARTENZA MEZZO
        </Text>
      </group>
    </group>
  );
}
