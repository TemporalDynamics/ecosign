import { useRef, useState } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const VideoPlayer = ({ src, poster, className = '' }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
      setShowControls(true);
    }
  };

  const handleVideoClick = () => {
    if (!isPlaying) {
      handlePlay();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-auto cursor-pointer"
        playsInline
        preload="metadata"
        poster={poster}
        controls={showControls}
        style={{ backgroundColor: '#ffffff', display: 'block' }}
        onClick={handleVideoClick}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(false);
        }}
      >
        <source src={src} type="video/mp4" />
        Tu navegador no soporta video HTML5.
      </video>
      
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer group"
          onClick={handlePlay}
        >
          {/* Play button - minimal EcoSign style */}
          <div className="transition-transform group-hover:scale-105 duration-200">
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 64 64" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Círculo exterior - solo stroke */}
              <circle 
                cx="32" 
                cy="32" 
                r="30" 
                stroke="#0E4B8B" 
                strokeWidth="2"
                fill="rgba(255, 255, 255, 0.7)"
              />
              {/* Triángulo play - solo stroke */}
              <path 
                d="M26 22L42 32L26 42V22Z" 
                stroke="#0E4B8B" 
                strokeWidth="2" 
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
