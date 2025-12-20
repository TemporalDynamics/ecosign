import { useEffect, useRef, useState, MouseEvent, TouchEvent } from 'react';

/**
 * Hook para manejar canvas de firma
 * Soporta mouse y touch events
 */
export const useSignatureCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas con dimensiones correctas considerando devicePixelRatio
    // Esto evita el offset del cursor en pantallas retina y con zoom
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Escalar el contexto para compensar el aumento de resolución
    ctx.scale(dpr, dpr);

    // Estilo de la línea
    ctx.strokeStyle = '#1f2937'; // gray-800
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Limpiar canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getEventCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
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

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
