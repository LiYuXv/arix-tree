// App.tsx
import { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Snowfall } from './Snowfall';

const ArixChristmasTree = () => {
  const [isTreeShape, setIsTreeShape] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000500' }}>
      <Canvas
        camera={{ position: [0, 4, 25], fov: 45 }}
        gl={{ antialias: false, toneMappingExposure: 0.8 }} // 曝光控制
        dpr={[1, 2]} // 适配高分屏
      >
        {/* --- 环境与光照 --- */}
        <color attach="background" args={['#000500']} />
        {/* 使用 City 或 Lobby 预设来获得复杂的窗户/灯光反射 */}
        <Environment preset="city" /> 
        
        <ambientLight intensity={0.2} color="#002419" />
        <pointLight position={[0, 15, 0]} intensity={100} distance={20} color="#ffebcd" />
        <spotLight 
          position={[10, 20, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={200} 
          color="#ffd700" 
          castShadow 
        />
        <pointLight position={[-10, 5, -10]} intensity={50} color="#00ff88" />

        {/* --- 场景内容 --- */}
        <group position={[0, -5, 0]}>
          <Suspense fallback={null}>
            {/* 1. 针叶层 (大量的点) */}
            <Foliage isTreeShape={isTreeShape} />

            {/* 2. 礼物盒 (重型装饰 - 深红/金) */}
            <Ornaments
              isTreeShape={isTreeShape}
              type="box"
              count={100}
              color="#8B0000"
              scaleBase={0.8}
            />

            {/* 3. 金球 (轻型装饰 - 纯金) */}
            <Ornaments
              isTreeShape={isTreeShape}
              type="sphere"
              count={200}
              color="#F9E4B7"
              scaleBase={0.5}
            />

            {/* 4. 雪花飘落效果 */}
            <Snowfall count={600} area={60} speed={1.2} />
          </Suspense>
        </group>

        {/* --- 底部阴影 --- */}
        <ContactShadows opacity={0.5} scale={40} blur={2} far={10} color="#000000" />

        {/* --- 后期特效 (关键的奢华感来源) --- */}
        <EffectComposer enableNormalPass={false}>
          <Bloom
            luminanceThreshold={0.9}
            mipmapBlur
            intensity={1.3}
            radius={0.6}
          />
        </EffectComposer>

        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 1.8} 
          autoRotate={isTreeShape} // 成树后自动旋转展示
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* --- UI 交互层 --- */}
      <div style={{
        position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, textAlign: 'center'
      }}>
        <button
          onClick={() => setIsTreeShape(!isTreeShape)}
          style={{
            background: 'transparent',
            border: '1px solid #D4AF37',
            color: '#D4AF37',
            padding: '12px 32px',
            fontSize: '1rem',
            fontFamily: 'Times New Roman, serif', // 衬线字体增加高级感
            letterSpacing: '2px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(5px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D4AF37';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#D4AF37';
          }}
        >
          {isTreeShape ? "Scatter Elements" : "Summon The Arix Tree"}
        </button>
      </div>
    </div>
  );
};

export default ArixChristmasTree;