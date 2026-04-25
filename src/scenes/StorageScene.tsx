import { useState, useEffect } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_SUCCESS = '#16A34A';
const MARS_DANGER = '#DC2626';
const MARS_FONT = 'Inter';

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
        <Text position={[0, 0.6, 0.4]} fontSize={0.15} color={MARS_SUCCESS} font={MARS_FONT}>
          MATERIALE STOCCATO
        </Text>
      )}
    </group>
  );
}

export default function StorageScene() {
  const { loadedItems, nextPhase, unlockPhase, addError, addScore, pushNotice } = useGameStore();
  const [itemsInTruck, setItemsInTruck] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<{pos: [number, number, number], itemId: string | null}[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 10));

  useEffect(() => {
    setItemsInTruck(loadedItems);
  }, [loadedItems]);

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id === selectedItemId ? null : id);
  };

  const handlePlaceBlock = (e: ThreeEvent<MouseEvent>) => {
    if (selectedItemId) return; 
    e.stopPropagation();
    const p = e.point;
    // Area sicura cantiere
    if (p.z > -6 && p.z < 6 && Math.abs(p.x) < 10) {
      setBlocks(prev => [...prev, { pos: [p.x, 0.1, p.z], itemId: null }]);
      addScore(15);
    }
  };

  const handleStoreOnBlock = (blockIndex: number) => {
    if (!selectedItemId) return;
    if (blocks[blockIndex].itemId) return;

    const newBlocks = [...blocks];
    newBlocks[blockIndex].itemId = selectedItemId;
    setBlocks(newBlocks);
    setItemsInTruck(prev => prev.filter(id => id !== selectedItemId));
    setSelectedItemId(null);
    addScore(40);
  };

  const handleFinishPhase = () => {
    if (itemsInTruck.length > 0) {
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
    
    pushNotice({
      severity: 'success',
      title: 'Stoccaggio completato',
      message: 'Il materiale e stato scaricato correttamente. Passaggio al montaggio in corso.',
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
        <Text fontSize={0.7} color={MARS_PRIMARY} font={MARS_FONT}>STOCCAGGIO CANTIERE</Text>
        <Text position={[0, -1, 0]} fontSize={0.25} color={MARS_ACCENT} font={MARS_FONT} maxWidth={10}>
          1. CLICCA A TERRA PER POSIZIONARE I CEPPI (ISOLAMENTO UMIDITÀ)
          {"\n"}2. SCARICA TUTTI I PEZZI SUI CEPPI
        </Text>
      </Center>

      {/* Danger Zone */}
      <group position={[0, 0, -8]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[6.8, 7, 64]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
        </mesh>
        <Text position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color={MARS_DANGER} font={MARS_FONT}>
          ZONA PERICOLO - NON STOCCARE
        </Text>
      </group>

      {/* Conclusione */}
      <group position={[-10, 1, 0]} onClick={handleFinishPhase}>
        <Box args={[3, 1.2, 0.2]} castShadow>
          <meshStandardMaterial color={itemsInTruck.length === 0 ? "#ffcc00" : "#222"} />
        </Box>
        <Text position={[0, 0, 0.15]} fontSize={0.2} color={itemsInTruck.length === 0 ? '#0a0a0a' : '#f5f2ed'} font={MARS_FONT} fontWeight={900}>
          FINE SCARICO
        </Text>
      </group>
    </group>
  );
}
