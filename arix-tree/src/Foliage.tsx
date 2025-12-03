// src/Foliage.tsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getConePosition, getSpherePosition, TREE_HEIGHT, TREE_RADIUS } from './utils';

const FoliageMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    // 🎨 恢复深祖母绿，保持高级感
    uColorBase: { value: new THREE.Color('#002419') }, 
    uColorHighlight: { value: new THREE.Color('#D4AF37') },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aTargetPos;
    attribute float aSize;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec3 vPos; // 将位置传给 Fragment

    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      float t = easeInOutCubic(uProgress);
      vec3 pos = mix(position, aTargetPos, t);
      
      float breathe = sin(uTime * 2.0 + aRandom * 10.0) * 0.1;
      if (uProgress > 0.8) pos += normal * breathe;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      gl_PointSize = aSize * (300.0 / max(length(mvPosition.xyz), 0.1));
      vPos = pos; // 传递真实的世界坐标高度
    }
  `,
  fragmentShader: `
    uniform vec3 uColorBase;
    uniform vec3 uColorHighlight;
    uniform float uProgress;
    varying vec3 vPos;
    
    void main() {
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;
      
      float glow = 1.0 - smoothstep(0.0, 0.5, r);
      vec3 finalColor = mix(uColorHighlight, uColorBase, r * 2.5);
      
      // 🔧 强制修复顶部黑点逻辑：
      // 如果处于树的状态(uProgress > 0.5) 且 高度(vPos.y) 接近树顶(>7.0)
      // 则强制混合更多金色，不管光照如何
      if (uProgress > 0.5) {
         float tipFactor = smoothstep(5.0, 9.0, vPos.y); 
         finalColor = mix(finalColor, uColorHighlight, tipFactor * 0.8);
      }
      
      // 💡 亮度回调：从 * 2.5 降回 * 1.5，避免太亮刺眼
      gl_FragColor = vec4(finalColor * 1.5, 1.0); 
    }
  `
};

export const Foliage = ({ isTreeShape }: { isTreeShape: boolean }) => {
  const count = 15000;
  const mesh = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const [positions, targetPositions, sizes, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const r = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const scatter = getSpherePosition(30);
      pos.set([scatter.x, scatter.y, scatter.z], i * 3);
      const tree = getConePosition(TREE_HEIGHT, TREE_RADIUS);
      target.set([tree.x, tree.y, tree.z], i * 3);
      s[i] = Math.random() * 0.4 + 0.1;
      r[i] = Math.random();
    }
    return [pos, target, s, r];
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      const target = isTreeShape ? 1 : 0;
      shaderRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(
        shaderRef.current.uniforms.uProgress.value,
        target,
        delta * 2.5
      );
    }
  });

  return (
    // @ts-expect-error raycast null is valid for disabling raycasting
    <points ref={mesh} raycast={null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[FoliageMaterial]}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};