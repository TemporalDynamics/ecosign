import React, { useState, useRef, useEffect } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize2';
import Minimize2 from 'lucide-react/dist/esm/icons/minimize2';
import Maximize from 'lucide-react/dist/esm/icons/maximize';

function FloatingVideoPlayer({ videoSrc, videoTitle = 'EcoSign Video', onClose }) {
  const sizes = {
    small: { width: 320, label: 'Pequeño' },
    medium: { width: 480, label: 'Mediano' },
    large: { width: 640, label: 'Grande' }
  };

  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState('medium');
  const [position, setPosition] = useState({ x: window.innerWidth - sizes.medium.width - 20, y: window.innerHeight - 320 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    // Solo permitir drag desde el header, no desde el video
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Limitar a la pantalla
      const currentWidth = containerRef.current?.offsetWidth || sizes[size].width;
      const maxX = window.innerWidth - currentWidth;
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 300);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleSize = () => {
    const sizeOrder = ['small', 'medium', 'large'];
    const currentIndex = sizeOrder.indexOf(size);
    const nextSize = sizeOrder[(currentIndex + 1) % sizeOrder.length];
    setSize(nextSize);
    
    // Ajustar posición si el nuevo tamaño se sale de la pantalla
    const newWidth = sizes[nextSize].width;
    const maxX = window.innerWidth - newWidth;
    const maxY = window.innerHeight - 300;
    
    setPosition(prev => ({
      x: Math.min(prev.x, maxX),
      y: Math.min(prev.y, maxY)
    }));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  // Ajustar posición en resize
  useEffect(() => {
    const handleResize = () => {
      const currentWidth = sizes[size].width;
      const maxX = window.innerWidth - currentWidth;
      const maxY = window.innerHeight - 300;
      
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-black rounded-lg shadow-2xl border-2 border-gray-800 overflow-hidden transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : ''
      } ${isMinimized ? 'h-14' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '320px' : `${sizes[size].width}px`
      }}
    >
      {/* Header draggable */}
      <div
        className="drag-handle bg-gray-900 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <span className="text-white text-sm font-semibold truncate flex-1 mr-2">{videoTitle}</span>
        <div className="flex items-center gap-1">
          {!isMinimized && (
            <button
              onClick={toggleSize}
              className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded"
              title={`Tamaño: ${sizes[size].label}`}
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded"
            title={isMinimized ? "Maximizar" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video player */}
      {!isMinimized && (
        <div className="bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            autoPlay
            className="w-full h-auto"
            style={{ maxHeight: '60vh' }}
          >
            Tu navegador no soporta la reproducción de video.
          </video>
        </div>
      )}
    </div>
  );
}

export default FloatingVideoPlayer;
