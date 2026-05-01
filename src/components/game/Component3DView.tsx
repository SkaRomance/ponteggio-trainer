import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder } from '@react-three/drei';
import type { InspectionData } from './ComponentInspection';

interface Component3DViewProps {
  component: InspectionData;
}

const steel = '#6f7882';
const darkSteel = '#3f464d';
const bluePaint = '#2d5a9e';
const wornPaint = '#3f6f9f';
const wood = '#8b5a2b';
const darkWood = '#4f2d18';
const rust = '#8a4b27';
const grime = '#2f2f2f';
const oxidation = '#4f8f78';

function RustPatch({ position, scale = [0.28, 0.04, 0.22] }: { position: [number, number, number]; scale?: [number, number, number] }) {
  return (
    <Box args={scale} position={position}>
      <meshStandardMaterial color={rust} roughness={1} />
    </Box>
  );
}

function Crack({ position, rotation = [0, 0, 0], length = 0.75 }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number }) {
  return (
    <Box args={[0.04, 0.035, length]} position={position} rotation={rotation}>
      <meshStandardMaterial color={grime} roughness={1} />
    </Box>
  );
}

function WearPatch({ position, scale = [0.55, 0.04, 0.36] }: { position: [number, number, number]; scale?: [number, number, number] }) {
  return (
    <Box args={scale} position={position}>
      <meshStandardMaterial color="#c8c0b4" roughness={0.95} />
    </Box>
  );
}

function Tube({
  rotation = [0, 0, Math.PI / 2],
  damageType,
}: {
  rotation?: [number, number, number];
  damageType?: InspectionData['damageType'];
}) {
  const crushed = damageType === 'schiacciamento' || damageType === 'piegatura';

  return (
    <group rotation={rotation}>
      <Cylinder args={[0.12, 0.12, 3.4, 24]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.5} />
      </Cylinder>
      {crushed && (
        <>
          <Box args={[0.34, 0.08, 0.36]} position={[0, 0, 0.25]}>
            <meshStandardMaterial color={grime} roughness={0.9} />
          </Box>
          <RustPatch position={[0.16, 0.1, -0.7]} scale={[0.24, 0.03, 0.28]} />
        </>
      )}
    </group>
  );
}

function BasePlate({ component }: { component: InspectionData }) {
  return (
    <>
      <Box args={[2, 0.22, 2]} castShadow>
        <meshStandardMaterial color="#666666" metalness={0.4} roughness={0.55} />
      </Box>
      <Cylinder args={[0.22, 0.22, 1.05, 24]} position={[0, 0.62, 0]} castShadow>
        <meshStandardMaterial color={darkSteel} metalness={0.45} roughness={0.45} />
      </Cylinder>
      <Cylinder args={[0.46, 0.46, 0.16, 6]} position={[0, 0.32, 0]} castShadow>
        <meshStandardMaterial color="#555555" metalness={0.4} roughness={0.5} />
      </Cylinder>
      {component.damageType === 'corrosione' && (
        <>
          <RustPatch position={[0.64, 0.14, 0.58]} />
          <RustPatch position={[-0.56, 0.14, -0.42]} scale={[0.18, 0.04, 0.3]} />
        </>
      )}
      {component.damageType === 'filettatura_spanata' && (
        <>
          <Box args={[0.5, 0.22, 0.3]} position={[0.22, 0.76, 0]}>
            <meshStandardMaterial color="#b8b2aa" roughness={1} />
          </Box>
          <Crack position={[0.12, 0.36, 0.42]} rotation={[0, 0.35, 0]} length={0.5} />
        </>
      )}
    </>
  );
}

function Frame({ component }: { component: InspectionData }) {
  const deformed = component.damageType === 'deformazione';
  const crackedWeld = component.damageType === 'saldatura_crepata';

  return (
    <>
      <Box args={[0.18, 4, 0.18]} position={[-0.9, 2, 0]} rotation={deformed ? [0, 0, 0.08] : [0, 0, 0]} castShadow>
        <meshStandardMaterial color={deformed ? wornPaint : bluePaint} metalness={0.2} roughness={0.48} />
      </Box>
      <Box args={[0.18, 4, 0.18]} position={[0.9, 2, 0]} castShadow>
        <meshStandardMaterial color={bluePaint} metalness={0.2} roughness={0.48} />
      </Box>
      {[0.5, 2, 3.5].map((y) => (
        <Box key={y} args={[2, 0.18, 0.18]} position={[0, y, 0]} castShadow>
          <meshStandardMaterial color={bluePaint} metalness={0.2} roughness={0.48} />
        </Box>
      ))}
      {crackedWeld && (
        <>
          <Crack position={[-0.8, 3.52, 0.12]} rotation={[0, 0, 0.7]} length={0.5} />
          <Crack position={[0.82, 2.02, 0.12]} rotation={[0, 0, -0.55]} length={0.42} />
        </>
      )}
      {deformed && <RustPatch position={[-0.72, 2.9, 0.12]} scale={[0.22, 0.04, 0.28]} />}
    </>
  );
}

