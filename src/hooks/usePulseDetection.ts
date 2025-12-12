import { useState, useEffect, useRef, useCallback } from 'react';

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

export const usePulseDetection = (durationSeconds: number = 15): PulseDetectionResult => {
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
  const timestampsRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastPeakTimeRef = useRef<number>(0);

  const calculateBPM = useCallback((values: number[], timestamps: number[]): number => {
    if (values.length < 60) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const normalized = values.map(v => v - mean);

    const peaks: number[] = [];
    const minPeakDistance = 300;

    for (let i = 2; i < normalized.length - 2; i++) {
      if (
        normalized[i] > normalized[i - 1] &&
        normalized[i] > normalized[i - 2] &&
        normalized[i] > normalized[i + 1] &&
        normalized[i] > normalized[i + 2] &&
        normalized[i] > 0
      ) {
        if (peaks.length === 0 || timestamps[i] - peaks[peaks.length - 1] > minPeakDistance) {
          peaks.push(timestamps[i]);
        }
      }
    }

    if (peaks.length < 2) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = 60000 / avgInterval;

    return bpm;
  }, []);

  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (isDetecting) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      }
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    
    if (width === 0 || height === 0) {
      if (isDetecting) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      }
      return;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const sampleSize = Math.min(width, height) / 3;

    const imageData = ctx.getImageData(
      centerX - sampleSize / 2,
      centerY - sampleSize / 2,
      sampleSize,
      sampleSize
    );
    const data = imageData.data;

    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
      redSum += data[i];
      greenSum += data[i + 1];
      blueSum += data[i + 2];
      count++;
    }

    if (count > 0) {
      const avgRed = redSum / count;
      const avgGreen = greenSum / count;
      const avgBlue = blueSum / count;

      const brightness = (avgRed + avgGreen + avgBlue) / 3;

      if (brightness > 80 && brightness < 240) {
        const timestamp = Date.now();
        redValuesRef.current.push(avgRed);
        timestampsRef.current.push(timestamp);

        if (redValuesRef.current.length > 450) {
          redValuesRef.current.shift();
          timestampsRef.current.shift();
        }

        if (redValuesRef.current.length >= 60 && timestamp - startTimeRef.current > 3000) {
          const bpm = calculateBPM(redValuesRef.current, timestampsRef.current);
          if (bpm > 40 && bpm < 200) {
            setCurrentBPM(Math.round(bpm));
          }
        }
      }
    }

    if (isDetecting) {
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }
  }, [isDetecting, calculateBPM]);

  const startDetection = async () => {
    try {
      setError(null);
      setFinalBPM(null);
      setCurrentBPM(0);
      setProgress(0);
      redValuesRef.current = [];
      timestampsRef.current = [];
      lastPeakTimeRef.current = 0;

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if ('torch' in capabilities) {
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: true }]
        });
      }

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
        const finalValue = redValuesRef.current.length >= 60 
          ? calculateBPM(redValuesRef.current, timestampsRef.current) 
          : 0;
        stopDetection();
        if (finalValue > 40 && finalValue < 200) {
          setFinalBPM(Math.round(finalValue));
        } else {
          setError('Не удалось определить пульс. Плотно приложите палец к камере и держите неподвижно.');
        }
      }, durationSeconds * 1000);

      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
      }, 500);

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
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => {
        if ('torch' in track.getCapabilities()) {
          track.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: false }]
          }).catch(() => {});
        }
        track.stop();
      });
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
