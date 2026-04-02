import { useRef, useState, useCallback, useEffect } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Box, Cylinder, Text } from '@react-three/drei';
import Avatar3D from '../components/game/Avatar3D';
import ComponentInspection from '../components/game/ComponentInspection';
import type { InspectionData } from '../components/game/ComponentInspection';
import { useGameStore } from '../stores/gameStore';

// Componenti base del ponteggio
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

// Dati componenti con stati di danno
const generateComponentData = (): Record<string, InspectionData> => {
  const components: Record<string, InspectionData> = {};
  
  // Basette
  [0, 1, 2].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`basetta-${i}`] = {
      id: `basetta-${i}`,
      type: 'basetta',
      name: `Basetta ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? 'corrosione' : undefined,
      damageDescription: isDamaged 
        ? "Presenta segni di ruggine visibili sulla superficie metallica. La vite di regolazione è corrosta."
        : "Superficie metallica intatta, vite di regolazione funzionante."
    };
  });
  
  // Telai
  [0, 1].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`telaio-${i}`] = {
      id: `telaio-${i}`,
      type: 'telaio',
      name: `Telaio ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? 'deformazione' : undefined,
      damageDescription: isDamaged
        ? "Il montante sinistro presenta una leggera curvatura. Potrebbe compromettere la stabilità."
        : "Montanti perfettamente allineati, saldature intatte."
    };
  });
  
  // Impalcato
  [0, 1, 2].forEach(i => {
    const isDamaged = Math.random() < 0.3;
    components[`impalcato-${i}`] = {
      id: `impalcato-${i}`,
      type: 'impalcato',
      name: `Impalcato ${i + 1}`,
      isDamaged,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 20 : 100,
      damageType: isDamaged ? 'usura' : undefined,
      damageDescription: isDamaged
        ? "La superficie di calpestio mostra segni di usura eccessiva e assottigliamento in alcuni punti."
        : "Superficie di calpestio in buone condizioni, spessore regolare."
    };
  });
  
  return components;
};

export default function WarehouseScene() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [inspectedItems, setInspectedItems] = useState<Set<string>>(new Set());
  const [nearbyItem, setNearbyItem] = useState<string | null>(null);
  const [showInspection, setShowInspection] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<InspectionData | null>(null);
  const [avatarPosition, setAvatarPosition] = useState(new Vector3(0, 0, 8));
  const [componentData] = useState(() => generateComponentData());
  const [cameraMode, setCameraMode] = useState<'follow' | 'overview'>('follow');
  const [overviewTarget, setOverviewTarget] = useState<Vector3 | null>(null);
  
  const { camera } = useThree();
  const { addScore, reduceHealth, addError } = useGameStore();
  const groupRef = useRef<Mesh>(null);
  
  // Posizioni componenti per proximity check
  const componentPositions = useRef<Record<string, Vector3>>({
    'basetta-0': new Vector3(-5 + 0 * 1.5, 0.05, -2),
    'basetta-1': new Vector3(-5 + 1 * 1.5, 0.05, -2),
    'basetta-2': new Vector3(-5 + 2 * 1.5, 0.05, -2),
    'telaio-0': new Vector3(0 + 0 * 2 - 0.5, 0, -2),
    'telaio-1': new Vector3(0 + 1 * 2 - 0.5, 0, -2),
    'impalcato-0': new Vector3(5 + 0 * 1.5 - 0.75, 0.025, -2),
    'impalcato-1': new Vector3(5 + 1 * 1.5 - 0.75, 0.025, -2),
    'impalcato-2': new Vector3(5 + 2 * 1.5 - 0.75, 0.025, -2),
  });
  
  // Proximity detection
  useFrame(() => {
    if (cameraMode === 'overview') return;
    
    let closestItem: string | null = null;
    let closestDistance = Infinity;
    const interactionDistance = 2.5;
    
    Object.entries(componentPositions.current).forEach(([id, pos]) => {
      const distance = avatarPosition.distanceTo(pos);
      if (distance < interactionDistance && distance < closestDistance) {
        closestDistance = distance;
        closestItem = id;
      }
    });
    
    setNearbyItem(closestItem);
  });
  
  // Tasto E per interagire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && nearbyItem && !showInspection) {
        handleInspect(nearbyItem);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyItem, showInspection]);
  
  const handleInspect = useCallback((id: string) => {
    const component = componentData[id];
    if (!component || inspectedItems.has(id)) return;
    
    setSelectedItem(id);
    setCurrentInspection(component);
    setShowInspection(true);
    setCameraMode('overview');
    
    // Imposta target camera per overview
    const pos = componentPositions.current[id];
    setOverviewTarget(pos.clone());
    
    // Muovi camera in posizione overview
    const overviewPos = pos.clone().add(new Vector3(3, 2, 3));
    camera.position.copy(overviewPos);
    camera.lookAt(pos);
  }, [componentData, inspectedItems, camera]);
  
  const handleDecision = useCallback((_decision: 'usable' | 'damaged', correct: boolean) => {
    if (!currentInspection) return;
    
    setTimeout(() => {
      setShowInspection(false);
      setCameraMode('follow');
      setOverviewTarget(null);
      
      if (correct) {
        addScore(50);
        setInspectedItems(prev => new Set(prev).add(currentInspection.id));
      } else {
        reduceHealth(20);
        addError({
          code: 'WRONG_EVALUATION',
          severity: 'medium',
          messageKey: 'error.wrongEvaluation',
          phase: 'warehouse',
        });
      }
    }, 500);
  }, [currentInspection, addScore, reduceHealth, addError]);
  
  // Camera follow in modalità normale
  useFrame(() => {
    if (cameraMode === 'follow') {
      const cameraOffset = new Vector3(0, 7, 10);
      const targetCameraPos = avatarPosition.clone().add(cameraOffset);
      camera.position.lerp(targetCameraPos, 0.05);
      camera.lookAt(avatarPosition.x, avatarPosition.y + 1.5, avatarPosition.z);
    } else if (cameraMode === 'overview' && overviewTarget) {
      // Camera fissa in modalità overview
      camera.lookAt(overviewTarget);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        {/* Pavimento magazzino */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
        </mesh>

        {/* Muri magazzino */}
        <Box args={[30, 5, 0.5]} position={[0, 2.5, -15]} receiveShadow>
          <meshStandardMaterial color="#555" />
        </Box>
        <Box args={[0.5, 5, 30]} position={[-15, 2.5, 0]} receiveShadow>
          <meshStandardMaterial color="#555" />
        </Box>

        {/* Titolo */}
        <Text position={[0, 4, -8]} fontSize={0.6} color="#00C851" anchorX="center">
          FASE 1: MAGAZZINO
        </Text>
        <Text position={[0, 3.2, -8]} fontSize={0.25} color="#ffffff" anchorX="center">
          Avvicinati ai componenti e premi [E] per ispezionarli
        </Text>

        {/* Avatar */}
        <Avatar3D 
          position={[0, 0, 8]} 
          hasHelmet={true} 
          hasHarness={true} 
          hasGloves={true}
          onMove={setAvatarPosition}
        />

        {/* Area Basette */}
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

        {/* Area Telai */}
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

        {/* Area Impalcato */}
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

        {/* Istruzioni */}
        <Text position={[-6, 0.5, 4]} fontSize={0.2} color="#ffff00">
          ← Usa WASD per muoverti, E per interagire
        </Text>
      </group>

      {/* Pannello Ispezione */}
      {showInspection && currentInspection && (
        <ComponentInspection
          component={currentInspection}
          onDecision={handleDecision}
        />
      )}
    </>
  );
}
