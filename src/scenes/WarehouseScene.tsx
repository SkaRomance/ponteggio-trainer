import { useRef, useState } from 'react';
import { Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Text } from '@react-three/drei';
import Avatar3D from '../components/game/Avatar3D';

// Componenti base del ponteggio
function Basetta({ position, onClick, isSelected, isInspected }: { 
  position: Vector3; 
  onClick: () => void; 
  isSelected: boolean;
  isInspected: boolean;
}) {
  const color = isInspected ? '#00ff00' : (isSelected ? '#ffff00' : '#666666');
  
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
    </group>
  );
}

function Telaio({ position, onClick, isSelected, isInspected }: { 
  position: Vector3; 
  onClick: () => void; 
  isSelected: boolean;
  isInspected: boolean;
}) {
  const color = isInspected ? '#00ff00' : (isSelected ? '#ffff00' : '#4a90e2');
  
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
    </group>
  );
}

function Impalcato({ position, onClick, isSelected, isInspected }: { 
  position: Vector3; 
  onClick: () => void; 
  isSelected: boolean;
  isInspected: boolean;
}) {
  const color = isInspected ? '#00ff00' : (isSelected ? '#ffff00' : '#8B4513');
  
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
    </group>
  );
}



export default function WarehouseScene() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [inspectedItems, setInspectedItems] = useState<Set<string>>(new Set());
  const [showInspectionPanel, setShowInspectionPanel] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<any>(null);
  
  const groupRef = useRef<Mesh>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
    }
  });

  const handleInspect = (id: string, type: string) => {
    setSelectedItem(id);
    
    // Simulate inspection result (random damage state)
    const isDamaged = Math.random() < 0.3; // 30% chance of damage
    const inspection = {
      id,
      type,
      isDamaged,
      damageType: isDamaged ? ['corrosione', 'deformazione', 'crepa'][Math.floor(Math.random() * 3)] : null,
      integrity: isDamaged ? Math.floor(Math.random() * 40) + 10 : 100,
    };
    
    setCurrentInspection(inspection);
    setShowInspectionPanel(true);
    setInspectedItems(prev => new Set(prev).add(id));
  };

  const closeInspection = () => {
    setShowInspectionPanel(false);
    setCurrentInspection(null);
  };

  return (
    <>
      <group ref={groupRef}>
        {/* Pavimento magazzino */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.8} />
        </mesh>

        {/* Area magazzino - muri */}
        <Box args={[30, 5, 0.5]} position={[0, 2.5, -15]} receiveShadow>
          <meshStandardMaterial color="#555" />
        </Box>
        <Box args={[0.5, 5, 30]} position={[-15, 2.5, 0]} receiveShadow>
          <meshStandardMaterial color="#555" />
        </Box>

        {/* Testo istruzione */}
        <Text position={[0, 4, -8]} fontSize={0.6} color="#00C851" anchorX="center">
          FASE 1: MAGAZZINO
        </Text>
        <Text position={[0, 3.2, -8]} fontSize={0.3} color="#ffffff" anchorX="center">
          Usa WASD per muovere l'operaio e avvicinati ai componenti
        </Text>

        {/* Avatar del lavoratore */}
        <Avatar3D position={[0, 0, 8]} hasHelmet={true} hasHarness={true} hasGloves={true} />

        {/* Area componenti - Basette */}
        <group position={[-5, 0, -2]}>
          <Text position={[0, 2.5, 0]} fontSize={0.25} color="#aaaaaa">Basette</Text>
          {[0, 1, 2].map((i) => (
            <Basetta
              key={`basetta-${i}`}
              position={new Vector3(i * 1.5, 0.05, 0)}
              onClick={() => handleInspect(`basetta-${i}`, 'basetta')}
              isSelected={selectedItem === `basetta-${i}`}
              isInspected={inspectedItems.has(`basetta-${i}`)}
            />
          ))}
        </group>

        {/* Area componenti - Telai */}
        <group position={[0, 0, -2]}>
          <Text position={[0, 2.5, 0]} fontSize={0.25} color="#aaaaaa">Telai</Text>
          {[0, 1].map((i) => (
            <Telaio
              key={`telaio-${i}`}
              position={new Vector3(i * 2 - 0.5, 0, 0)}
              onClick={() => handleInspect(`telaio-${i}`, 'telaio')}
              isSelected={selectedItem === `telaio-${i}`}
              isInspected={inspectedItems.has(`telaio-${i}`)}
            />
          ))}
        </group>

        {/* Area componenti - Impalcato */}
        <group position={[5, 0, -2]}>
          <Text position={[0, 2.5, 0]} fontSize={0.25} color="#aaaaaa">Impalcato</Text>
          {[0, 1, 2].map((i) => (
            <Impalcato
              key={`impalcato-${i}`}
              position={new Vector3(i * 1.5 - 0.75, 0.025, 0)}
              onClick={() => handleInspect(`impalcato-${i}`, 'impalcato')}
              isSelected={selectedItem === `impalcato-${i}`}
              isInspected={inspectedItems.has(`impalcato-${i}`)}
            />
          ))}
        </group>

        {/* Indicatori */}
        <Text position={[-6, 0.5, 4]} fontSize={0.2} color="#ffff00">
          ← Avvicinati e clicca per ispezionare
        </Text>
      </group>

      {/* HTML Inspection Panel - rendered as overlay */}
      {showInspectionPanel && currentInspection && (
        <InspectionPanel 
          inspection={currentInspection} 
          onClose={closeInspection}
        />
      )}
    </>
  );
}

// Inspection Panel Component
function InspectionPanel({ inspection, onClose }: { inspection: any; onClose: () => void }) {
  return (
    <div className="inspection-panel-overlay">
      <div className="inspection-panel">
        <h3>Ispezione {inspection.type}</h3>
        <div className="inspection-content">
          {inspection.isDamaged ? (
            <>
              <p className="damage-warning">⚠️ Componente DANNEGGIATO!</p>
              <p>Tipo danno: {inspection.damageType}</p>
              <p>Integrità: {inspection.integrity}%</p>
              <div className="inspection-actions">
                <button className="btn-scarta">Scarta</button>
              </div>
            </>
          ) : (
            <>
              <p className="ok-status">✓ Componente OK</p>
              <p>Integrità: {inspection.integrity}%</p>
              <div className="inspection-actions">
                <button className="btn-carica">Carica sul camion</button>
              </div>
            </>
          )}
        </div>
        <button className="btn-close" onClick={onClose}>Chiudi</button>
      </div>
    </div>
  );
}
