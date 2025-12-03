// utils.ts
import * as THREE from 'three';

export const TREE_HEIGHT = 18;
export const TREE_RADIUS = 6;

// 生成圆锥体表面的随机点 (Tree Shape)
export const getConePosition = (
  height: number,
  radius: number,
  yOffset: number = -height / 2
) => {
  const theta = Math.random() * Math.PI * 2;
  // y 轴分布：偏向底部更密集或均匀分布，这里用线性
  const y = Math.random() * height; 
  const r = (radius * (height - y)) / height; // 随着高度升高，半径变小
  
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  return new THREE.Vector3(x, y + yOffset, z);
};

// 生成球体内的随机点 (Scattered Shape)
export const getSpherePosition = (radius: number) => {
  const vec = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize().multiplyScalar(radius * Math.random()); // 实心球体分布
  return vec;
};