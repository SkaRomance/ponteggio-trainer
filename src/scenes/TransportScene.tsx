import { useState, useEffect } from 'react';
import { Vector3 } from 'three';
import { Box, Text, Center, Float } from '@react-three/drei';
import { useGameStore } from '../stores/gameStore';
import Avatar3D from '../components/game/Avatar3D';

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
      case 'basetta': return '#666';
      case 'telaio': return '#4a90e2';
      case 'impalcato': return '#8B4513';
      default: return '#999';
    }
  };

  return (
    <group position={position} onClick={() => onLoad(id)}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Box args={[1, 0.2, 1]} castShadow>
          <meshStandardMaterial color={getColor()} metalness={0.6} roughness={0.2} />
        </Box>
        {isSelected && (
          <Box args={[1.1, 0.3, 1.1]}>
            <meshBasicMaterial color="#ffcc00" wireframe />
          </Box>
        )}
      </Float>
      <Text position={[0, 0.5, 0]} fontSize={0.2} color="white" anchorX="center">
        {type.toUpperCase()}
      </Text>
    </group>
  );
}

export default function TransportScene() {
  const { loadedItems, setLoadedItems, nextPhase, unlockPhase, addError, addScore } = useGameStore();
  const [itemsOnGround, setItemsOnGround] = useState<string[]>([]);
  const [itemsOnTruck, setItemsOnTruck] = useState<{id: string, pos: Vector3}[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 10));

  useEffect(() => {
    setItemsOnGround(loadedItems);
    setLoadedItems([]); 
  }, []);

  const handleLoadItem = (id: string) => {
    setSelectedItemId(id === selectedItemId ? null : id);
  };

  const handlePlaceOnTruck = (e: any) => {
    if (!selectedItemId) return;
    e.stopPropagation();

    const point = e.point;
    if (point.z < -2 && point.z > -10 && Math.abs(point.x) < 4) {
      const newItem = { id: selectedItemId, pos: new Vector3(point.x, 1.2, point.z) };
      setItemsOnTruck(prev => [...prev, newItem]);
      setItemsOnGround(prev => prev.filter(item => item !== selectedItemId));
      setSelectedItemId(null);
      addScore(20);
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
      alert("Hai dimenticato dei pezzi a terra!");
      return;
    }

    const avgX = itemsOnTruck.reduce((acc, item) => acc + item.pos.x, 0) / itemsOnTruck.length;
    if (Math.abs(avgX) > 1.5) {
      addError({
        code: 'BAD_BALANCE',
        severity: 'high',
        messageKey: 'error.badBalance',
        phase: 'transport'
      });
      alert("Attenzione! Il carico è sbilanciato. Rischio ribaltamento.");
    }

    setLoadedItems(itemsOnTruck.map(i => i.id));
    unlockPhase('storage');
    nextPhase();
  };

  return (
    <group>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      <group position={[0, 0, -6]}>
        <Box args={[4, 4, 3]} position={[0, 2, -6]} castShadow>
          <meshStandardMaterial color="#222" />
        </Box>
        <mesh position={[0, 0.5, 0]} receiveShadow onClick={handlePlaceOnTruck}>
          <Box args={[8, 1, 10]}>
            <meshStandardMaterial color="#333" />
          </Box>
        </mesh>
        <Box args={[0.2, 1.5, 10]} position={[4, 1.25, 0]}><meshStandardMaterial color="#444" /></Box>
        <Box args={[0.2, 1.5, 10]} position={[-4, 1.25, 0]}><meshStandardMaterial color="#444" /></Box>
        <Box args={[8, 1.5, 0.2]} position={[0, 1.25, 5]}><meshStandardMaterial color="#444" /></Box>
      </group>

      <group position={[-6, 0.5, 2]}>
        {itemsOnGround.map((id, index) => {
          const type = id.split('-')[0];
          return (
            <LoadableItem 
              key={id} 
              id={id} 
              type={type} 
              position={[ (index % 3) * 2, 0, Math.floor(index / 3) * 2 ]} 
              onLoad={handleLoadItem}
              isSelected={selectedItemId === id}
            />
          );
        })}
      </group>

      {itemsOnTruck.map((item) => (
        <Box key={item.id} args={[1, 0.2, 1]} position={[item.pos.x, item.pos.y, item.pos.z]} castShadow>
          <meshStandardMaterial color="#ffcc00" />
        </Box>
      ))}

      <Avatar3D position={avatarPosition.toArray()} onMove={setAvatarPosition} />

      <Center top position={[0, 5, -6]}>
        <Text fontSize={0.5} color="var(--mars-yellow)" font="Space Grotesk">
          CARICA IL MEZZO
        </Text>
        <Text position={[0, -0.7, 0]} fontSize={0.2} color="white">
          CLICCA UN PEZZO E POI IL CASSONE PER POSIZIONARLO
        </Text>
      </Center>

      <group position={[6, 1, 0]} onClick={handleFinishPhase}>
        <Box args={[2, 1, 0.5]}>
          <meshStandardMaterial color={itemsOnGround.length === 0 ? "#ffcc00" : "#444"} />
        </Box>
        <Text position={[0, 0, 0.3]} fontSize={0.2} color="black" fontWeight="bold">
          CONFERMA CARICO
        </Text>
      </group>
    </group>
  );
}
