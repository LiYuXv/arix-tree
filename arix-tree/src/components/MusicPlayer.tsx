import React, { useEffect, useRef } from 'react';

export const MusicPlayer = ({ 
  musicUrl, 
  isPlaying
}: { 
  musicUrl: string | null; 
  isPlaying: boolean;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    // 默认音量
    audioRef.current.volume = 0.5;
      
    if (isPlaying && musicUrl) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Audio play prevented (interaction needed):", error);
        });
      }
    } else {
      audioRef.current.pause();
      if (!musicUrl) {
        audioRef.current.currentTime = 0; // 重置进度
      }
    }
  }, [isPlaying, musicUrl]);

  // 只有当有 musicUrl 时才渲染 audio 元素
  if (!musicUrl) {
    return null;
  }

  return (
    <audio
      ref={audioRef}
      src={musicUrl}
      loop
      style={{ display: 'none' }}
    />
  );
};