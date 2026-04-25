import { useMemo, useState } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const STORAGE_ZONE = { minX: -10, maxX: 10, minZ: -6, maxZ: 6 };
const DANGER_ZONE_CENTER = { x: 0, z: -8 };
const DANGER_ZONE_RADIUS = 7;
const MIN_BLOCK_SPACING = 1.6;

type StorageBlockState = {
  pos: [number, number, number];
  itemId: string | null;
};

const isInsideStorageZone = (x: number, z: number) =>
  x > STORAGE_ZONE.minX &&
  x < STORAGE_ZONE.maxX &&
  z > STORAGE_ZONE.minZ &&
  z < STORAGE_ZONE.maxZ;

const isInsideDangerZone = (x: number, z: number) =>
  Math.hypot(x - DANGER_ZONE_CENTER.x, z - DANGER_ZONE_CENTER.z) < DANGER_ZONE_RADIUS;

function StorageBlock({ position, onClick, hasItem }: { 
  position: [number, number, number]; 
  onClick: () => void;
  hasItem: boolean;
}) {
  return (
    <group position={position} onClick={onClick}>
      {/* Travi di legno per stoccaggio Pi.M.U.S. */}
      <Box args={[1.8, 0.15, 0.4]} castShadow>
        <meshStandardMaterial color="#5d4037" roughness={1} />
      </Box>
      <Box args={[1.8, 0.15, 0.4]} position={[0, 0, 0.8]} castShadow>
        <meshStandardMaterial color="#5d4037" roughness={1} />
      </Box>
      {hasItem && (
        <Text position={[0, 0.6, 0.4]} fontSize={0.15} color={MARS_SUCCESS}>
          MATERIALE STOCCATO
        </Text>
      )}
    </group>
  );
}

