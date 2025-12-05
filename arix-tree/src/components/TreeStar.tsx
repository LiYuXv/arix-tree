import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const TreeStar = ({ isTreeShape }: { isTreeShape: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isTreeShape) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
      // 位置调高到 10.5，避免和方块重叠
      meshRef.current.position.y = 10.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 10.5, 0]} scale={[0, 0, 0]}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial
        color="#FFD700"
        emissive="#FFD700"
        emissiveIntensity={0.8}
        metalness={1}
        roughness={0}
      />
      <pointLight distance={5} intensity={2} color="#FFD700" />
    </mesh>
  );
};