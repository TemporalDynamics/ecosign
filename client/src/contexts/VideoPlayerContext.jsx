import React, { createContext, useContext, useState } from 'react';

const VideoPlayerContext = createContext();

// Biblioteca de videos
export const videoLibrary = {
  'you-dont-need-to-trust': {
    src: '/videos/You_Don_t_Need_to_Trust.mp4',
    title: 'You Don\'t Need to Trust',
    description: 'Comprende por qué EcoSign no requiere confianza ciega'
  },
  'anatomia-firma': {
    src: '/videos/EcoSign__Anatomía_de_una_firma.mp4',
    title: 'Anatomía de una Firma',
    description: 'Descubre cómo funciona cada componente de una firma digital'
  },
  'verdad-verificable': {
    src: '/videos/EcoSign__Verdad_Verificable.mp4',
    title: 'Verdad Verificable',
    description: 'Aprende sobre la verificación matemática de documentos'
  },
  'conocimiento-cero': {
    src: '/videos/EcoSign__Conocimiento_Cero.mp4',
    title: 'Conocimiento Cero',
    description: 'Explora cómo protegemos tu privacidad sin ver tus documentos'
  },
  'the-true-cost': {
    src: '/videos/EcoSign__The_True_Cost.mp4',
    title: 'The True Cost',
    description: 'El verdadero costo de las soluciones tradicionales'
  },
  'forensic-integrity': {
    src: '/videos/Forensic_Integrity.mp4',
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
