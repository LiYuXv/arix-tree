// src/Ornaments.tsx
import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getConePosition, getSpherePosition, TREE_HEIGHT, TREE_RADIUS } from './utils';

// 本地照片列表
const PHOTOS = [
  '/photos/ChineseNewYear.jpg',
  '/photos/SunCage.jpg',
  '/photos/ambassador.jpg',
  '/photos/SunFragment1.jpg',
  '/photos/SunFragment2.jpg',
  '/photos/SunFragment4.jpg',
  '/photos/SunFragment5.jpg',
  '/photos/SunFragment10.jpg',
  '/photos/SunFragment11.jpg',
  '/photos/Fragment.jpg',
];

// 🎄 终极修复版卡片：UI 与 3D 分离
const GiftCard = ({ position, onClose, photoSrc }: { position: THREE.Vector3, onClose: () => void, photoSrc: string }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const startPos = useMemo(() => position.clone(), []);

  // 让 3D 方块依然保留飞向镜头的动画，作为一种“过场特效”
  useFrame((state, delta) => {
    if (!mesh.current) return;
    const camera = state.camera;
    
    // 让方块飞到镜头前，但我们可以让它稍微隐形一点，只作为动画引导
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const targetPos = camera.position.clone().add(forward.multiplyScalar(5));
    
    mesh.current.position.lerp(targetPos, delta * 5);
    mesh.current.quaternion.slerp(camera.quaternion, delta * 5);
    mesh.current.scale.lerp(new THREE.Vector3(0, 0, 0), delta * 5); // 让3D方块最终缩小消失，只留照片
  });

  return (
    <group>
      {/* 这是一个隐形的 3D 锚点，用来播放飞行动画 */}
      <mesh ref={mesh} position={startPos}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial visible={false} /> {/* 隐藏实体方块 */}
      </mesh>
      
      {/* 🖼️ UI 层：使用 fullscreen 属性 */}
      {/* 这会让 HTML 元素脱离 3D 坐标，直接覆盖在整个屏幕上 */}
      <Html fullscreen zIndexRange={[100, 0]}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',            // 核心：弹性布局
          flexDirection: 'column',    // 垂直排列
          justifyContent: 'flex-start',   // 顶部对齐
          alignItems: 'center',       // 水平居中
          paddingTop: '10vh',         // 顶部留白，让图片往上
          background: 'transparent',  // 完全透明背景
          transition: 'all 0.3s ease'
        }}>
          {/* 照片容器 */}
          <div style={{
            position: 'relative',
            padding: '8px',
            background: 'rgba(0, 5, 0, 0.9)',
            border: '1px solid #D4AF37',
            borderRadius: '4px',
            animation: 'fadeIn 0.5s ease' // 简单的淡入动画
          }}>
            <img
              src={photoSrc}
              alt="Christmas Gift"
              style={{
                maxWidth: '50vw',      // 缩小最大宽度
                maxHeight: '45vh',     // 缩小最大高度
                display: 'block',
                borderRadius: '2px'
              }}
            />

            {/* 关闭按钮 */}
            <button 
              onClick={onClose}
              style={{
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#D4AF37',
                color: '#000',
                border: 'none',
                padding: '10px 30px',
                fontFamily: 'serif',
                cursor: 'pointer',
                fontWeight: 'bold',
                letterSpacing: '1px',
                whiteSpace: 'nowrap'
              }}
            >
              CLOSE CARD
            </button>
          </div>
          
          {/* 添加一个简单的淡入动画样式 */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      </Html>
    </group>
  );
};

type OrnamentProps = { isTreeShape: boolean; type: 'box' | 'sphere'; count: number; color: string; scaleBase: number; };

// 创建礼物盒材质 - 使用普通材质，深红色带金属光泽
const createGiftBoxMaterial = () => {
  return new THREE.MeshStandardMaterial({
    color: '#8B0000',
    roughness: 0.2,
    metalness: 0.7,
    envMapIntensity: 1.2
  });
};

// 创建普通方块材质 - 稍微不同的颜色
const createBoxMaterial = (color: string) => {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.15,
    metalness: 0.9,
    envMapIntensity: 1.5
  });
};

// 礼物盒比例 (0.4 = 40% 礼物盒, 60% 普通方块)
const GIFT_BOX_RATIO = 0.4;

