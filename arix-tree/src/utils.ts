import * as THREE from 'three';

export const TREE_HEIGHT = 18;
export const TREE_RADIUS = 6;

export interface Memory {
  id: number | string;
  photo: string;
  music: string;
  name: string;
}

// 🎁 Empty default memories so user starts fresh
export const MEMORIES: Memory[] = [];

export const getConePosition = (
  height: number,
  radius: number,
  yOffset: number = -height / 2
) => {
  const theta = Math.random() * Math.PI * 2;
  const y = Math.random() * height; 
  const r = (radius * (height - y)) / height; 
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  return new THREE.Vector3(x, y + yOffset, z);
};

export const getSpherePosition = (radius: number) => {
  const vec = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize().multiplyScalar(radius * Math.random()); 
  return vec;
};