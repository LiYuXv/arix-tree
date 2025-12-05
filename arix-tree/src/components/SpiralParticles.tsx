import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TREE_HEIGHT, TREE_RADIUS } from '../utils';

const SpiralShader = {
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uColorStart: { value: new THREE.Color('#87CEEB') }, // Sky Blue
    uColorEnd: { value: new THREE.Color('#E0FFFF') },   // Light Cyan
  },
  vertexShader: `
    uniform float uTime;
    attribute float aRandom;
    attribute float aSpeed;
    attribute float aOffset;
    attribute float aRadius;
    
    varying float vAlpha;
    varying vec3 vColor;
    
    uniform vec3 uColorStart;
    uniform vec3 uColorEnd;

    void main() {
      float heightTotal = ${TREE_HEIGHT.toFixed(1)};
      float heightHalf = heightTotal * 0.5;

      // Cycle from 0 to Total Height
      float rawHeight = mod(uTime * aSpeed + aOffset, heightTotal);
      
      // Map to world Y coordinate (-Height/2 to +Height/2) to match tree position
      float y = rawHeight - heightHalf;
      
      // normalized progress 0.0 (bottom) -> 1.0 (top)
      float progress = rawHeight / heightTotal;
      
      // Exact cone radius matching the tree taper
      float r = aRadius * (1.0 - progress);
      
      // Spiral rotation
      // uTime * 0.2: Slower continuous rotation
      // rawHeight * 1.0: Number of twists along the height
      float angle = uTime * 0.2 + rawHeight * 1.0 + aRandom * 6.28;
      
      float x = cos(angle) * r;
      float z = sin(angle) * r;
      
      vec4 mvPosition = modelViewMatrix * vec4(x, y, z, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Particle Size
      gl_PointSize = (70.0 * aRandom + 30.0) * (1.0 / -mvPosition.z);
      
      // Color variation
      float colorMix = sin(uTime + aRandom * 3.0) * 0.5 + 0.5;
      vColor = mix(uColorStart, uColorEnd, colorMix);
      
      // Soft fade in/out at bottom and top edges
      float alpha = smoothstep(0.0, 0.15, progress) * (1.0 - smoothstep(0.85, 1.0, progress));
      vAlpha = alpha;
    }
  `,
  fragmentShader: `
    uniform float uOpacity;
    varying float vAlpha;
    varying vec3 vColor;
    
    void main() {
      float r = length(gl_PointCoord - vec2(0.5));
      if (r > 0.5) discard;
      
      float glow = 1.0 - smoothstep(0.0, 0.5, r);
      // Increased brightness slightly
      gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity * 1.5);
    }
  `
};

export const SpiralParticles = ({ isTreeShape }: { isTreeShape: boolean }) => {
  const count = 600; // Balanced count
  const mesh = useRef<THREE.Points>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);

  const [randoms, speeds, offsets, radii] = useMemo(() => {
    const r = new Float32Array(count);
    const s = new Float32Array(count);
    const o = new Float32Array(count);
    const rad = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      r[i] = Math.random();
      // Much slower upward speed (was ~1.0+, now 0.3-0.8)
      s[i] = Math.random() * 0.5 + 0.3; 
      o[i] = Math.random() * TREE_HEIGHT;
      
      // Radius: Increased to be slightly wider than the tree (1.2x to 1.5x)
      // Tree Radius is 6.0, so this makes particles orbit at radius ~7.2 to ~9.0
      rad[i] = TREE_RADIUS * 1.2 + Math.random() * 1.8; 
    }
    return [r, s, o, rad];
  }, []);

  useFrame((state, delta) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      const targetOpacity = isTreeShape ? 1.0 : 0.0;
      shaderRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        shaderRef.current.uniforms.uOpacity.value,
        targetOpacity,
        delta * 2.0
      );
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(count * 3), 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
        <bufferAttribute attach="attributes-aOffset" args={[offsets, 1]} />
        <bufferAttribute attach="attributes-aRadius" args={[radii, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        args={[SpiralShader]}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
