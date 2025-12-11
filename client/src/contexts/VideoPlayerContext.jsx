import React, { createContext, useContext, useState } from 'react';

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

export function VideoPlayerProvider({ children }) {
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    videoSrc: null,
    videoTitle: null
  });

  const playVideo = (videoKeyOrSrc) => {
    const video = videoLibrary[videoKeyOrSrc];
    if (video) {
      setVideoState({
        isPlaying: true,
        videoSrc: video.src,
        videoTitle: video.title
      });
      return;
    }
    // fallback: treat as direct src
    setVideoState({
      isPlaying: true,
      videoSrc: videoKeyOrSrc,
      videoTitle: 'Video'
    });
  };

  const closeVideo = () => {
    setVideoState({
      isPlaying: false,
      videoSrc: null,
      videoTitle: null
    });
  };

  return (
    <VideoPlayerContext.Provider value={{ videoState, playVideo, openVideo: playVideo, closeVideo }}>
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
