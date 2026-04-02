import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { Box, Cylinder, Sphere } from '@react-three/drei';

interface Avatar3DProps {
  position?: [number, number, number];
  hasHelmet?: boolean;
  hasHarness?: boolean;
  hasGloves?: boolean;
}

export default function Avatar3D({ 
  position = [0, 0, 0], 
  hasHelmet = true,
  hasHarness = true,
  hasGloves = true 
}: Avatar3DProps) {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();
  const [currentPos, setCurrentPos] = useState(new Vector3(...position));
  const [targetPos, setTargetPos] = useState<Vector3 | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [walkCycle, setWalkCycle] = useState(0);
  
  // Movement speed
  const speed = 0.08;
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!groupRef.current) return;
      
      const forward = new Vector3(0, 0, 1).applyQuaternion(groupRef.current.quaternion);
      const right = new Vector3(1, 0, 0).applyQuaternion(groupRef.current.quaternion);
      
      let moveDir = new Vector3();
      
      switch(e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          moveDir.add(forward);
          break;
        case 's':
        case 'arrowdown':
          moveDir.sub(forward);
          break;
        case 'a':
        case 'arrowleft':
          moveDir.sub(right);
          break;
        case 'd':
        case 'arrowright':
          moveDir.add(right);
          break;
      }
      
      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(speed);
        setTargetPos(currentPos.clone().add(moveDir));
        setIsMoving(true);
      }
    };
    
    const handleKeyUp = () => {
      setIsMoving(false);
      setTargetPos(null);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentPos, speed]);
  
  // Click to move
  // Click-to-move: TODO implementare con raycaster
  // Per ora solo controlli WASD
  
  // Animation and movement
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Movement
    if (targetPos && isMoving) {
      const direction = targetPos.clone().sub(currentPos);
      const distance = direction.length();
      
      if (distance > 0.1) {
        direction.normalize().multiplyScalar(speed);
        const newPos = currentPos.clone().add(direction);
        setCurrentPos(newPos);
        groupRef.current.position.copy(newPos);
        
        // Rotate towards movement direction
        const angle = Math.atan2(direction.x, direction.z);
        groupRef.current.rotation.y = angle;
        
        // Walking animation
        setWalkCycle(prev => prev + delta * 10);
      } else {
        setIsMoving(false);
        setTargetPos(null);
        setWalkCycle(0);
      }
    }
    
    // Camera follow
    const cameraOffset = new Vector3(0, 8, 12);
    const targetCameraPos = currentPos.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(currentPos.x, currentPos.y + 2, currentPos.z);
    
    // Limb animation
    if (groupRef.current) {
      const leftArm = groupRef.current.getObjectByName('leftArm');
      const rightArm = groupRef.current.getObjectByName('rightArm');
      const leftLeg = groupRef.current.getObjectByName('leftLeg');
      const rightLeg = groupRef.current.getObjectByName('rightLeg');
      
      if (isMoving) {
        const swing = Math.sin(walkCycle) * 0.5;
        if (leftArm) leftArm.rotation.x = swing;
        if (rightArm) rightArm.rotation.x = -swing;
        if (leftLeg) leftLeg.rotation.x = -swing;
        if (rightLeg) rightLeg.rotation.x = swing;
      } else {
        // Idle breathing
        const breath = Math.sin(state.clock.elapsedTime * 2) * 0.05;
        if (leftArm) leftArm.rotation.x = breath;
        if (rightArm) rightArm.rotation.x = -breath;
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
      }
    }
  });
  
  return (
    <group ref={groupRef} position={position}>
      {/* Worker Avatar - Low Poly */}
      
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
        
        {/* Helmet (if equipped) */}
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
        {/* Glove */}
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
        {/* Glove */}
        {hasGloves && (
          <Box args={[0.15, 0.15, 0.15]} position={[0, -0.55, 0]} castShadow>
            <meshStandardMaterial color="#333" />
          </Box>
        )}
      </group>
      
      {/* Harness (if equipped) */}
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
      
      {/* Left Leg */}
      <group name="leftLeg" position={[0.15, 0.6, 0]}>
        <Cylinder args={[0.1, 0.1, 0.6]} position={[0, -0.3, 0]} castShadow>
          <meshStandardMaterial color="#2C3E50" />
        </Cylinder>
        {/* Boot */}
        <Box args={[0.15, 0.2, 0.25]} position={[0, -0.65, 0.05]} castShadow>
          <meshStandardMaterial color="#8B4513" />
        </Box>
      </group>
      
      {/* Right Leg */}
      <group name="rightLeg" position={[-0.15, 0.6, 0]}>
        <Cylinder args={[0.1, 0.1, 0.6]} position={[0, -0.3, 0]} castShadow>
          <meshStandardMaterial color="#2C3E50" />
        </Cylinder>
        {/* Boot */}
        <Box args={[0.15, 0.2, 0.25]} position={[0, -0.65, 0.05]} castShadow>
          <meshStandardMaterial color="#8B4513" />
        </Box>
      </group>
      
      {/* Shadow circle under feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.4, 32]} />
        <meshBasicMaterial color="#000" opacity={0.3} transparent />
      </mesh>
    </group>
  );
}
