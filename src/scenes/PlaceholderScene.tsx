import { Text } from '@react-three/drei';

export default function PlaceholderScene({ phaseName, phaseIcon }: { phaseName: string; phaseIcon: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#2d2d2d" roughness={0.8} />
      </mesh>
      <Text position={[0, 4, -5]} fontSize={0.8} color="#00C851" anchorX="center">
        {phaseIcon} FASE: {phaseName.toUpperCase()}
      </Text>
      <Text position={[0, 3, -5]} fontSize={0.3} color="#ffffff" anchorX="center">
        Contenuto in sviluppo...
      </Text>
    </group>
  );
}
