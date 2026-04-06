import { useState, useEffect } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

function StorageBlock({ position, onClick, hasItem }: { 
  position: [number, number, number]; 
  onClick: () => void;
  hasItem: boolean;
}) {
  return (
    <group position={position} onClick={onClick}>
      <Box args={[1.5, 0.2, 0.5]} castShadow>
        <meshStandardMaterial color="#8B4513" />
      </Box>
      <Box args={[1.5, 0.2, 0.5]} position={[0, 0, 0.6]} castShadow>
        <meshStandardMaterial color="#8B4513" />
      </Box>
      {hasItem && (
        <Text position={[0, 0.5, 0.3]} fontSize={0.2} color="#ffcc00">
          STOCCATO
        </Text>
      )}
    </group>
  );
}

export default function StorageScene() {
  const { loadedItems, nextPhase, unlockPhase, addError, addScore } = useGameStore();
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

  const handlePlaceBlock = (e: any) => {
    if (selectedItemId) return; 
    e.stopPropagation();
    const p = e.point;
    if (p.z > -5 && p.z < 5 && Math.abs(p.x) < 8) {
      setBlocks(prev => [...prev, { pos: [p.x, 0.1, p.z], itemId: null }]);
      addScore(10);
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
    addScore(30);
  };

  const handleFinishPhase = () => {
    if (itemsInTruck.length > 0) {
      addError({
        code: 'ITEMS_ON_TRUCK',
        severity: 'medium',
        messageKey: 'error.itemsOnTruck',
        phase: 'storage'
      });
      alert("Devi scaricare tutti i pezzi dal mezzo!");
      return;
    }
    
    unlockPhase('assembly');
    nextPhase();
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={handlePlaceBlock}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      <Box args={[20, 15, 1]} position={[0, 7.5, -10]}>
        <meshStandardMaterial color="#444" />
      </Box>

      <group position={[12, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
        <Box args={[8, 1, 4]}><meshStandardMaterial color="#333" /></Box>
        {itemsInTruck.map((id, index) => (
          <group key={id} position={[index * 1.2 - 3, 0.7, 0]} onClick={() => handleSelectItem(id)}>
            <Box args={[1, 0.2, 1]}>
              <meshStandardMaterial color={selectedItemId === id ? "#ffcc00" : "#666"} />
            </Box>
          </group>
        ))}
      </group>

      {blocks.map((block, index) => (
        <StorageBlock 
          key={index} 
          position={block.pos} 
          onClick={() => handleStoreOnBlock(index)}
          hasItem={!!block.itemId}
        />
      ))}

      {blocks.map((block, index) => block.itemId && (
        <Box key={`stored-${index}`} args={[1, 0.2, 1]} position={[block.pos[0], block.pos[1] + 0.2, block.pos[2]]}>
          <meshStandardMaterial color="#ffcc00" />
        </Box>
      ))}

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Center top position={[0, 8, -9]}>
        <Text fontSize={0.5} color="var(--mars-yellow)" font="Space Grotesk">
          STOCCAGGIO IN CANTIERE
        </Text>
        <Text position={[0, -0.7, 0]} fontSize={0.2} color="white">
          1. CLICCA A TERRA PER PIAZZARE I CEPPI DI LEGNO
        </Text>
        <Text position={[0, -1.1, 0]} fontSize={0.2} color="white">
          2. SELEZIONA UN PEZZO DAL CAMION E CLICCA SUL CEPPO PER STOCCARLO
        </Text>
      </Center>

      <group position={[-6, 1, 0]} onClick={handleFinishPhase}>
        <Box args={[2, 1, 0.5]}>
          <meshStandardMaterial color={itemsInTruck.length === 0 ? "#ffcc00" : "#444"} />
        </Box>
        <Text position={[0, 0, 0.3]} fontSize={0.2} color="black" fontWeight="bold">
          FINE SCARICO
        </Text>
      </group>

      <group position={[0, 0, -5]}>
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[4.8, 5, 64]} />
          <meshBasicMaterial color="red" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color="red">
          ZONA DI CADUTA MATERIALI - NON STOCCARE QUI
        </Text>
      </group>
    </group>
  );
}
