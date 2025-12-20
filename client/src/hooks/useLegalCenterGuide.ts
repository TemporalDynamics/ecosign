import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type GuideFlags = Record<string, boolean> & {
  disabled?: boolean;
  never_show_welcome?: boolean;
};

type GuideToastOptions = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  duration?: number;
  type?: 'default' | 'success' | 'error';
  icon?: string | JSX.Element;
  onDismiss?: () => void;
};

/**
 * Hook para manejar la guía "Mentor Ciego" del Centro Legal
 * Maneja persistencia de flags en localStorage
 */
export const useLegalCenterGuide = () => {
  const STORAGE_KEY = 'legal_center_guide';
  
  // Cargar flags desde localStorage
  const loadFlags = (): GuideFlags => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.warn('Error loading guide flags:', err);
      return {};
    }
  };

  const [flags, setFlags] = useState<GuideFlags>(loadFlags());
  const [guideEnabled, setGuideEnabled] = useState(() => {
    return flags.disabled !== true;
  });

  // Guardar flags en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (err) {
      console.warn('Error saving guide flags:', err);
    }
  }, [flags]);

  // Marcar un step como visto
  const markAsSeen = (step: string) => {
    setFlags((prev) => ({ ...prev, [step]: true }));
  };

  // Deshabilitar guía permanentemente
  const disableGuide = () => {
    setFlags((prev) => ({ ...prev, disabled: true }));
    setGuideEnabled(false);
  };

  // Mostrar toast de guía si no se ha visto
  const showGuideToast = (step: string, message: string, options: GuideToastOptions = {}) => {
    if (!guideEnabled || flags[step] || flags.disabled) {
      return;
    }

    const {
      position = 'top-right',
      duration = 6000,
      type = 'default',
      icon = 'ℹ️',
      onDismiss
    } = options;

    const toastOptions = {
      position,
      duration,
      icon,
      style: {
        background: type === 'default' ? '#fff' : type === 'success' ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${type === 'default' ? '#e5e7eb' : type === 'success' ? '#86efac' : '#fecaca'}`,
        padding: '16px',
        borderRadius: '12px',
        maxWidth: '400px'
      }
    };

    const toastId = toast(message, toastOptions);

    // Marcar como visto al cerrar
    const markTimeout = setTimeout(() => {
      markAsSeen(step);
      if (onDismiss) onDismiss();
    }, duration);

    return () => {
      clearTimeout(markTimeout);
      toast.dismiss(toastId);
    };
  };

  // Mostrar modal de bienvenida (siempre, excepto si marcaron "No volver a mostrar")
  const showWelcomeModal = () => {
    // Solo no mostrar si específicamente marcaron "No volver a mostrar"
    if (flags.never_show_welcome) {
      return false;
    }
    return true;
  };

  // Marcar "No volver a mostrar" el modal de bienvenida
  const neverShowWelcome = () => {
    setFlags((prev) => ({ ...prev, never_show_welcome: true }));
  };

  return {
    guideEnabled,
    flags,
    showGuideToast,
    showWelcomeModal,
    markAsSeen,
    disableGuide,
    neverShowWelcome
  };
};
