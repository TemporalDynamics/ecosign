import React, { createContext, useContext, useState } from 'react';

const VideoPlayerContext = createContext();

export function VideoPlayerProvider({ children }) {
  const [showFloatingVideo, setShowFloatingVideo] = useState(false);

  return (
    <VideoPlayerContext.Provider value={{ showFloatingVideo, setShowFloatingVideo }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
}
