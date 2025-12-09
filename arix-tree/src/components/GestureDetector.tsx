import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer, DrawingUtils } from '@mediapipe/tasks-vision';

interface GestureData {
  gesture: string;
  rotation: number; // -1 to 1 (scaled angle)
  isPinching: boolean;
}

export const GestureDetector = ({
  onGestureFrame
}: {
  onGestureFrame: (data: GestureData) => void
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);

  const gestureRecognizer = useRef<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // 使用 ref 保存最新的回调，避免闭包问题
  const onGestureFrameRef = useRef(onGestureFrame);
  onGestureFrameRef.current = onGestureFrame;

  // 1. 初始化 AI 模型 (优化：提高置信度阈值以减少误触)
  useEffect(() => {
    const loadModel = async () => {
      setLoading(true);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        // 使用本地模型文件，避免网络问题
        gestureRecognizer.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/ai/gesture_recognizer.task",
            delegate: "GPU" // 尝试使用 GPU 加速
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.6, // 提高检测门槛
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.6
        });
        
        setLoading(false);
      } catch (error: any) {
        console.error("AI Load Failed:", error);
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  // 2. 开启摄像头
  const startCamera = async () => {
    if (!gestureRecognizer.current) {
      alert("AI Model Loading... Please wait.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      });
      setCameraStream(stream);
      setIsActive(true);
    } catch (err) {
      console.error(err);
      alert("Cannot access camera");
    }
  };

  // 🛑 关闭摄像头
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsActive(false);
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  useEffect(() => {
    if (isActive && videoRef.current && cameraStream) {
      const video = videoRef.current;
      video.srcObject = cameraStream;
      video.onloadedmetadata = () => {
        video.play();
        predictWebcam();
      };
    }
  }, [isActive, cameraStream]);

  // 3. 实时预测循环
  const predictWebcam = async () => {
    if (!gestureRecognizer.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.currentTime > 0 && !video.paused && !video.ended) {
        if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            
            try {
                const results = gestureRecognizer.current.recognizeForVideo(video, Date.now());

                ctx!.clearRect(0, 0, canvas.width, canvas.height);
                
                // 默认数据
                let currentRotation = 0;
                let isPinching = false;
                let detectedGesture = 'None';

                if (results.landmarks && results.landmarks.length > 0) {
                    const landmarks = results.landmarks[0];
                    const drawingUtils = new DrawingUtils(ctx!);
                    drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#D4AF37", lineWidth: 2 });
                    drawingUtils.drawLandmarks(landmarks, { color: "#00ff88", radius: 3 });

                    // --- 📐 1. 计算手掌旋转 (Rotation) ---
                    // 使用 腕部(0) 和 中指根部(9) 的 X 轴偏移计算
                    const wrist = landmarks[0];
                    const middleMCP = landmarks[9];
                    // 映射旋转：放大灵敏度
                    currentRotation = (middleMCP.x - wrist.x) * -8;

                    // --- 🤏 2. 计算捏合 (Pinch) ---
                    // 拇指指尖(4) 和 食指指尖(8) 的距离
                    const thumbTip = landmarks[4];
                    const indexTip = landmarks[8];
                    const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

                    // 阈值判断
                    if (distance < 0.08) {
                        isPinching = true;
                        // 绘制捏合点提示
                        ctx!.beginPath();
                        ctx!.arc(thumbTip.x * canvas.width, thumbTip.y * canvas.height, 10, 0, 2 * Math.PI);
                        ctx!.fillStyle = "rgba(255, 215, 0, 0.5)";
                        ctx!.fill();
                    }
                }

                // --- ✋ 3. 识别特定手势 ---
                if (results.gestures.length > 0 && results.gestures[0].length > 0) {
                    const gesture = results.gestures[0][0];
                    if (gesture.score > 0.6) {
                        detectedGesture = gesture.categoryName; // "Closed_Fist", "Open_Palm", "Victory"
                        
                        // 绘制手势名
                        ctx!.font = "20px Arial";
                        ctx!.fillStyle = "#D4AF37";
                        ctx!.fillText(detectedGesture, 10, 30);

                        // 防止抖动：只有当手势稳定时才传递 "事件级" 手势
                        // 这里我们每一帧都传，App层做防抖或状态机
                    }
                }

                // 传递给父组件 (使用 ref 保证拿到最新回调)
                onGestureFrameRef.current({
                    gesture: detectedGesture,
                    rotation: currentRotation,
                    isPinching
                });

            } catch (e) {
                console.error(e);
            }
        }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20 }}>
      <div className="bg-[#000500CC] border border-[#D4AF37] rounded-xl p-4 min-w-[220px] text-white backdrop-blur-sm shadow-[0_0_15px_rgba(212,175,55,0.2)]">
        <div className="mb-2 text-[#D4AF37] font-bold border-b border-[#333] pb-1 flex justify-between items-center">
          <span>🤖 Magic Control</span>
          {isActive && (
             <button 
               onClick={stopCamera}
               className="text-xs bg-red-900/40 text-red-300 border border-red-800 px-2 py-0.5 rounded hover:bg-red-800 hover:text-white transition-colors"
             >
               OFF
             </button>
          )}
        </div>

        {!isActive && !loading && (
          <button onClick={startCamera} className="w-full bg-[#D4AF37] text-black border-none p-2 font-bold rounded-md cursor-pointer hover:bg-[#b5952f] transition-colors font-serif">
            Enable Hand Control
          </button>
        )}
        
        {loading && <div className="text-gray-400 text-sm">Loading AI Model...</div>}

        {isActive && (
          <>
            <div className="relative w-full h-[150px] overflow-hidden rounded-md border border-[#333]">
              <video ref={videoRef} autoPlay playsInline muted className="absolute w-full h-full object-cover scale-x-[-1] opacity-60" />
              <canvas ref={canvasRef} width={320} height={240} className="absolute w-full h-full object-cover scale-x-[-1]" />
            </div>
            
            <div className="text-xs text-[#ccc] mt-3 flex flex-col gap-1 font-serif opacity-80">
              <div>✊ <b>Fist:</b> Summon Tree</div>
              <div>✋ <b>Palm:</b> Scatter / Close</div>
              <div>🤏 <b>Pinch:</b> Open Gift</div>
              <div>👋 <b>Tilt:</b> Spin Tree</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};