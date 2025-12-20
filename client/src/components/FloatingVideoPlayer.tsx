import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent } from 'react';
import { X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';

type SizeKey = 'small' | 'large';

interface FloatingVideoPlayerProps {
  videoSrc: string;
  videoTitle?: string;
  onClose: () => void;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  playlist?: unknown[];
  currentIndex?: number;
}

const sizeOptions: Record<SizeKey, { width: number; label: string }> = {
  small: { width: 400, label: 'Pequeño' },
  large: { width: 640, label: 'Grande' }
};

function FloatingVideoPlayer({
  videoSrc,
  videoTitle = 'EcoSign Video',
  onClose,
  onEnded,
  onNext,
  onPrevious,
  playlist = [],
  currentIndex = -1
}: FloatingVideoPlayerProps) {

  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState<SizeKey>('small');
  const [position, setPosition] = useState({ x: window.innerWidth - sizeOptions.small.width - 20, y: window.innerHeight - 280 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const currentWidth = containerRef.current?.offsetWidth || sizeOptions[size].width;
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
    const nextSize = size === 'small' ? 'large' : 'small';
    setSize(nextSize);
    
    const newWidth = sizeOptions[nextSize].width;
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

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = sizeOptions[size].width;
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

  const canGoPrevious = playlist.length > 1 && currentIndex > 0;
  const canGoNext = playlist.length > 1 && currentIndex < playlist.length - 1;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-black rounded-lg shadow-2xl border-2 border-gray-800 overflow-hidden transition-all duration-200 ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${sizeOptions[size].width}px`
      }}
    >
      {/* Header draggable */}
      <div
        className="drag-handle bg-gray-900 px-3 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <span className="text-white text-sm font-semibold truncate flex-1 mr-2">{videoTitle}</span>
        <div className="flex items-center gap-1">
          {/* Playlist Controls */}
          {playlist.length > 1 && (
            <>
              <button
                onClick={onPrevious}
                disabled={!canGoPrevious}
                className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition p-1 hover:bg-gray-800 rounded"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onNext}
                disabled={!canGoNext}
                className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition p-1 hover:bg-gray-800 rounded"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={toggleSize}
            className="text-gray-400 hover:text-white transition p-1 hover:bg-gray-800 rounded"
            title={size === 'small' ? 'Ampliar' : 'Reducir'}
          >
            <Maximize2 className="w-4 h-4" />
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
      <div className="bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          autoPlay
          onEnded={onEnded} // <-- Added onEnded handler
          className="w-full h-auto"
          style={{ maxHeight: '60vh' }}
          key={videoSrc} // <-- Key to force re-render on src change
        >
          Tu navegador no soporta la reproducción de video.
        </video>
      </div>
    </div>
  );
}

export default FloatingVideoPlayer;
