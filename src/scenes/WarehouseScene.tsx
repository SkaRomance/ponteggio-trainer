import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Cylinder, Text, Float, Center } from '@react-three/drei';
import Avatar3D from '../components/game/Avatar3D';
import type { InspectionData } from '../components/game/ComponentInspection';

const MARS_PRIMARY = '#1a472a';
const MARS_ACCENT = '#2d6a4f';
const MARS_SUCCESS = '#16A34A';
const MARS_MUTED = '#555555';
const MARS_FONT = 'Inter';

interface ScaffoldingComponentProps {
  position: Vector3;
  onClick: () => void;
  isSelected: boolean;
  isInspected: boolean;
  isNearby: boolean;
  type: string;
}

// Visualizzazione migliorata per i componenti (Industrial Style)
function WarehouseComponent({ position, onClick, isSelected, isInspected, isNearby, type }: ScaffoldingComponentProps) {
  const baseColor = useMemo(() => {
    switch (type) {
      case 'basetta': return '#555';
      case 'telaio': return '#2d5a9e';
      case 'impalcato': return '#777';
      case 'corrente':
      case 'traverso':
      case 'diagonale': return '#999';
      case 'fermapiede':
      case 'tavola_appoggio': return '#8B4513';
      case 'mantovana': return '#ccaa00';
      case 'messa_a_terra':
      case 'palina_terra': return '#cd7f32';
      default: return '#666';
    }
  }, [type]);

  const color = isInspected ? '#00ff00' : (isSelected ? '#ffcc00' : isNearby ? '#00ffff' : baseColor);

  return (
    <group position={position} onClick={onClick}>
      <Float speed={isSelected ? 5 : 0} rotationIntensity={0.2} floatIntensity={0.2}>
        {/* Rappresentazione semplificata ma tecnica */}
        <mesh castShadow receiveShadow>
          {type === 'basetta' && <Box args={[0.6, 0.1, 0.6]} />}
          {type === 'telaio' && <Box args={[1, 2, 0.1]} />}
          {type === 'impalcato' && <Box args={[1.5, 0.05, 0.5]} />}
          {(type === 'corrente' || type === 'traverso' || type === 'diagonale') && <Cylinder args={[0.05, 0.05, 2]} rotation={[0, 0, Math.PI/2]} />}
          {(type === 'fermapiede' || type === 'tavola_appoggio') && <Box args={[1.5, 0.2, 0.05]} />}
          {type === 'mantovana' && <Box args={[1.2, 0.8, 0.1]} rotation={[Math.PI/4, 0, 0]} />}
          {type === 'scaletta' && <Box args={[0.4, 2, 0.1]} />}
          {type === 'cancelletto' && <Box args={[0.8, 1, 0.05]} />}
          {type === 'palina_terra' && <Cylinder args={[0.02, 0.02, 1.5]} />}
          {type === 'messa_a_terra' && <Box args={[0.1, 0.1, 0.1]} />}
          {/* Default fallback */}
          {!['basetta', 'telaio', 'impalcato', 'corrente', 'traverso', 'diagonale', 'fermapiede', 'tavola_appoggio', 'mantovana', 'scaletta', 'cancelletto', 'palina_terra', 'messa_a_terra'].includes(type) && <Box args={[0.5, 0.5, 0.5]} />}

          <meshStandardMaterial
            color={color}
            metalness={0.7}
            roughness={0.3}
            emissive={isSelected ? '#ffcc00' : '#000'}
            emissiveIntensity={isSelected ? 0.5 : 0}
          />
        </mesh>

        {isInspected && (
          <Text position={[0, 1.2, 0]} fontSize={0.2} color={MARS_SUCCESS} font={MARS_FONT}>✓ OK</Text>
        )}

        {isNearby && !isInspected && (
          <group position={[0, 1.5, 0]}>
            <Box args={[0.4, 0.2, 0.01]}>
              <meshBasicMaterial color="black" />
            </Box>
            <Text position={[0, 0, 0.02]} fontSize={0.15} color={MARS_ACCENT} font={MARS_FONT}>[E] ISPEZIONA</Text>
          </group>
        )}
      </Float>
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

export default function WarehouseScene({ inspection }: WarehouseSceneProps) {
  const {
    selectedItem,
    inspectedItems,
    nearbyItem, setNearbyItem,
    showInspection, setShowInspection,
    setCurrentInspection,
    setSelectedItem,
    componentData,
    cameraMode, setCameraMode,
  } = inspection;

  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 12));
  const { camera } = useThree();
  const avatarPosRef = useRef(avatarPosition);
  const nearbyItemRef = useRef(nearbyItem);
  const showInspectionRef = useRef(showInspection);

  useEffect(() => { avatarPosRef.current = avatarPosition; }, [avatarPosition]);
  useEffect(() => { nearbyItemRef.current = nearbyItem; }, [nearbyItem]);
  useEffect(() => { showInspectionRef.current = showInspection; }, [showInspection]);

  // Generazione dinamica delle posizioni nel magazzino
  const componentWorldPositions = useMemo(() => {
    const positions: Record<string, Vector3> = {};
    const ids = Object.keys(componentData);

    // Organizziamo in settori (file)
    const itemsPerRow = 6;
    const rowSpacing = 4;
    const colSpacing = 3;

    ids.forEach((id, i) => {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      positions[id] = new Vector3(
        col * colSpacing - (itemsPerRow * colSpacing) / 2 + 1.5,
        0.5,
        -row * rowSpacing - 5
      );
    });

    return positions;
  }, [componentData]);

  useFrame(() => {
    if (cameraMode === 'overview') return;

    let closestItem: string | null = null;
    let closestDistance = Infinity;
    const interactionDistance = 3.5;

    Object.entries(componentWorldPositions).forEach(([id, pos]) => {
      const distance = avatarPosRef.current.distanceTo(pos);
      if (distance < interactionDistance && distance < closestDistance) {
        closestDistance = distance;
        closestItem = id;
      }
    });

    if (closestItem !== nearbyItemRef.current) {
      setNearbyItem(closestItem);
    }
  });

  const handleInspect = useCallback((id: string) => {
    const component = componentData[id];
    if (!component || inspectedItems.has(id)) return;

    setSelectedItem(id);
    setCurrentInspection(component);
    setShowInspection(true);
    setCameraMode('overview');

    const pos = componentWorldPositions[id];
    const overviewPos = pos.clone().add(new Vector3(2, 2, 2));
    camera.position.copy(overviewPos);
    camera.lookAt(pos);
  }, [
    camera,
    componentData,
    componentWorldPositions,
    inspectedItems,
    setCameraMode,
    setCurrentInspection,
    setSelectedItem,
    setShowInspection,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && nearbyItemRef.current && !showInspectionRef.current) {
        handleInspect(nearbyItemRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInspect]);

  useFrame(() => {
    if (cameraMode === 'follow') {
      const cameraOffset = new Vector3(0, 8, 10);
      const targetCameraPos = avatarPosition.clone().add(cameraOffset);
      camera.position.lerp(targetCameraPos, 0.1);
      camera.lookAt(avatarPosition.x, avatarPosition.y + 1.2, avatarPosition.z);
    }
  });

  return (
    <group>
      {/* Pavimento Industriale */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Griglia a terra */}
      <gridHelper args={[100, 50, "#333", "#222"]} position={[0, 0.01, 0]} />

      {/* Mura Magazzino */}
      <Box args={[100, 10, 1]} position={[0, 5, -30]} receiveShadow>
        <meshStandardMaterial color="#222" />
      </Box>
      <Box args={[1, 10, 100]} position={[-20, 5, 0]} receiveShadow>
        <meshStandardMaterial color="#222" />
      </Box>
      <Box args={[1, 10, 100]} position={[20, 5, 0]} receiveShadow>
        <meshStandardMaterial color="#222" />
      </Box>

      {/* Renderizzazione procedurale di TUTTI i componenti dello store */}
      {Object.keys(componentData).map((id) => {
        const type = id.split('-')[0];
        return (
          <WarehouseComponent
            key={id}
            position={componentWorldPositions[id]}
            onClick={() => handleInspect(id)}
            isSelected={selectedItem === id}
            isInspected={inspectedItems.has(id)}
            isNearby={nearbyItem === id}
            type={type}
          />
        );
      })}

      <Avatar3D
        position={[0, 0, 12]}
        hasHelmet={true}
        hasHarness={true}
        onMove={setAvatarPosition}
      />

      {/* UI Spaziale */}
      <Center top position={[0, 6, -15]}>
        <Text fontSize={0.8} color={MARS_PRIMARY} font={MARS_FONT} anchorX="center">
          LOGISTICA E ISPEZIONE
        </Text>
        <Text position={[0, -0.8, 0]} fontSize={0.3} color={MARS_MUTED} font={MARS_FONT}>
          AREA VERIFICA COMPONENTI D.LGS 81/08
        </Text>
      </Center>
    </group>
  );
}
