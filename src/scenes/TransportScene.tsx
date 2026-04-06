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
      <Text position={[0, 0.5, 0]} fontSize={0.15} color="white" font="Space Grotesk">
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
    // Area cassone
    if (point.z < -2 && point.z > -12 && Math.abs(point.x) < 4) {
      const newItem = { id: selectedItemId, pos: new Vector3(point.x, 1.2, point.z) };
      setItemsOnTruck(prev => [...prev, newItem]);
      setItemsOnGround(prev => prev.filter(item => item !== selectedItemId));
      setSelectedItemId(null);
      addScore(25);
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
      alert("ATTENZIONE: CARICO INCOMPLETO. PEZZI ABBANDONATI A TERRA.");
      return;
    }

    const avgX = itemsOnTruck.reduce((acc, item) => acc + item.pos.x, 0) / itemsOnTruck.length;
    if (Math.abs(avgX) > 1.2) {
      addError({
        code: 'BAD_BALANCE',
        severity: 'high',
        messageKey: 'error.badBalance',
        phase: 'transport'
      });
      alert("ERRORE: CARICO SBILANCIATO. RISCHIO RIBALTAMENTO DEL MEZZO.");
    }

    setLoadedItems(itemsOnTruck.map(i => i.id));
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
        <Text fontSize={0.6} color="#ffcc00" font="Space Grotesk">LOGISTICA TRASPORTO</Text>
        <Text position={[0, -0.8, 0]} fontSize={0.25} color="white" font="Space Grotesk">CARICA TUTTI I PEZZI E BILANCIA IL PESO</Text>
      </Center>

      {/* Pulsante Azione */}
      <group position={[8, 1, 0]} onClick={handleFinishPhase}>
        <Box args={[3, 1.2, 0.2]} castShadow>
          <meshStandardMaterial color={itemsOnGround.length === 0 ? "#ffcc00" : "#222"} />
        </Box>
        <Text position={[0, 0, 0.15]} fontSize={0.2} color="black" fontWeight={900}>PARTENZA MEZZO</Text>
      </group>
    </group>
  );
}
