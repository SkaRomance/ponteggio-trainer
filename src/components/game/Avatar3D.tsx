import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { Box, Cylinder, Sphere, Text } from '@react-three/drei';

interface Avatar3DProps {
  position?: [number, number, number];
  hasHelmet?: boolean;
  hasHarness?: boolean;
  hasGloves?: boolean;
  onMove?: (position: Vector3) => void;
}

// Export the interface
export type { Avatar3DProps };

// Animation states
type AnimationState = 'idle' | 'walking' | 'lifting' | 'inspecting' | 'climbing';

export default function Avatar3D({
  position = [0, 0, 0],
  hasHelmet = true,
  hasHarness = true,
  hasGloves = true,
  onMove
}: Avatar3DProps) {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();
  const [currentPos, setCurrentPos] = useState(new Vector3(...position));
  // Target position for click-to-move (future feature)
  const [animState, setAnimState] = useState<AnimationState>('idle');
  const [walkCycle, setWalkCycle] = useState(0);
  const [liftProgress, setLiftProgress] = useState(0);
  const [isLifting, setIsLifting] = useState(false);
  const [showPostureWarning, setShowPostureWarning] = useState(false);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());

  const speed = 0.08;
  const rotationSpeed = 0.1;

  const applyAnimations = useCallback((state: RootState) => {
    if (!groupRef.current) return;

    const leftArm = groupRef.current.getObjectByName('leftArm') as Group | undefined;
    const rightArm = groupRef.current.getObjectByName('rightArm') as Group | undefined;
    const leftLeg = groupRef.current.getObjectByName('leftLeg') as Group | undefined;
    const rightLeg = groupRef.current.getObjectByName('rightLeg') as Group | undefined;
    const spine = groupRef.current.getObjectByName('spine') as Group | undefined;

    if (animState === 'walking') {
      const swing = Math.sin(walkCycle) * 0.6;
      const legSwing = Math.sin(walkCycle) * 0.5;

      if (leftArm) leftArm.rotation.x = swing;
      if (rightArm) rightArm.rotation.x = -swing;
      if (leftLeg) leftLeg.rotation.x = -legSwing;
      if (rightLeg) rightLeg.rotation.x = legSwing;
      if (spine) spine.rotation.y = Math.sin(walkCycle * 0.5) * 0.05;

    } else if (animState === 'lifting') {
      const liftPhase = Math.sin(liftProgress * Math.PI);

      if (leftArm) leftArm.rotation.x = -liftPhase * 1.5;
      if (rightArm) rightArm.rotation.x = -liftPhase * 1.5;
      if (leftLeg) leftLeg.rotation.x = liftPhase * 0.3;
      if (rightLeg) rightLeg.rotation.x = liftPhase * 0.3;

      if (!hasHarness && spine) {
        spine.rotation.x = liftPhase * 0.3;
      }

    } else if (animState === 'inspecting') {
      if (rightArm) rightArm.rotation.x = -0.5;
      if (rightArm) rightArm.rotation.z = -0.3;

    } else {
      const breath = Math.sin(state.clock.elapsedTime * 1.5) * 0.03;
      if (leftArm) leftArm.rotation.x = breath;
      if (rightArm) rightArm.rotation.x = -breath;
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (spine) spine.rotation.y = breath * 0.5;
    }
  }, [animState, hasHarness, liftProgress, walkCycle]);

  // Keyboard controls with smooth movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        setKeysPressed(prev => new Set(prev).add(key));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeysPressed(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Movement and animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Calculate movement direction from keys
    let moveX = 0;
    let moveZ = 0;

    if (keysPressed.has('w') || keysPressed.has('arrowup')) moveZ -= 1;
    if (keysPressed.has('s') || keysPressed.has('arrowdown')) moveZ += 1;
    if (keysPressed.has('a') || keysPressed.has('arrowleft')) moveX -= 1;
    if (keysPressed.has('d') || keysPressed.has('arrowright')) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;

    // Movement logic
    if (isMoving && animState !== 'lifting') {
      setAnimState('walking');

      const moveDir = new Vector3(moveX, 0, moveZ).normalize();
      const newPos = currentPos.clone().add(moveDir.multiplyScalar(speed));
      setCurrentPos(newPos);
      groupRef.current.position.copy(newPos);

      // Smooth rotation towards movement direction
      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      const currentRotation = groupRef.current.rotation.y;

      // Smooth interpolation for rotation
      let diff = targetRotation - currentRotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      groupRef.current.rotation.y += diff * rotationSpeed;

      // Walking animation cycle
      setWalkCycle(prev => prev + delta * 8);

      // Notify parent of position change
      onMove?.(newPos);
    } else if (animState === 'walking') {
      setAnimState('idle');
      setWalkCycle(0);
    }

    // Camera follow with smooth damping
    const cameraOffset = new Vector3(0, 7, 10);
    const targetCameraPos = currentPos.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(currentPos.x, currentPos.y + 1.5, currentPos.z);

    // Lifting animation
    if (isLifting) {
      setLiftProgress(prev => {
        const newProgress = prev + delta * 2;
        if (newProgress >= 1) {
          setTimeout(() => {
            setIsLifting(false);
            setLiftProgress(0);
            setAnimState('idle');
          }, 500);
          return 1;
        }
        return newProgress;
      });
    }

    // Posture warning if no harness during lifting
    if (isLifting && !hasHarness) {
      setShowPostureWarning(true);
    } else {
      setShowPostureWarning(false);
    }

    // Apply animations to body parts
    applyAnimations(state);
  });

  // Public method to trigger inspection
  const startInspection = useCallback(() => {
    setAnimState('inspecting');
    setTimeout(() => setAnimState('idle'), 2000);
  }, []);

  // Expose method via ref
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.startInspection = startInspection;
    }
  }, [startInspection]);

  return (
    <group ref={groupRef} position={position}>
      {/* Warning indicator for bad posture */}
      {showPostureWarning && (
        <group position={[0, 3, 0]}>
          <Text fontSize={0.3} color="red" anchorX="center">
            ⚠️ DPI MANCANTE!
          </Text>
          <Box args={[0.8, 0.05, 0.05]} position={[0, -0.3, 0]}>
            <meshBasicMaterial color="red" />
          </Box>
        </group>
      )}

      {/* Spine group for posture animation */}
      <group name="spine">
        {/* Body */}
        <Box args={[0.5, 0.7, 0.3]} position={[0, 1.15, 0]} castShadow>
          <meshStandardMaterial color="#FF6B35" />
        </Box>

        {/* High-vis vest stripes */}
        <Box args={[0.52, 0.1, 0.32]} position={[0, 1.3, 0]}>
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
        </Box>
        <Box args={[0.52, 0.1, 0.32]} position={[0, 1.1, 0]}>
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.2} />
        </Box>

        {/* Head */}
        <group position={[0, 1.7, 0]}>
          <Sphere args={[0.25, 16, 16]} castShadow>
            <meshStandardMaterial color="#FDBCB4" />
          </Sphere>

          {/* Helmet */}
          {hasHelmet && (
            <>
              <Cylinder args={[0.28, 0.28, 0.15, 16]} position={[0, 0.2, 0]} castShadow>
                <meshStandardMaterial color="#FFD700" />
              </Cylinder>
              <Cylinder args={[0.3, 0.3, 0.05, 16]} position={[0, 0.15, 0.05]} castShadow>
                <meshStandardMaterial color="#FFD700" />
              </Cylinder>
            </>
          )}
        </group>

        {/* Left Arm */}
        <group name="leftArm" position={[0.35, 1.4, 0]}>
          <Cylinder args={[0.08, 0.08, 0.5]} position={[0, -0.25, 0]} castShadow>
            <meshStandardMaterial color="#FDBCB4" />
          </Cylinder>
          {hasGloves && (
            <Box args={[0.15, 0.15, 0.15]} position={[0, -0.55, 0]} castShadow>
              <meshStandardMaterial color="#333" />
            </Box>
          )}
        </group>

        {/* Right Arm */}
        <group name="rightArm" position={[-0.35, 1.4, 0]}>
          <Cylinder args={[0.08, 0.08, 0.5]} position={[0, -0.25, 0]} castShadow>
            <meshStandardMaterial color="#FDBCB4" />
          </Cylinder>
          {hasGloves && (
            <Box args={[0.15, 0.15, 0.15]} position={[0, -0.55, 0]} castShadow>
              <meshStandardMaterial color="#333" />
            </Box>
          )}
        </group>

        {/* Harness */}
        {hasHarness && (
          <>
            <Box args={[0.52, 0.05, 0.32]} position={[0, 1.4, 0]}>
              <meshStandardMaterial color="#8B0000" />
            </Box>
            <Box args={[0.52, 0.05, 0.32]} position={[0, 1.0, 0]}>
              <meshStandardMaterial color="#8B0000" />
            </Box>
            <Cylinder args={[0.03, 0.03, 0.4]} position={[0.2, 1.2, 0]}>
              <meshStandardMaterial color="#8B0000" />
            </Cylinder>
            <Cylinder args={[0.03, 0.03, 0.4]} position={[-0.2, 1.2, 0]}>
              <meshStandardMaterial color="#8B0000" />
            </Cylinder>
          </>
        )}
      </group>

      {/* Left Leg */}
      <group name="leftLeg" position={[0.15, 0.6, 0]}>
        <Cylinder args={[0.1, 0.1, 0.6]} position={[0, -0.3, 0]} castShadow>
          <meshStandardMaterial color="#2C3E50" />
        </Cylinder>
        <Box args={[0.15, 0.2, 0.25]} position={[0, -0.65, 0.05]} castShadow>
          <meshStandardMaterial color="#8B4513" />
        </Box>
      </group>

      {/* Right Leg */}
      <group name="rightLeg" position={[-0.15, 0.6, 0]}>
        <Cylinder args={[0.1, 0.1, 0.6]} position={[0, -0.3, 0]} castShadow>
          <meshStandardMaterial color="#2C3E50" />
        </Cylinder>
        <Box args={[0.15, 0.2, 0.25]} position={[0, -0.65, 0.05]} castShadow>
          <meshStandardMaterial color="#8B4513" />
        </Box>
      </group>

      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#000" opacity={0.3} transparent />
      </mesh>

      {/* Interaction hint */}
      <Text position={[0, 2.2, 0]} fontSize={0.15} color="#00C851" anchorX="center">
        WASD per muoverti • E per interagire
      </Text>
    </group>
  );
}
