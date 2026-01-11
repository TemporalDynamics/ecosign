import { useEffect, useRef, useState, MouseEvent, TouchEvent } from 'react';

/**
 * Hook para manejar canvas de firma
 * Soporta mouse y touch events
 */
type SignatureCanvasOptions = {
  lineWidth?: number;
  strokeStyle?: string;
  backgroundColor?: string;
};

export const useSignatureCanvas = (options: SignatureCanvasOptions = {}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastMidPointRef = useRef<{ x: number; y: number } | null>(null);

  const prepareCanvas = (preserveDrawing = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    let snapshot: ImageData | null = null;
    if (preserveDrawing) {
      try {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        snapshot = null;
      }
    }

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = options.strokeStyle ?? '#1f2937';
    ctx.lineWidth = options.lineWidth ?? 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = options.backgroundColor ?? '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    prepareCanvas();
    const handleResize = () => prepareCanvas();
    const observer = new ResizeObserver(() => prepareCanvas(true));

    observer.observe(canvas);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getEventCoordinates = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getEventCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    lastPointRef.current = { x, y };
    lastMidPointRef.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault(); // Prevenir scroll en móvil

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getEventCoordinates(e);
    const lastPoint = lastPointRef.current;
    const lastMidPoint = lastMidPointRef.current;
    if (!lastPoint || !lastMidPoint) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastPointRef.current = { x, y };
      lastMidPointRef.current = { x, y };
      setHasSignature(true);
      return;
    }

    const midPoint = {
      x: (lastPoint.x + x) / 2,
      y: (lastPoint.y + y) / 2,
    };
    ctx.beginPath();
    ctx.moveTo(lastMidPoint.x, lastMidPoint.y);
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
    ctx.stroke();
    lastPointRef.current = { x, y };
    lastMidPointRef.current = midPoint;
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
    lastMidPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  const getSignatureData = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;

    // Retornar imagen en base64
    return canvas.toDataURL('image/png');
  };

  return {
    canvasRef,
    hasSignature,
    clearCanvas,
    getSignatureData,
    handlers: {
      onMouseDown: startDrawing,
      onMouseMove: draw,
      onMouseUp: stopDrawing,
      onMouseLeave: stopDrawing,
      onTouchStart: startDrawing,
      onTouchMove: draw,
      onTouchEnd: stopDrawing
    }
  };
};
