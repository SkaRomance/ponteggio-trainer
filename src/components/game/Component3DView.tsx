import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Text } from '@react-three/drei';
import type { InspectionData } from './ComponentInspection';

interface Component3DViewProps {
  component: InspectionData;
}

// Vista 3D del componente nel pannello ispezione
export default function Component3DView({ component }: Component3DViewProps) {
  const color = component.isDamaged ? '#ff3333' : '#00ff00';
  
  return (
    <div className="component-3d-view">
      <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-5, -5, -5]} intensity={0.5} />
        
        {/* Componente ingrandito */}
        <group>
          {component.type === 'basetta' && (
            <>
              <Box args={[2, 0.25, 2]} castShadow>
                <meshStandardMaterial 
                  color={component.integrity < 50 ? '#8B4513' : '#666666'} 
                  roughness={0.6}
                />
              </Box>
              <Cylinder args={[0.25, 0.25, 0.75]} position={[0, 0.5, 0]} castShadow>
                <meshStandardMaterial 
                  color={component.integrity < 50 ? '#8B4513' : '#444444'} 
                />
              </Cylinder>
              {/* Indicatore ruggine */}
              {component.isDamaged && (
                <>
                  <Box args={[0.3, 0.3, 0.3]} position={[0.6, 0.2, 0.6]}>
                    <meshStandardMaterial color="#8B4513" />
                  </Box>
                  <Box args={[0.2, 0.2, 0.2]} position={[-0.5, 0.1, -0.4]}>
                    <meshStandardMaterial color="#654321" />
                  </Box>
                </>
              )}
            </>
          )}
          
          {component.type === 'telaio' && (
            <>
              {/* Montanti */}
              <Box 
                args={[0.2, 4, 0.2]} 
                position={[-0.9, 2, 0]} 
                castShadow
                rotation={component.isDamaged ? [0, 0, 0.1] : [0, 0, 0]}
              >
                <meshStandardMaterial color={component.isDamaged ? '#ff6666' : '#4a90e2'} />
              </Box>
              <Box args={[0.2, 4, 0.2]} position={[0.9, 2, 0]} castShadow>
                <meshStandardMaterial color="#4a90e2" />
              </Box>
              {/* Traversi */}
              <Box args={[2, 0.2, 0.2]} position={[0, 2, 0]} castShadow>
                <meshStandardMaterial color="#4a90e2" />
              </Box>
              <Box args={[2, 0.2, 0.2]} position={[0, 0.5, 0]} castShadow>
                <meshStandardMaterial color="#4a90e2" />
              </Box>
              <Box args={[2, 0.2, 0.2]} position={[0, 3.5, 0]} castShadow>
                <meshStandardMaterial color="#4a90e2" />
              </Box>
              {/* Indicatore deformazione */}
              {component.isDamaged && (
                <Text position={[1.5, 2.5, 0]} fontSize={0.5} color="#ff0000">
                  ⚠️
                </Text>
              )}
            </>
          )}
          
          {component.type === 'impalcato' && (
            <>
              {/* Piano di calpestio */}
              <Box 
                args={[2.5, 0.1, 1.5]} 
                castShadow
              >
                <meshStandardMaterial 
                  color={component.isDamaged ? '#A0522D' : '#8B4513'} 
                  roughness={0.9}
                />
              </Box>
              {/* Bordi */}
              <Box args={[2.5, 0.15, 0.1]} position={[0, 0.1, 0.7]}>
                <meshStandardMaterial color="#654321" />
              </Box>
              <Box args={[2.5, 0.15, 0.1]} position={[0, 0.1, -0.7]}>
                <meshStandardMaterial color="#654321" />
              </Box>
              {/* Indicatore usura */}
              {component.isDamaged && (
                <>
                  <Box args={[0.5, 0.05, 0.5]} position={[0.5, 0.08, 0.3]}>
                    <meshStandardMaterial color="#D2691E" opacity={0.7} transparent />
                  </Box>
                  <Box args={[0.3, 0.05, 0.3]} position={[-0.6, 0.08, -0.2]}>
                    <meshStandardMaterial color="#D2691E" opacity={0.7} transparent />
                  </Box>
                </>
              )}
            </>
          )}
          
          {/* Badge stato */}
          <Text 
            position={[0, component.type === 'basetta' ? 1 : 4.5, 0]} 
            fontSize={0.4} 
            color={color}
          >
            {component.isDamaged ? '⚠️ DANNEGGIATO' : '✓ OK'}
          </Text>
        </group>
        
        {/* Controlli orbit */}
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={10}
          autoRotate={false}
        />
        
        {/* Griglia di riferimento */}
        <gridHelper args={[10, 10, '#444444', '#222222']} position={[0, -0.5, 0]} />
      </Canvas>
      
      <div className="view-controls-hint">
        🖱️ Trascina per ruotare • Scroll per zoomare
      </div>
    </div>
  );
}