export default function StorageScene() {
  const {
    loadedItems,
    storageLocations,
    setStorageLocation,
    nextPhase,
    unlockPhase,
    addError,
    addScore,
    pushNotice,
  } = useGameStore();
  const [blocks, setBlocks] = useState<StorageBlockState[]>(() =>
    Object.entries(storageLocations).map(([itemId, pos]) => ({
      pos: [pos.x, pos.y, pos.z] as [number, number, number],
      itemId,
    })),
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 10));
  const itemsInTruck = useMemo(() => loadedItems.filter((id) => !storageLocations[id]), [loadedItems, storageLocations]);

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id === selectedItemId ? null : id);
  };

  const handlePlaceBlock = (e: ThreeEvent<MouseEvent>) => {
    if (selectedItemId) return;
    e.stopPropagation();
    const p = e.point;

    if (!isInsideStorageZone(p.x, p.z)) {
      pushNotice({
        severity: 'info',
        title: 'Area non disponibile',
        message: 'I ceppi possono essere posizionati solo nell’area di stoccaggio segnalata.',
        phase: 'storage',
      });
      return;
    }

    if (isInsideDangerZone(p.x, p.z)) {
      pushNotice({
        severity: 'warning',
        title: 'Zona pericolo',
        message: 'Questa area non puo essere utilizzata per lo stoccaggio del materiale.',
        phase: 'storage',
      });
      return;
    }

    const hasNearbyBlock = blocks.some(
      (block) => Math.hypot(block.pos[0] - p.x, block.pos[2] - p.z) < MIN_BLOCK_SPACING,
    );

    if (hasNearbyBlock) {
      pushNotice({
        severity: 'info',
        title: 'Ceppi troppo vicini',
        message: 'Mantieni una distanza minima tra i supporti per evitare sovrapposizioni.',
        phase: 'storage',
      });
      return;
    }

    setBlocks((prev) => [...prev, { pos: [p.x, 0.1, p.z], itemId: null }]);
    addScore(15);
  };

  const handleStoreOnBlock = (blockIndex: number) => {
    if (!selectedItemId) return;
    if (blocks[blockIndex].itemId) {
      pushNotice({
        severity: 'info',
        title: 'Supporto occupato',
        message: 'Seleziona un altro ceppo libero per continuare lo scarico.',
        phase: 'storage',
      });
      return;
    }

    const newBlocks = [...blocks];
    newBlocks[blockIndex].itemId = selectedItemId;
    setBlocks(newBlocks);
    setStorageLocation(selectedItemId, {
      x: newBlocks[blockIndex].pos[0],
      y: newBlocks[blockIndex].pos[1],
      z: newBlocks[blockIndex].pos[2],
    });
    setSelectedItemId(null);
    addScore(40);
  };

  const handleFinishPhase = () => {
    const storedItemsCount = blocks.filter((block) => !!block.itemId).length;
    const unsafeStoredBlocks = blocks.filter(
      (block) => block.itemId && isInsideDangerZone(block.pos[0], block.pos[2]),
    );

    if (itemsInTruck.length > 0 || storedItemsCount < loadedItems.length) {
      addError({
        code: 'ITEMS_ON_TRUCK',
        severity: 'medium',
        messageKey: 'error.itemsOnTruck',
        phase: 'storage'
      });
      pushNotice({
        severity: 'warning',
        title: 'Stoccaggio incompleto',
        message: 'Tutti i componenti devono essere scaricati e posizionati sui supporti prima di chiudere la fase.',
        phase: 'storage',
      });
      return;
    }

    if (unsafeStoredBlocks.length > 0) {
      addError({
        code: 'UNSAFE_STORAGE_ZONE',
        severity: 'high',
        messageKey: 'error.unsafeStorage',
        phase: 'storage',
      });
      pushNotice({
        severity: 'error',
        title: 'Stoccaggio non conforme',
        message: 'Almeno un componente risulta collocato in zona pericolo. Riposiziona il materiale prima di proseguire.',
        phase: 'storage',
      });
      return;
    }

    pushNotice({
      severity: 'success',
      title: 'Stoccaggio completato',
      message: 'Il materiale e stato scaricato correttamente e isolato dal suolo. Passaggio al montaggio in corso.',
      phase: 'storage',
    });
    unlockPhase('assembly');
    nextPhase();
  };

  return (
    <group>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      {/* Terreno Cantiere (Asfalto/Terra) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={handlePlaceBlock}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      <gridHelper args={[100, 40, "#222", "#111"]} position={[0, 0.01, 0]} />

      {/* Edificio in costruzione */}
      <Box args={[30, 20, 2]} position={[0, 10, -15]}>
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.2} />
      </Box>

      {/* Camion arrivato */}
      <group position={[15, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
        <Box args={[12, 1, 8]}><meshStandardMaterial color="#111" /></Box>
        {itemsInTruck.map((id, index) => (
          <group key={id} position={[index * 1.5 - 5, 0.8, 0]} onClick={() => handleSelectItem(id)}>
            <Box args={[1.2, 0.2, 1.2]}>
              <meshStandardMaterial 
                color={selectedItemId === id ? "#ffcc00" : "#444"} 
                emissive={selectedItemId === id ? "#ffcc00" : "#000"}
                emissiveIntensity={0.5}
              />
            </Box>
          </group>
        ))}
      </group>

      {/* Blocchi di stoccaggio */}
      {blocks.map((block, index) => (
        <StorageBlock 
          key={index} 
          position={block.pos} 
          onClick={() => handleStoreOnBlock(index)}
          hasItem={!!block.itemId}
        />
      ))}

      {/* Pezzi stoccati */}
      {blocks.map((block, index) => block.itemId && (
        <Box key={`stored-${index}`} args={[1.2, 0.2, 1.2]} position={[block.pos[0], block.pos[1] + 0.3, block.pos[2] + 0.4]}>
          <meshStandardMaterial color="#ffcc00" metalness={0.8} />
        </Box>
      ))}

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      {/* HUD Spaziale */}
      <Center top position={[0, 12, -13]}>
        <Text fontSize={0.7} color={MARS_PRIMARY}>STOCCAGGIO CANTIERE</Text>
        <Text position={[0, -1, 0]} fontSize={0.25} color={MARS_ACCENT} maxWidth={10}>
          1. CLICCA A TERRA PER POSIZIONARE I CEPPI
          {"\n"}2. EVITA LA ZONA PERICOLO IN ROSSO
          {"\n"}3. SCARICA TUTTI I PEZZI SUI SUPPORTI
        </Text>
      </Center>

      {/* Danger Zone */}
      <group position={[0, 0, -8]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[6.8, 7, 64]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
        </mesh>
        <Text position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color={MARS_DANGER}>
          ZONA PERICOLO - NON STOCCARE
        </Text>
      </group>

      {/* Conclusione */}
      <group position={[-10, 1, 0]} onClick={handleFinishPhase}>
        <Box args={[3, 1.2, 0.2]} castShadow>
          <meshStandardMaterial color={itemsInTruck.length === 0 ? "#ffcc00" : "#222"} />
        </Box>
        <Text position={[0, 0, 0.15]} fontSize={0.2} color={itemsInTruck.length === 0 ? '#0a0a0a' : '#f5f2ed'} fontWeight={900}>
          FINE SCARICO
        </Text>
      </group>
    </group>
  );
}
