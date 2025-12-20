import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// --- Type Definitions ---

// Defines the structure for a single video entry
interface Video {
  src: string;
  title: string;
  description: string;
}

// Defines the allowed keys for the video library, derived from the object itself
export type VideoKey = keyof typeof videoLibrary;

// Defines the state of the video player
interface VideoPlayerState {
  isPlaying: boolean;
  videoSrc: string | null;
  videoTitle: string | null;
  playlist: VideoKey[];
  currentIndex: number;
}

// Defines the shape of the context value
interface VideoPlayerContextType {
  videoState: VideoPlayerState;
  playVideo: (videoKey: VideoKey, playlist?: VideoKey[]) => void;
  openVideo: (videoKey: VideoKey, playlist?: VideoKey[]) => void;
  closeVideo: () => void;
  playNext: () => void;
  playPrevious: () => void;
}

// --- Context and Library ---

const VideoPlayerContext = createContext<VideoPlayerContextType | null>(null);

const SUPABASE_STORAGE_URL = 'https://uiyojopjbhooxrmamaiw.supabase.co/storage/v1/object/public/videos';

export const videoLibrary: Record<string, Video> = {
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

export const defaultPlaylist: VideoKey[] = [
  'you-dont-need-to-trust',
  'anatomia-firma',
  'the-true-cost',
  'conocimiento-cero',
  'forensic-integrity',
  'verdad-verificable'
];

interface VideoPlayerProviderProps {
  children: ReactNode;
}

export function VideoPlayerProvider({ children }: VideoPlayerProviderProps) {
  const [videoState, setVideoState] = useState<VideoPlayerState>({
    isPlaying: false,
    videoSrc: null,
    videoTitle: null,
    playlist: [],
    currentIndex: -1,
  });

  const playVideo = useCallback((videoKey: VideoKey, playlist: VideoKey[] = defaultPlaylist) => {
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
       // This fallback is problematic with strong types, but kept for now.
       // In a real scenario, videoKey should always be a valid key.
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

  const value: VideoPlayerContextType = {
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

export function useVideoPlayer(): VideoPlayerContextType {
  const context = useContext(VideoPlayerContext);
  if (!context) {
    throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
  }
  return context;
}
