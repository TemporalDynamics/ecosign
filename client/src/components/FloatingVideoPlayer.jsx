import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

function FloatingVideoPlayer({ videoSrc, onClose }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 300 });
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
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 250);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 250);
      
      setPosition(prev => ({
        x: Math.min(prev.x, maxX),
        y: Math.min(prev.y, maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-black rounded-lg shadow-2xl border-2 border-gray-800 overflow-hidden transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : ''
      } ${isMinimized ? 'w-80 h-14' : 'w-96 md:w-[28rem]'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header draggable */}
      <div
        className="drag-handle bg-gray-900 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <span className="text-white text-sm font-semibold">Cómo funciona EcoSign</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition p-1"
            title={isMinimized ? "Maximizar" : "Minimizar"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
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
