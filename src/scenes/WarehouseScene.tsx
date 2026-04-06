import { useRef, useState, useEffect } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Cylinder, Text } from '@react-three/drei';
import Avatar3D from '../components/game/Avatar3D';
import type { InspectionData } from '../components/game/ComponentInspection';

interface ScaffoldingComponentProps {
  position: Vector3;
  onClick: () => void;
  isSelected: boolean;
  isInspected: boolean;
  isNearby: boolean;
  type: 'basetta' | 'telaio' | 'impalcato';
}

function Basetta({ position, onClick, isSelected, isInspected, isNearby }: ScaffoldingComponentProps) {
  const color = isInspected ? '#00ff00' : (isSelected ? '#ffff00' : isNearby ? '#00ffff' : '#666666');
  
  return (
    <group position={position} onClick={onClick}>
      <Box args={[0.8, 0.1, 0.8]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.8} />
      </Box>
      <Cylinder args={[0.1, 0.1, 0.3]} position={[0, 0.2, 0]}>
        <meshStandardMaterial color="#444444" />
      </Cylinder>
      {isInspected && (
        <Text position={[0, 1, 0]} fontSize={0.3} color="#00ff00">
          ✓
        </Text>
      )}
      {isNearby && !isInspected && (
        <Text position={[0, 0.8, 0]} fontSize={0.2} color="#00ffff">
          [E]
        </Text>
      )}
    </group>
  );
}

function Telaio({ position, onClick, isSelected, isInspected, isNearby }: ScaffoldingComponentProps) {
  const color = isInspected ? '#00ff00' : (isSelected ? '#ffff00' : isNearby ? '#00ffff' : '#4a90e2');
  
  return (
    <group position={position} onClick={onClick}>
      <Box args={[0.1, 2, 0.1]} position={[-0.45, 1, 0]} castShadow>
        <meshStandardMaterial color={color} />
      </Box>
      <Box args={[0.1, 2, 0.1]} position={[0.45, 1, 0]} castShadow>
        <meshStandardMaterial color={color} />
      </Box>
      <Box args={[1, 0.1, 0.1]} position={[0, 1, 0]} castShadow>
        <meshStandardMaterial color={color} />
      </Box>
      {isInspected && (
        <Text position={[0, 2.3, 0]} fontSize={0.3} color="#00ff00">
          ✓
        </Text>
      )}
      {isNearby && !isInspected && (
        <Text position={[0, 2.1, 0]} fontSize={0.2} color="#00ffff">
          [E]
        </Text>
      )}
    </group>
  );
}

function Impalcato({ position, onClick, isSelected, isInspected, isNearby }: ScaffoldingComponentProps) {
  const color = isInspected ? '#00ff00' : (isSelected ? '#ffff00' : isNearby ? '#00ffff' : '#8B4513');
  
  return (
    <group position={position} onClick={onClick}>
      <Box args={[1, 0.05, 0.6]} castShadow>
        <meshStandardMaterial color={color} roughness={0.9} />
      </Box>
      {isInspected && (
        <Text position={[0, 0.5, 0]} fontSize={0.3} color="#00ff00">
          ✓
        </Text>
      )}
      {isNearby && !isInspected && (
        <Text position={[0, 0.3, 0]} fontSize={0.2} color="#00ffff">
          [E]
        </Text>
      )}
    </group>
  );
}

interface WarehouseSceneProps {
  inspection: {
    selectedItem: string | null;
    setSelectedItem: (id: string | null) => void;
    inspectedItems: Set<string>;
    setInspectedItems: (items: Set<string>) => void;
    nearbyItem: string | null;
    setNearbyItem: (id: string | null) => void;
    showInspection: boolean;
    setShowInspection: (show: boolean) => void;
    currentInspection: InspectionData | null;
    setCurrentInspection: (data: InspectionData | null) => void;
    componentData: Record<string, InspectionData>;
    cameraMode: 'follow' | 'overview';
    setCameraMode: (mode: 'follow' | 'overview') => void;
  };
}

const COMPONENT_WORLD_POSITIONS: Record<string, Vector3> = {
  'basetta-0': new Vector3(-5, 0.05, -2),
  'basetta-1': new Vector3(-3.5, 0.05, -2),
  'basetta-2': new Vector3(-2, 0.05, -2),
  'telaio-0': new Vector3(-0.5, 0, -2),
  'telaio-1': new Vector3(1.5, 0, -2),
  'impalcato-0': new Vector3(4.25, 0.025, -2),
  'impalcato-1': new Vector3(5.75, 0.025, -2),
  'impalcato-2': new Vector3(7.25, 0.025, -2),
};

