import React, { useState, Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

import { Foliage } from './components/Foliage';
import { Ornaments } from './components/Ornaments';
import type { OrnamentsHandle } from './components/Ornaments';
import { Snowfall } from './components/Snowfall';
import { GestureDetector } from './components/GestureDetector';
import { TreeStar } from './components/TreeStar';
import { MusicPlayer } from './components/MusicPlayer';
import { SpiralParticles } from './components/SpiralParticles'; // Import the new component
import { MEMORIES, Memory } from './utils';

// 🌳 旋转控制组件
const RotatableGroup = ({ 
  rotationY, 
  children 
}: { 
  rotationY: number, 
  children: React.ReactNode 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        rotationY,
        0.1
      );
    }
  });

  return <group ref={groupRef} position={[0, -5, 0]}>{children}</group>;
};

// 📝 Memory Management Modal (Combined Add & Delete & Backup)
const MemoryManagerModal = ({ 
  isOpen, 
  onClose, 
  memories,
  onAdd,
  onDelete,
  onImport
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  memories: Memory[];
  onAdd: (memory: Memory) => void;
  onDelete: (id: number | string) => void;
  onImport: (memories: Memory[]) => void;
}) => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [music, setMusic] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'add'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !photo) {
        alert("Name and Photo are required!");
        return;
    }
    
    setLoading(true);
    try {
      const photoUrl = await handleFile(photo);
      let musicUrl = '';
      if (music) {
        musicUrl = await handleFile(music);
      }

      const newMemory: Memory = {
        id: Date.now(),
        name,
        photo: photoUrl,
        music: musicUrl
      };
      
      onAdd(newMemory);
      
      // Reset
      setName('');
      setPhoto(null);
      setMusic(null);
      setView('list'); // Go back to list after adding
    } catch (err) {
      console.error(err);
      alert("Failed to process files.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(memories, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arix_memories_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          if(confirm(`Found ${parsed.length} memories in file. This will replace your current memories. Continue?`)) {
            onImport(parsed);
            alert("Memories imported successfully!");
          }
        } else {
          alert("Invalid file format.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to parse JSON file.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="bg-[#111] border border-[#D4AF37] p-6 rounded-lg w-[95%] max-w-2xl shadow-[0_0_50px_rgba(212,175,55,0.3)] text-[#D4AF37] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-[#333] pb-4">
           <h2 className="text-2xl font-serif">Manage Memories</h2>
           <button onClick={onClose} className="text-[#666] hover:text-white">✕</button>
        </div>
        
        {/* Toggle Views */}
        <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded transition-all font-serif ${view === 'list' ? 'bg-[#D4AF37] text-black font-bold' : 'border border-[#444] text-[#888]'}`}
            >
              My Memories ({memories.length})
            </button>
            <button 
              onClick={() => setView('add')}
              className={`px-4 py-2 rounded transition-all font-serif ${view === 'add' ? 'bg-[#D4AF37] text-black font-bold' : 'border border-[#444] text-[#888]'}`}
            >
              + Add New
            </button>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto min-h-[300px] pr-2 custom-scrollbar">
            {memories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#444]">
                    <p className="text-xl italic">No memories yet.</p>
                    <p className="text-sm mt-2">Switch to "Add New" to create one.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memories.map(m => (
                        <div key={m.id} className="flex gap-3 p-3 bg-[#1a1a1a] border border-[#333] rounded hover:border-[#D4AF37] transition-colors group">
                            <img src={m.photo} className="w-16 h-16 object-cover rounded bg-black" />
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="font-bold text-[#eee] truncate">{m.name}</h4>
                                <span className="text-xs text-[#666]">{m.music ? '🎵 Music Attached' : 'No Music'}</span>
                            </div>
                            <button 
                                onClick={() => onDelete(m.id)}
                                className="self-center p-2 text-[#666] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* ADD VIEW */}
        {view === 'add' && (
           <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto">
            <div>
                <label className="block text-sm mb-1 opacity-80">Memory Name</label>
                <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/50 border border-[#444] rounded p-3 text-white focus:border-[#D4AF37] outline-none transition-colors"
                placeholder="e.g. Christmas 2023"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm mb-1 opacity-80">Photo</label>
                    <div className="relative border border-[#444] rounded p-4 hover:border-[#D4AF37] transition-colors border-dashed text-center">
                        <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="text-sm text-[#888]">{photo ? photo.name : 'Click to Upload Image'}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm mb-1 opacity-80">Music (Optional)</label>
                    <div className="relative border border-[#444] rounded p-4 hover:border-[#D4AF37] transition-colors border-dashed text-center">
                        <input 
                        type="file" 
                        accept="audio/*"
                        onChange={(e) => setMusic(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                         <span className="text-sm text-[#888]">{music ? music.name : 'Click to Upload Audio'}</span>
                    </div>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="mt-4 py-3 bg-[#D4AF37] text-black font-bold rounded hover:bg-[#b5952f] transition-colors disabled:opacity-50 font-serif tracking-wide"
            >
                {loading ? 'Processing...' : 'Create Memory'}
            </button>
          </form>
        )}

        {/* Backup / Restore Section */}
        <div className="mt-6 pt-4 border-t border-[#333] flex justify-between items-center">
          <div className="text-xs text-[#666]">
            <p>Data is stored locally in your browser.</p>
            <p>Use Export/Import to move data between devices.</p>
          </div>
          <div className="flex gap-2">
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               accept="application/json" 
               className="hidden" 
             />
             <button 
                onClick={handleImportClick}
                className="px-3 py-1.5 text-xs border border-[#444] text-[#888] hover:border-[#D4AF37] hover:text-[#D4AF37] rounded transition-colors"
             >
               Import JSON
             </button>
             <button 
                onClick={handleExport}
                className="px-3 py-1.5 text-xs border border-[#444] text-[#888] hover:border-[#D4AF37] hover:text-[#D4AF37] rounded transition-colors"
             >
               Export JSON
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const ArixChristmasTree = () => {
  const [isTreeShape, setIsTreeShape] = useState(false);
  const [activeMusic, setActiveMusic] = useState<{ url: string, name: string } | null>(null);
  
  // 🌟 Memory State - with LocalStorage Persistence
  const [memories, setMemories] = useState<Memory[]>(() => {
    try {
      const saved = localStorage.getItem('arix_memories');
      return saved ? JSON.parse(saved) : MEMORIES;
    } catch (e) {
      console.warn("Could not load memories:", e);
      return MEMORIES;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Save memories whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('arix_memories', JSON.stringify(memories));
    } catch (e) {
      console.error("Storage likely full:", e);
      // Optional: Handle QuotaExceededError here if needed
    }
  }, [memories]);

  // 🎮 手势状态
  const [targetRotation, setTargetRotation] = useState(0);
  const ornamentsRef = useRef<OrnamentsHandle>(null);

  // 防抖控制
  const lastGestureTime = useRef(0);
  const lastPinchTime = useRef(0);
  const wasPinching = useRef(false);

  const handleGestureFrame = useCallback((data: { gesture: string, rotation: number, isPinching: boolean }) => {
    const now = Date.now();

    if (!isTreeShape) {
       setTargetRotation(data.rotation);
    }

    if (now - lastGestureTime.current >= 1000) {
      if (data.gesture === 'Closed_Fist') {
        setIsTreeShape(true);
        lastGestureTime.current = now;
      } else if (data.gesture === 'Open_Palm') {
        if (ornamentsRef.current?.hasActiveGift()) {
          ornamentsRef.current.closeActive();
        } else {
          setIsTreeShape(false);
        }
        lastGestureTime.current = now;
      }
    }

    const isPinchingNow = data.isPinching;
    const canPinch = !isTreeShape && !ornamentsRef.current?.hasActiveGift();

    if (isPinchingNow && !wasPinching.current && canPinch && (now - lastPinchTime.current >= 500)) {
      ornamentsRef.current?.openNearest();
      lastPinchTime.current = now;
    }

    wasPinching.current = isPinchingNow;

  }, [isTreeShape]);

  const handleInteract = (memory: { music: string, name: string } | null) => {
    if (memory) {
      setActiveMusic({ url: memory.music, name: memory.name });
    } else {
      setActiveMusic(null);
    }
  };

  const handleAddMemory = (newMemory: Memory) => {
    setMemories([newMemory, ...memories]);
  };

  const handleDeleteMemory = (id: number | string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleImportMemories = (importedMemories: Memory[]) => {
    setMemories(importedMemories);
  };

  return (
    <div className="w-screen h-screen bg-[#000500] relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 4, 25], fov: 45 }}
        gl={{ antialias: false, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#000500']} />
        {/* Improved Lighting for Better Rendering */}
        <ambientLight intensity={2.0} color="#fff0d0" /> {/* Warmer ambient */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={0.5} />
        
        <hemisphereLight args={['#ffeeb1', '#080820', 3.0]} />
        <pointLight position={[0, 15, 0]} intensity={500} distance={50} color="#ffebcd" />
        <spotLight position={[10, 20, 10]} angle={0.5} penumbra={1} intensity={800} color="#ffd700" castShadow />
        <pointLight position={[-10, 5, -10]} intensity={300} color="#44ffaa" />

        <RotatableGroup rotationY={targetRotation}>
          <Suspense fallback={null}>
            <Foliage isTreeShape={isTreeShape} />
            <TreeStar isTreeShape={isTreeShape} />
            <SpiralParticles isTreeShape={isTreeShape} />
            
            <Ornaments
              ref={ornamentsRef}
              isTreeShape={isTreeShape}
              type="box"
              count={100}
              color="#8B0000"
              scaleBase={0.8}
              memories={memories}
              onInteract={handleInteract}
            />

            <Ornaments
              isTreeShape={isTreeShape}
              type="sphere"
              count={200}
              color="#FFF5E1" // Brighter, warm white/gold
              scaleBase={0.5}
            />

            <Snowfall count={600} area={60} speed={1.2} />
          </Suspense>
        </RotatableGroup>

        <ContactShadows opacity={0.6} scale={40} blur={2.5} far={10} color="#000000" />
        <EffectComposer enableNormalPass>
          {/* Stronger bloom for that magical glowing feel */}
          <Bloom luminanceThreshold={0.7} mipmapBlur intensity={1.8} radius={0.5} />
        </EffectComposer>
        
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={isTreeShape}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      <GestureDetector onGestureFrame={handleGestureFrame} />

      <MusicPlayer 
        musicUrl={activeMusic?.url || null} 
        isPlaying={!!activeMusic}
      />

      {/* Main UI Controls */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex gap-4">
        <button
          onClick={() => setIsTreeShape(!isTreeShape)}
          className="bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] px-8 py-3 text-base tracking-[2px] cursor-pointer uppercase transition-all duration-300 backdrop-blur-sm rounded-lg font-bold hover:bg-[#D4AF37] hover:text-black font-serif shadow-[0_0_15px_rgba(212,175,55,0.4)]"
        >
          {isTreeShape ? "Scatter" : "Summon Tree"}
        </button>
      </div>

      {/* Manage Memories Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] p-3 rounded-full cursor-pointer hover:bg-[#D4AF37] hover:text-black transition-all font-serif backdrop-blur-md shadow-[0_0_10px_rgba(212,175,55,0.3)]"
          title="Manage Memories"
        >
          <span className="text-xl leading-none">⚙</span>
        </button>
      </div>

      <MemoryManagerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        memories={memories}
        onAdd={handleAddMemory}
        onDelete={handleDeleteMemory}
        onImport={handleImportMemories}
      />
    </div>
  );
};

export default ArixChristmasTree;