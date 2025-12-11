import { useState, useEffect, useRef } from 'react';

interface PulseDetectionResult {
  currentBPM: number;
  finalBPM: number | null;
  isDetecting: boolean;
  progress: number;
  error: string | null;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const usePulseDetection = (durationSeconds: number = 10): PulseDetectionResult => {
  const [currentBPM, setCurrentBPM] = useState(0);
  const [finalBPM, setFinalBPM] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const redValuesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isDetecting) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let redSum = 0;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      if (red > 60 && green > 40 && blue > 20 && red > green && red > blue) {
        redSum += red;
        pixelCount++;
      }
    }

    if (pixelCount > 1000) {
      const avgRed = redSum / pixelCount;
      redValuesRef.current.push(avgRed);

      if (redValuesRef.current.length > 256) {
        redValuesRef.current.shift();
      }

      if (redValuesRef.current.length >= 30) {
        const bpm = calculateBPM(redValuesRef.current);
        if (bpm > 40 && bpm < 200) {
          setCurrentBPM(Math.round(bpm));
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(analyzeFrame);
  };

  const calculateBPM = (values: number[]): number => {
    if (values.length < 30) return 0;

    const mean = values.reduce((a, b) => a + b) / values.length;
    const detrended = values.map(v => v - mean);

    let maxPeak = 0;
    let peakCount = 0;
    const threshold = Math.max(...detrended.map(Math.abs)) * 0.5;

    for (let i = 1; i < detrended.length - 1; i++) {
      if (
        detrended[i] > threshold &&
        detrended[i] > detrended[i - 1] &&
        detrended[i] > detrended[i + 1]
      ) {
        peakCount++;
        maxPeak = Math.max(maxPeak, detrended[i]);
      }
    }

    const fps = 30;
    const durationInSeconds = values.length / fps;
    const bpm = (peakCount / durationInSeconds) * 60;

    return bpm;
  };

  const startDetection = async () => {
    try {
      setError(null);
      setFinalBPM(null);
      setCurrentBPM(0);
      setProgress(0);
      redValuesRef.current = [];

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsDetecting(true);
      startTimeRef.current = Date.now();

      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const progressPercent = Math.min((elapsed / (durationSeconds * 1000)) * 100, 100);
        setProgress(progressPercent);
      }, 100);

      timeoutRef.current = window.setTimeout(() => {
        stopDetection();
        if (currentBPM > 40 && currentBPM < 200) {
          setFinalBPM(currentBPM);
        }
      }, durationSeconds * 1000);

      animationFrameRef.current = requestAnimationFrame(analyzeFrame);

    } catch (err) {
      console.error('Camera error:', err);
      setError('Не удалось получить доступ к камере. Проверьте разрешения.');
      setIsDetecting(false);
    }
  };

  const stopDetection = () => {
    setIsDetecting(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  return {
    currentBPM,
    finalBPM,
    isDetecting,
    progress,
    error,
    startDetection,
    stopDetection,
    videoRef,
    canvasRef
  };
};