// 下面的代码与之前保持一致，没有任何逻辑变化
export const Ornaments = ({ isTreeShape, type, count, color, scaleBase }: OrnamentProps) => {
  const giftMeshRef = useRef<THREE.InstancedMesh>(null);
  const boxMeshRef = useRef<THREE.InstancedMesh>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [clickedPos, setClickedPos] = useState<THREE.Vector3 | null>(null);
  const [activePhoto, setActivePhoto] = useState<string>('');

  // 为礼物盒和普通方块创建材质
  const giftMaterial = useMemo(() => createGiftBoxMaterial(), []);
  const boxMaterial = useMemo(() => createBoxMaterial(color), [color]);
  const sphereMaterial = useMemo(() => createBoxMaterial(color), [color]);

  // 生成数据时标记每个是礼物盒还是普通方块
  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => ({
      scatterPos: getSpherePosition(35),
      treePos: getConePosition(TREE_HEIGHT, TREE_RADIUS * 0.9),
      scale: Math.random() * 0.5 + 0.5,
      rotationSpeed: (Math.random() - 0.5) * 2,
      phase: Math.random() * Math.PI * 2,
      photo: PHOTOS[Math.floor(Math.random() * PHOTOS.length)],
      isGiftBox: Math.random() < GIFT_BOX_RATIO // 随机决定是否为礼物盒
    }));
  }, [count]);

  // 分离礼物盒和普通方块的索引
  const { giftIndices, boxIndices } = useMemo(() => {
    const gifts: number[] = [];
    const boxes: number[] = [];
    data.forEach((d, i) => {
      if (d.isGiftBox) {
        gifts.push(i);
      } else {
        boxes.push(i);
      }
    });
    return { giftIndices: gifts, boxIndices: boxes };
  }, [data]);

  const tempObj = new THREE.Object3D();
  const progress = useRef(0);

  useFrame((state, delta) => {
    const target = isTreeShape ? 1 : 0;
    progress.current = THREE.MathUtils.lerp(progress.current, target, delta * 2);

    // 更新礼物盒
    if (type === 'box' && giftMeshRef.current && giftIndices.length > 0) {
      giftIndices.forEach((dataIdx, meshIdx) => {
        const d = data[dataIdx];
        const currentPos = new THREE.Vector3().lerpVectors(d.scatterPos, d.treePos, progress.current);
        const floatAmp = THREE.MathUtils.lerp(2.0, 0.2, progress.current);
        currentPos.y += Math.sin(state.clock.elapsedTime + d.phase) * floatAmp * 0.1;

        tempObj.position.copy(currentPos);
        tempObj.rotation.set(state.clock.elapsedTime * d.rotationSpeed * 0.2, state.clock.elapsedTime * d.rotationSpeed * 0.2, 0);

        const finalScale = (dataIdx === activeId) ? 0 : d.scale * scaleBase;
        tempObj.scale.setScalar(finalScale);
        tempObj.updateMatrix();
        giftMeshRef.current!.setMatrixAt(meshIdx, tempObj.matrix);
      });
      giftMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 更新普通方块
    if (type === 'box' && boxMeshRef.current && boxIndices.length > 0) {
      boxIndices.forEach((dataIdx, meshIdx) => {
        const d = data[dataIdx];
        const currentPos = new THREE.Vector3().lerpVectors(d.scatterPos, d.treePos, progress.current);
        const floatAmp = THREE.MathUtils.lerp(2.0, 0.2, progress.current);
        currentPos.y += Math.sin(state.clock.elapsedTime + d.phase) * floatAmp * 0.1;

        tempObj.position.copy(currentPos);
        tempObj.rotation.set(state.clock.elapsedTime * d.rotationSpeed * 0.2, state.clock.elapsedTime * d.rotationSpeed * 0.2, 0);

        const finalScale = (dataIdx === activeId) ? 0 : d.scale * scaleBase;
        tempObj.scale.setScalar(finalScale);
        tempObj.updateMatrix();
        boxMeshRef.current!.setMatrixAt(meshIdx, tempObj.matrix);
      });
      boxMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 更新球体 (非 box 类型)
    if (type !== 'box' && giftMeshRef.current) {
      data.forEach((d, i) => {
        const currentPos = new THREE.Vector3().lerpVectors(d.scatterPos, d.treePos, progress.current);
        const floatAmp = THREE.MathUtils.lerp(2.0, 0.2, progress.current);
        currentPos.y += Math.sin(state.clock.elapsedTime + d.phase) * floatAmp * 0.1;

        tempObj.position.copy(currentPos);
        tempObj.rotation.set(state.clock.elapsedTime * d.rotationSpeed * 0.2, state.clock.elapsedTime * d.rotationSpeed * 0.2, 0);

        const finalScale = d.scale * scaleBase;
        tempObj.scale.setScalar(finalScale);
        tempObj.updateMatrix();
        giftMeshRef.current!.setMatrixAt(i, tempObj.matrix);
      });
      giftMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const handleGiftClick = (e: any) => {
    if (type !== 'box') return;
    e.stopPropagation();
    const meshIdx = e.instanceId;
    const dataIdx = giftIndices[meshIdx];
    const matrix = new THREE.Matrix4();
    giftMeshRef.current!.getMatrixAt(meshIdx, matrix);
    setActiveId(dataIdx);
    setClickedPos(new THREE.Vector3().setFromMatrixPosition(matrix));
    setActivePhoto(data[dataIdx].photo);
  };

  const handleBoxClick = (e: any) => {
    if (type !== 'box') return;
    e.stopPropagation();
    const meshIdx = e.instanceId;
    const dataIdx = boxIndices[meshIdx];
    const matrix = new THREE.Matrix4();
    boxMeshRef.current!.getMatrixAt(meshIdx, matrix);
    setActiveId(dataIdx);
    setClickedPos(new THREE.Vector3().setFromMatrixPosition(matrix));
    setActivePhoto(data[dataIdx].photo);
  };

  // 球体类型渲染
  if (type !== 'box') {
    return (
      <instancedMesh ref={giftMeshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={sphereMaterial} attach="material" />
      </instancedMesh>
    );
  }

  // 方块类型渲染 - 分开渲染礼物盒和普通方块
  return (
    <>
      {/* 礼物盒 */}
      {giftIndices.length > 0 && (
        <instancedMesh ref={giftMeshRef} args={[undefined, undefined, giftIndices.length]} onClick={handleGiftClick}>
          <boxGeometry args={[1, 1, 1]} />
          <primitive object={giftMaterial} attach="material" />
        </instancedMesh>
      )}

      {/* 普通红色方块 */}
      {boxIndices.length > 0 && (
        <instancedMesh ref={boxMeshRef} args={[undefined, undefined, boxIndices.length]} onClick={handleBoxClick}>
          <boxGeometry args={[1, 1, 1]} />
          <primitive object={boxMaterial} attach="material" />
        </instancedMesh>
      )}

      {activeId !== null && clickedPos && (
        <GiftCard position={clickedPos} photoSrc={activePhoto} onClose={() => { setActiveId(null); setClickedPos(null); setActivePhoto(''); }} />
      )}
    </>
  );
};