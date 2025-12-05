import React, { useRef, useMemo, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getConePosition, getSpherePosition, TREE_HEIGHT, TREE_RADIUS, Memory } from '../utils';

// 🎨 Festive Palette - Adjusted weights
// Removed Green. Reduced Red ratio by adding more of others.
const FESTIVE_COLORS = [
  '#D42426', // Red (Only 1 entry)
  '#D4AF37', '#D4AF37', '#D4AF37', // Gold (3 entries)
  '#C0C0C0', '#C0C0C0', // Silver (2 entries)
  '#1446A0', '#1446A0', // Blue (2 entries)
  '#5D3FD3', // Royal Purple (1 entry)
  '#E6E6FA', // Lavender (1 entry for variety)
];

// 🎁 GiftCard 组件 - 从礼物盒位置飞到屏幕中央偏上
const GiftCard = ({
  position,
  onClose,
  photoSrc,
  memoryName
}: {
  position: THREE.Vector3,
  onClose: () => void,
  photoSrc: string,
  memoryName: string
}) => {
  const { camera, gl } = useThree();
  const [screenPos, setScreenPos] = useState<{ x: number, y: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);

  // 初始化位置
  useFrame(() => {
    if (!isAnimating && screenPos) return; // 动画结束后不再计算

    const pos = position.clone();
    pos.project(camera);

    const rect = gl.domElement.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width;
    const y = (-pos.y * 0.5 + 0.5) * rect.height;

    // 如果还没有初始化位置，或者还在动画前摇阶段，确保位置准确
    if (screenPos === null) {
      setScreenPos({ x, y });
      // 短暂延迟后触发 CSS 动画
      requestAnimationFrame(() => {
         setTimeout(() => setIsAnimating(false), 50);
      });
    }
  });

  // 动画完成后的清理
  useEffect(() => {
    if (!isAnimating) return;
    // 这里的定时器要略大于 CSS transition time
    const timer = setTimeout(() => setIsAnimating(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // 目标位置：屏幕中央偏上
  const rect = gl.domElement.getBoundingClientRect();
  const targetX = rect.width / 2;
  const targetY = rect.height * 0.4;

  if (screenPos === null) {
    return null;
  }

  return (
    <group>
      {/* 提高 zIndexRange 确保在最上层 */}
      <Html fullscreen zIndexRange={[1000, 1000]}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          {/* 卡片容器 */}
          <div style={{
            position: 'absolute',
            left: isAnimating ? screenPos.x : targetX,
            top: isAnimating ? screenPos.y : targetY,
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.8s cubic-bezier(0.19, 1, 0.22, 1)', // 使用更优雅的缓动
            opacity: 1,
            // 从非常小变大，模拟从方块里变出来
            width: isAnimating ? '20px' : 'auto', 
            height: isAnimating ? '20px' : 'auto',
            scale: isAnimating ? '0.1' : '1',
            pointerEvents: isAnimating ? 'none' : 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div className={`
              p-4 bg-[#1a1a1a] border-2 border-[#D4AF37] rounded-lg flex flex-col items-center 
              shadow-[0_0_50px_rgba(212,175,55,0.6)]
              transition-opacity duration-500
              ${isAnimating ? 'opacity-0' : 'opacity-100'} 
            `}>
              {/* 注意：内容在 isAnimating 为 true 时设为透明，避免压缩变形太难看，或者可以让它一起缩放 */}
              {/* 这里选择让外框缩放，内容淡入 */}
              
              <h3 className="text-[#D4AF37] m-0 mb-3 font-serif text-xl whitespace-nowrap">{memoryName}</h3>

              <div className="relative">
                <img
                  src={photoSrc}
                  alt="Memory"
                  className="max-w-[60vw] max-h-[50vh] rounded border border-[#333] object-cover"
                />
              </div>

              <button
                onClick={onClose}
                className="mt-4 bg-transparent text-[#D4AF37] border border-[#D4AF37] px-6 py-2 cursor-pointer font-serif tracking-wider transition-all duration-200 hover:bg-[#D4AF37] hover:text-black pointer-events-auto"
              >
                CLOSE MEMORY
              </button>
            </div>
            
            {/* 这里添加一个替身，在动画期间显示为发光的方块，过渡到上面的卡片 */}
            {/* FIX: 添加 pointerEvents: 'none' 防止透明层遮挡点击 */}
             <div className={`
              absolute w-full h-full bg-[#D4AF37] rounded-sm shadow-[0_0_20px_#D4AF37]
              transition-opacity duration-300
              ${isAnimating ? 'opacity-100' : 'opacity-0'}
            `} 
            style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
      </Html>
    </group>
  );
};

// 🎨 Improved Materials for better rendering
const createGiftBoxMaterial = () => new THREE.MeshStandardMaterial({ 
  color: '#FFFFFF', // White base allows instance coloring
  roughness: 0.1, 
  metalness: 0.7, 
  emissive: '#111111', 
  emissiveIntensity: 0.2
});

const createBoxMaterial = (color: string) => new THREE.MeshStandardMaterial({ 
  color: color, 
  roughness: 0.05, // Very shiny (Glass/Polished metal look)
  metalness: 1.0, 
  emissive: color, // Self-illuminated for brightness
  emissiveIntensity: 0.3 // Glow intensity
});

const GIFT_BOX_RATIO = 0.3; // 30% 是礼物盒

export interface OrnamentsHandle {
  openNearest: () => void;
  closeActive: () => void;
  hasActiveGift: () => boolean;
}

type OrnamentProps = { 
  isTreeShape: boolean; 
  type: 'box' | 'sphere'; 
  count: number; 
  color: string; 
  scaleBase: number;
  memories?: Memory[];
  onInteract?: (memory: { music: string, name: string } | null) => void;
};

// 使用 forwardRef 让父组件可以调用 openNearest
export const Ornaments = forwardRef<OrnamentsHandle, OrnamentProps>(({ 
  isTreeShape, type, count, color, scaleBase, memories = [], onInteract 
}, ref) => {
  const giftMeshRef = useRef<THREE.InstancedMesh>(null);
  const boxMeshRef = useRef<THREE.InstancedMesh>(null);
  
  const [activeId, setActiveId] = useState<number | null>(null);
  const [clickedPos, setClickedPos] = useState<THREE.Vector3 | null>(null);
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);

  const { camera } = useThree();

  const giftMaterial = useMemo(() => createGiftBoxMaterial(), []);
  const otherMaterial = useMemo(() => createBoxMaterial(color), [color]);

  // 1. 生成静态几何数据 (位置、旋转等)，只生成一次，避免 Memories 更新时位置跳动
  const [staticData] = useState(() => {
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      scatterPos: getSpherePosition(35),
      treePos: getConePosition(TREE_HEIGHT, TREE_RADIUS * 0.9),
      scale: Math.random() * 0.5 + 0.5,
      rotationSpeed: (Math.random() - 0.5) * 2,
      phase: Math.random() * Math.PI * 2,
      isGiftBox: Math.random() < GIFT_BOX_RATIO,
      color: new THREE.Color(FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)])
    }));
  });

  // 2. 动态合并 Memory 数据
  const data = useMemo(() => {
    return staticData.map((d) => {
      // 只有礼物盒才分配 Memory
      const memory = memories.length > 0 ? memories[d.id % memories.length] : null;
      return {
        ...d,
        memory
      };
    });
  }, [staticData, memories]);

  const { giftIndices, boxIndices } = useMemo(() => {
    const gifts: number[] = [];
    const boxes: number[] = [];
    data.forEach((d, i) => {
      if (d.isGiftBox) gifts.push(i); else boxes.push(i);
    });
    return { giftIndices: gifts, boxIndices: boxes };
  }, [data]);

  // 🌈 Apply random colors to gift boxes
  useEffect(() => {
    if (type === 'box' && giftMeshRef.current) {
        giftIndices.forEach((dataIdx, i) => {
            const d = data[dataIdx];
            if (d.color) {
                giftMeshRef.current!.setColorAt(i, d.color);
            }
        });
        giftMeshRef.current.instanceColor!.needsUpdate = true;
    }
  }, [type, giftIndices, data]);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    hasActiveGift: () => activeId !== null,
    closeActive: () => handleClose(),
    openNearest: () => {
      if (activeId !== null || type !== 'box' || !giftMeshRef.current) return;

      let minDist = Infinity;
      let nearestIdx = -1;
      const tempVec = new THREE.Vector3();
      const instanceMatrix = new THREE.Matrix4();

      // 遍历所有礼物盒，找到离相机最近的
      giftIndices.forEach(idx => {
        giftMeshRef.current!.getMatrixAt(giftIndices.indexOf(idx), instanceMatrix);
        tempVec.setFromMatrixPosition(instanceMatrix);
        const dist = tempVec.distanceTo(camera.position);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });

      if (nearestIdx !== -1) {
        // 模拟点击
        giftMeshRef.current!.getMatrixAt(giftIndices.indexOf(nearestIdx), instanceMatrix);
        const pos = new THREE.Vector3().setFromMatrixPosition(instanceMatrix);
        activateGift(nearestIdx, pos);
      }
    }
  }));

  const activateGift = (idx: number, pos: THREE.Vector3) => {
    const d = data[idx];
    if (!d.memory) return;
    
    setActiveId(idx);
    setClickedPos(pos);
    setActiveMemory(d.memory);
    if (onInteract) onInteract({ music: d.memory.music, name: d.memory.name });
  };

  const handleClose = () => {
    setActiveId(null);
    setClickedPos(null);
    setActiveMemory(null);
    if (onInteract) onInteract(null);
  };

  // 动画循环
  const tempObj = new THREE.Object3D();
  const progress = useRef(0);

  useFrame((state, delta) => {
    const target = isTreeShape ? 1 : 0;
    progress.current = THREE.MathUtils.lerp(progress.current, target, delta * 2);

    const updateMesh = (mesh: THREE.InstancedMesh, indices: number[]) => {
      indices.forEach((dataIdx, meshIdx) => {
        const d = data[dataIdx];
        
        // 插值位置
        const currentPos = new THREE.Vector3().lerpVectors(d.scatterPos, d.treePos, progress.current);
        // 漂浮动画
        const floatAmp = THREE.MathUtils.lerp(2.0, 0.2, progress.current);
        currentPos.y += Math.sin(state.clock.elapsedTime + d.phase) * floatAmp * 0.1;

        tempObj.position.copy(currentPos);
        tempObj.rotation.set(
          state.clock.elapsedTime * d.rotationSpeed * 0.2, 
          state.clock.elapsedTime * d.rotationSpeed * 0.2, 
          0
        );

        // 如果被选中，缩小（隐藏）原物体
        const finalScale = (dataIdx === activeId) ? 0 : d.scale * scaleBase;
        tempObj.scale.setScalar(finalScale);
        
        tempObj.updateMatrix();
        mesh.setMatrixAt(meshIdx, tempObj.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };

    if (type === 'box' && giftMeshRef.current) updateMesh(giftMeshRef.current, giftIndices);
    if (type === 'box' && boxMeshRef.current) updateMesh(boxMeshRef.current, boxIndices);
    if (type !== 'box' && giftMeshRef.current) updateMesh(giftMeshRef.current, data.map(d=>d.id));
  });

  const handleClick = (e: any, indices: number[], mesh: THREE.InstancedMesh) => {
    if (type !== 'box') return;
    e.stopPropagation();
    const meshIdx = e.instanceId;
    const dataIdx = indices[meshIdx];
    
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(meshIdx, matrix);
    const pos = new THREE.Vector3().setFromMatrixPosition(matrix);

    activateGift(dataIdx, pos);
  };

  // 渲染
  if (type !== 'box') {
    return (
      <instancedMesh ref={giftMeshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 16, 16]} />
        <primitive object={otherMaterial} attach="material" />
      </instancedMesh>
    );
  }

  return (
    <>
      {giftIndices.length > 0 && (
        <instancedMesh ref={giftMeshRef} args={[undefined, undefined, giftIndices.length]} onClick={(e) => handleClick(e, giftIndices, giftMeshRef.current!)}>
          <boxGeometry args={[1, 1, 1]} />
          <primitive object={giftMaterial} attach="material" />
        </instancedMesh>
      )}

      {boxIndices.length > 0 && (
        <instancedMesh ref={boxMeshRef} args={[undefined, undefined, boxIndices.length]} onClick={(e) => handleClick(e, boxIndices, boxMeshRef.current!)}>
          <boxGeometry args={[1, 1, 1]} />
          <primitive object={otherMaterial} attach="material" />
        </instancedMesh>
      )}

      {activeId !== null && clickedPos && activeMemory && (
        <GiftCard 
          position={clickedPos} 
          photoSrc={activeMemory.photo} 
          memoryName={activeMemory.name}
          onClose={handleClose} 
        />
      )}
    </>
  );
});