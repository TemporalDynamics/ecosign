import React, { createContext, useContext, useState, useCallback } from 'react';

const VideoPlayerContext = createContext();

// Biblioteca de videos (ahora servidos desde Supabase Storage)
const SUPABASE_STORAGE_URL = 'https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/videos';

export const videoLibrary = {
  'you-dont-need-to-trust': {
    src: `${SUPABASE_STORAGE_URL}/Trust%20no%20need.mp4`,
    title: 'You Don\'t Need to Trust',
    description: 'Comprende por qué EcoSign no requiere confianza ciega'
  },
  'anatomia-firma': {
    src: `${SUPABASE_STORAGE_URL}/Anatomiafirma.mp4`,
    title: 'Anatomía de una Firma',
    description: 'Descubre cómo funciona cada componente de una firma digital'
  },
  'verdad-verificable': {
    src: `${SUPABASE_STORAGE_URL}/Verificable.mp4`,
    title: 'Verdad Verificable',
    description: 'Aprende sobre la verificación matemática de documentos'
  },
  'conocimiento-cero': {
    src: `${SUPABASE_STORAGE_URL}/ConocimientoCero.mp4`,
    title: 'Conocimiento Cero',
    description: 'Explora cómo protegemos tu privacidad sin ver tus documentos'
  },
  'the-true-cost': {
    src: `${SUPABASE_STORAGE_URL}/EcoSign%20TrueCost.mp4`,
    title: 'The True Cost',
    description: 'El verdadero costo de las soluciones tradicionales'
  },
  'forensic-integrity': {
    src: `${SUPABASE_STORAGE_URL}/Forensic_Integrity.mp4`,
    title: 'Forensic Integrity',
    description: 'Integridad forense y evidencia digital irrefutable'
  }
};

// Define el orden de la playlist
export const defaultPlaylist = [
  'you-dont-need-to-trust', // English
  'anatomia-firma',         // Spanish
  'the-true-cost',          // English
  'conocimiento-cero',      // Spanish
  'forensic-integrity',     // English
  'verdad-verificable'      // Spanish
];

export function VideoPlayerProvider({ children }) {
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    videoSrc: null,
    videoTitle: null,
    playlist: [],
    currentIndex: -1,
  });

  const playVideo = useCallback((videoKey, playlist = defaultPlaylist) => {
    const video = videoLibrary[videoKey];
    const playlistToUse = Array.isArray(playlist) && playlist.length > 0 ? playlist : [videoKey];
    const newIndex = playlistToUse.indexOf(videoKey);

    if (video) {
      setVideoState({
        isPlaying: true,
        videoSrc: video.src,
        videoTitle: video.title,
        playlist: playlistToUse,
        currentIndex: newIndex,
      });
    } else {
       // Fallback para URLs directas (comportamiento original)
       setVideoState({
        isPlaying: true,
        videoSrc: videoKey,
        videoTitle: 'Video',
        playlist: [videoKey],
        currentIndex: 0,
      });
    }
  }, []);

  const playNext = useCallback(() => {
    setVideoState(prevState => {
      if (!prevState.isPlaying || prevState.playlist.length === 0) return prevState;
      const nextIndex = (prevState.currentIndex + 1) % prevState.playlist.length;
      const nextVideoKey = prevState.playlist[nextIndex];
      const nextVideo = videoLibrary[nextVideoKey];
      if (nextVideo) {
        return {
          ...prevState,
          videoSrc: nextVideo.src,
          videoTitle: nextVideo.title,
          currentIndex: nextIndex,
        };
      }
      return prevState;
    });
  }, []);

  const playPrevious = useCallback(() => {
    setVideoState(prevState => {
      if (!prevState.isPlaying || prevState.playlist.length === 0) return prevState;
      const prevIndex = (prevState.currentIndex - 1 + prevState.playlist.length) % prevState.playlist.length;
      const prevVideoKey = prevState.playlist[prevIndex];
      const prevVideo = videoLibrary[prevVideoKey];
      if (prevVideo) {
        return {
          ...prevState,
          videoSrc: prevVideo.src,
          videoTitle: prevVideo.title,
          currentIndex: prevIndex,
        };
      }
      return prevState;
    });
  }, []);

  const closeVideo = () => {
    setVideoState({
      isPlaying: false,
      videoSrc: null,
      videoTitle: null,
      playlist: [],
      currentIndex: -1,
    });
  };

  const value = {
    videoState,
    playVideo,
    openVideo: playVideo,
    closeVideo,
    playNext,
    playPrevious,
  };

  return (
    <VideoPlayerContext.Provider value={value}>
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