function Platform({ component }: { component: InspectionData }) {
  return (
    <>
      <Box args={[3.1, 0.16, 1.45]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.62} />
      </Box>
      <Box args={[3.1, 0.2, 0.12]} position={[0, 0.14, 0.72]}>
        <meshStandardMaterial color={darkSteel} metalness={0.3} roughness={0.54} />
      </Box>
      <Box args={[3.1, 0.2, 0.12]} position={[0, 0.14, -0.72]}>
        <meshStandardMaterial color={darkSteel} metalness={0.3} roughness={0.54} />
      </Box>
      {[-1.1, -0.55, 0, 0.55, 1.1].map((x) => (
        <Box key={x} args={[0.05, 0.03, 1.2]} position={[x, 0.12, 0]}>
          <meshStandardMaterial color="#9aa0a6" roughness={0.8} />
        </Box>
      ))}
      {component.damageType === 'usura' && (
        <>
          <WearPatch position={[0.55, 0.15, 0.25]} />
          <WearPatch position={[-0.7, 0.15, -0.22]} scale={[0.42, 0.04, 0.28]} />
        </>
      )}
      {component.damageType === 'deformazione' && (
        <Box args={[0.42, 0.18, 0.42]} position={[1.28, 0.08, -0.62]} rotation={[0, 0, -0.28]}>
          <meshStandardMaterial color={darkSteel} metalness={0.35} roughness={0.55} />
        </Box>
      )}
    </>
  );
}

function Board({ component }: { component: InspectionData }) {
  return (
    <>
      <Box args={[3.2, 0.28, 0.48]} castShadow>
        <meshStandardMaterial color={wood} roughness={0.85} />
      </Box>
      <Box args={[3.18, 0.03, 0.05]} position={[0, 0.16, -0.12]}>
        <meshStandardMaterial color={darkWood} roughness={1} />
      </Box>
      <Box args={[3.18, 0.03, 0.05]} position={[0, 0.16, 0.12]}>
        <meshStandardMaterial color={darkWood} roughness={1} />
      </Box>
      {component.damageType === 'marcescenza' && (
        <>
          <Box args={[0.62, 0.04, 0.34]} position={[0.7, 0.18, 0.04]}>
            <meshStandardMaterial color="#2b211b" roughness={1} />
          </Box>
          <Crack position={[-0.55, 0.2, 0.02]} rotation={[0, 1.2, 0]} length={0.72} />
        </>
      )}
    </>
  );
}

function Ladder({ component }: { component: InspectionData }) {
  const missingSafety = component.damageType === 'mancanza_sicura';

  return (
    <>
      <Box args={[0.12, 3.8, 0.12]} position={[-0.55, 1.9, 0]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.48} />
      </Box>
      <Box args={[0.12, 3.8, 0.12]} position={[0.55, 1.9, 0]} castShadow>
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.48} />
      </Box>
      {[0.45, 1, 1.55, 2.1, 2.65, 3.2].map((y) => (
        <Box key={y} args={[1.25, 0.11, 0.11]} position={[0, y, 0]} castShadow>
          <meshStandardMaterial color={y === 2.65 && missingSafety ? grime : steel} metalness={0.35} roughness={0.5} />
        </Box>
      ))}
      {missingSafety && <RustPatch position={[0.62, 3.45, 0.08]} scale={[0.18, 0.04, 0.28]} />}
    </>
  );
}