export default function WarehouseScene({ inspection }: WarehouseSceneProps) {
  const {
    selectedItem, setSelectedItem,
    inspectedItems,
    nearbyItem, setNearbyItem,
    showInspection, setShowInspection,
    setCurrentInspection,
    componentData,
    cameraMode, setCameraMode,
  } = inspection;
  
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));
  
  const { camera } = useThree();
  const groupRef = useRef<Mesh>(null);
  const avatarPosRef = useRef(avatarPosition);
  const nearbyItemRef = useRef(nearbyItem);
  const showInspectionRef = useRef(showInspection);
  
  useEffect(() => { avatarPosRef.current = avatarPosition; }, [avatarPosition]);
  useEffect(() => { nearbyItemRef.current = nearbyItem; }, [nearbyItem]);
  useEffect(() => { showInspectionRef.current = showInspection; }, [showInspection]);
  
  useFrame(() => {
    if (cameraMode === 'overview') return;
    
    let closestItem: string | null = null;
    let closestDistance = Infinity;
    const interactionDistance = 3;
    
    Object.entries(COMPONENT_WORLD_POSITIONS).forEach(([id, pos]) => {
      const distance = avatarPosRef.current.distanceTo(pos);
      if (distance < interactionDistance && distance < closestDistance) {
        closestDistance = distance;
        closestItem = id;
      }
    });
    
    setNearbyItem(closestItem);
  });
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && nearbyItemRef.current && !showInspectionRef.current) {
        handleInspect(nearbyItemRef.current);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraMode]);
  
  const handleInspect = (id: string) => {
    const component = componentData[id];
    if (!component || inspectedItems.has(id)) return;
    
    setSelectedItem(id);
    setCurrentInspection(component);
    setShowInspection(true);
    setCameraMode('overview');
    
    const pos = COMPONENT_WORLD_POSITIONS[id];
    const overviewPos = pos.clone().add(new Vector3(3, 2, 3));
    camera.position.copy(overviewPos);
    camera.lookAt(pos);
  };
  
  useFrame(() => {
    if (cameraMode === 'follow') {
      const cameraOffset = new Vector3(0, 7, 10);
      const targetCameraPos = avatarPosition.clone().add(cameraOffset);
      camera.position.lerp(targetCameraPos, 0.05);
      camera.lookAt(avatarPosition.x, avatarPosition.y + 1.5, avatarPosition.z);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
      </mesh>

      <Box args={[30, 5, 0.5]} position={[0, 2.5, -15]} receiveShadow>
        <meshStandardMaterial color="#555" />
      </Box>
      <Box args={[0.5, 5, 30]} position={[-15, 2.5, 0]} receiveShadow>
        <meshStandardMaterial color="#555" />
      </Box>

      <Text position={[0, 4, -8]} fontSize={0.6} color="#00C851" anchorX="center">
        FASE 1: MAGAZZINO
      </Text>
      <Text position={[0, 3.2, -8]} fontSize={0.25} color="#ffffff" anchorX="center">
        Avvicinati ai componenti e premi [E] per ispezionarli
      </Text>

      <Avatar3D 
        position={[0, 0, 8]} 
        hasHelmet={true} 
        hasHarness={true} 
        hasGloves={true}
        onMove={setAvatarPosition}
      />

      <group position={[-5, 0, -2]}>
        <Text position={[0, 2.5, 0]} fontSize={0.25} color="#aaaaaa">Basette</Text>
        {[0, 1, 2].map((i) => (
          <Basetta
            key={`basetta-${i}`}
            position={new Vector3(i * 1.5, 0.05, 0)}
            onClick={() => handleInspect(`basetta-${i}`)}
            isSelected={selectedItem === `basetta-${i}`}
            isInspected={inspectedItems.has(`basetta-${i}`)}
            isNearby={nearbyItem === `basetta-${i}`}
            type="basetta"
          />
        ))}
      </group>

      <group position={[0, 0, -2]}>
        <Text position={[0, 2.5, 0]} fontSize={0.25} color="#aaaaaa">Telai</Text>
        {[0, 1].map((i) => (
          <Telaio
            key={`telaio-${i}`}
            position={new Vector3(i * 2 - 0.5, 0, 0)}
            onClick={() => handleInspect(`telaio-${i}`)}
            isSelected={selectedItem === `telaio-${i}`}
            isInspected={inspectedItems.has(`telaio-${i}`)}
            isNearby={nearbyItem === `telaio-${i}`}
            type="telaio"
          />
        ))}
      </group>

      <group position={[5, 0, -2]}>
        <Text position={[0, 2.5, 0]} fontSize={0.25} color="#aaaaaa">Impalcato</Text>
        {[0, 1, 2].map((i) => (
          <Impalcato
            key={`impalcato-${i}`}
            position={new Vector3(i * 1.5 - 0.75, 0.025, 0)}
            onClick={() => handleInspect(`impalcato-${i}`)}
            isSelected={selectedItem === `impalcato-${i}`}
            isInspected={inspectedItems.has(`impalcato-${i}`)}
            isNearby={nearbyItem === `impalcato-${i}`}
            type="impalcato"
          />
        ))}
      </group>

      <Text position={[-6, 0.5, 4]} fontSize={0.2} color="#ffff00">
        ← Usa WASD per muoverti, E per interagire
      </Text>
    </group>
  );
}

export type { ScaffoldingComponentProps };
