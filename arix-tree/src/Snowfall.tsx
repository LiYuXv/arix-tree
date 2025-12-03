// src/Snowfall.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowfallProps {
  count?: number;
  area?: number;
  speed?: number;
}

export const Snowfall = ({ count = 500, area = 50, speed = 1 }: SnowfallProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // 生成雪花的初始数据
  const snowflakes = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * area,
        Math.random() * area,
        (Math.random() - 0.5) * area
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,  // 水平漂移
        -(Math.random() * 0.5 + 0.5) * speed * 0.05,  // 下落速度
        (Math.random() - 0.5) * 0.02   // 深度漂移
      ),
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      scale: Math.random() * 0.08 + 0.02,  // 雪花大小
      wobble: Math.random() * Math.PI * 2,  // 摇摆相位
      wobbleSpeed: Math.random() * 0.02 + 0.01
    }));
  }, [count, area, speed]);

  const tempObj = new THREE.Object3D();

  useFrame(() => {
    if (!meshRef.current) return;

    snowflakes.forEach((flake, i) => {
      // 更新位置
      flake.position.add(flake.velocity);

      // 添加左右摇摆效果
      flake.wobble += flake.wobbleSpeed;
      const wobbleX = Math.sin(flake.wobble) * 0.02;
      const wobbleZ = Math.cos(flake.wobble * 0.7) * 0.02;

      // 如果雪花落到底部，重置到顶部
      if (flake.position.y < -10) {
        flake.position.y = area / 2;
        flake.position.x = (Math.random() - 0.5) * area;
        flake.position.z = (Math.random() - 0.5) * area;
      }

      // 更新旋转
      flake.rotation += flake.rotationSpeed;

      // 设置变换
      tempObj.position.set(
        flake.position.x + wobbleX,
        flake.position.y,
        flake.position.z + wobbleZ
      );
      tempObj.rotation.set(flake.rotation, flake.rotation * 0.5, 0);
      tempObj.scale.setScalar(flake.scale);
      tempObj.updateMatrix();

      meshRef.current!.setMatrixAt(i, tempObj.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* 使用简单的平面几何体作为雪花 */}
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