function Gate({ component }: { component: InspectionData }) {
  const missingSafety = component.damageType === 'mancanza_sicura';

  return (
    <>
      <Box args={[1.9, 0.14, 0.12]} position={[0, 2.8, 0]} castShadow>
        <meshStandardMaterial color={steel} />
      </Box>
      <Box args={[1.9, 0.14, 0.12]} position={[0, 0.8, 0]} castShadow>
        <meshStandardMaterial color={steel} />
      </Box>
      <Box args={[0.14, 2.1, 0.12]} position={[-0.9, 1.8, 0]} castShadow>
        <meshStandardMaterial color={steel} />
      </Box>
      <Box args={[0.14, 2.1, 0.12]} position={[0.9, 1.8, 0]} castShadow>
        <meshStandardMaterial color={steel} />
      </Box>
      {!missingSafety && (
        <Box args={[0.55, 0.12, 0.16]} position={[0.54, 1.8, 0.08]} castShadow>
          <meshStandardMaterial color={darkSteel} />
        </Box>
      )}
      {missingSafety && <RustPatch position={[0.78, 1.72, 0.08]} scale={[0.28, 0.04, 0.2]} />}
    </>
  );
}

function Grounding({ component }: { component: InspectionData }) {
  const oxidized = component.damageType === 'ossidazione_contatti';

  return (
    <>
      <Cylinder args={[0.04, 0.04, 3, 24]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <meshStandardMaterial color="#b46a2a" metalness={0.5} roughness={0.42} />
      </Cylinder>
      <Box args={[0.42, 0.2, 0.28]} position={[-1.68, 0, 0]} castShadow>
        <meshStandardMaterial color={oxidized ? oxidation : '#c07a34'} metalness={0.35} roughness={0.55} />
      </Box>
      <Box args={[0.42, 0.2, 0.28]} position={[1.68, 0, 0]} castShadow>
        <meshStandardMaterial color={oxidized ? oxidation : '#c07a34'} metalness={0.35} roughness={0.55} />
      </Box>
    </>
  );
}

function ComponentModel({ component }: { component: InspectionData }) {
  switch (component.type) {
    case 'basetta':
      return <BasePlate component={component} />;
    case 'telaio':
      return <Frame component={component} />;
    case 'impalcato':
    case 'impalcato_botola':
      return <Platform component={component} />;
    case 'fermapiede':
    case 'tavola_appoggio':
      return <Board component={component} />;
    case 'corrente':
    case 'traverso':
    case 'diagonale':
    case 'parapetto':
      return <Tube damageType={component.damageType} rotation={component.type === 'diagonale' ? [0, 0, Math.PI / 3] : [0, 0, Math.PI / 2]} />;
    case 'mantovana':
      return (
        <group rotation={[Math.PI / 5, 0, 0]}>
          <Box args={[2.8, 0.18, 1.3]} castShadow>
            <meshStandardMaterial color="#c8a114" roughness={0.68} metalness={0.15} />
          </Box>
          {component.damageType === 'usura' && <Crack position={[0.55, 0.14, 0.15]} rotation={[0, 0.8, 0]} length={0.82} />}
        </group>
      );
    case 'scaletta':
      return <Ladder component={component} />;
    case 'cancelletto':
      return <Gate component={component} />;
    case 'messa_a_terra':
    case 'palina_terra':
      return <Grounding component={component} />;
    default:
      return (
        <Box args={[1.6, 0.6, 1.2]} castShadow>
          <meshStandardMaterial color={steel} metalness={0.25} roughness={0.55} />
        </Box>
      );
  }
}

export default function Component3DView({ component }: Component3DViewProps) {
  return (
    <div className="component-3d-view">
      <Canvas camera={{ position: [3.5, 3.2, 4], fov: 46 }}>
        <ambientLight intensity={0.72} />
        <directionalLight position={[5, 6, 5]} intensity={1.1} castShadow />
        <pointLight position={[-4, 2, -3]} intensity={0.35} />

        <group position={[0, component.type === 'telaio' || component.type === 'scaletta' || component.type === 'cancelletto' ? -1.2 : 0, 0]}>
          <ComponentModel component={component} />
        </group>

        <OrbitControls enablePan={false} enableZoom={true} minDistance={2.2} maxDistance={10} autoRotate={false} />
        <gridHelper args={[10, 10, '#b8b2aa', '#ded8ce']} position={[0, -0.55, 0]} />
      </Canvas>

      <div className="view-controls-hint">
        Trascina per ruotare. Usa lo zoom per controllare saldature, agganci e superfici.
      </div>
    </div>
  );
}
