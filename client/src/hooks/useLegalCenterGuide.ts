import { useState, useEffect, useRef, useCallback } from 'react';

type GuideFlags = Record<string, boolean> & {
  disabled?: boolean;
  never_show_welcome?: boolean;
};

export type HeaderMessageType = 'guide' | 'confirmation';

export interface HeaderMessage {
  text: string;
  type: HeaderMessageType;
}

/**
 * Hook para manejar la guía contextual del Centro Legal.
 * Los mensajes de guía y confirmación se renderizan inline en el header
 * del Centro Legal (no como toasts). Errores y post-cierre siguen siendo toasts.
 */
export const useLegalCenterGuide = () => {
  const STORAGE_KEY = 'legal_center_guide';

  const loadFlags = (): GuideFlags => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const [flags, setFlags] = useState<GuideFlags>(loadFlags());
  const [guideEnabled, setGuideEnabled] = useState(() => flags.disabled !== true);
  const [headerMessage, setHeaderMessage] = useState<HeaderMessage | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch { /* ignore */ }
  }, [flags]);

  const clearMessage = useCallback(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    setHeaderMessage(null);
  }, []);

  const markAsSeen = useCallback((step: string) => {
    setFlags((prev) => ({ ...prev, [step]: true }));
  }, []);

  /**
   * Muestra un mensaje de guía en el header central.
   * Si el step ya fue visto o la guía está deshabilitada, no muestra nada.
   * durationMs = 0 → permanente (se queda hasta que otro mensaje lo reemplace o se llame clearMessage).
   */
  const showGuideMessage = useCallback((step: string, text: string, durationMs = 0) => {
    if (!guideEnabled || flags[step] || flags.disabled) return;

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setHeaderMessage({ text, type: 'guide' });

    if (durationMs > 0) {
      fadeTimerRef.current = setTimeout(() => {
        setHeaderMessage(null);
        fadeTimerRef.current = null;
      }, durationMs);
    }
  }, [guideEnabled, flags]);

  /**
   * Muestra un mensaje de confirmación breve en el header.
   * Se desvanece automáticamente. No requiere guía habilitada.
   */
  const showConfirmation = useCallback((text: string, durationMs = 2500) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setHeaderMessage({ text, type: 'confirmation' });

    fadeTimerRef.current = setTimeout(() => {
      setHeaderMessage(null);
      fadeTimerRef.current = null;
    }, durationMs);
  }, []);

  const disableGuide = useCallback(() => {
    setFlags((prev) => ({ ...prev, disabled: true }));
    setGuideEnabled(false);
    clearMessage();
  }, [clearMessage]);

  const shouldShowWelcomeModal = useCallback(() => {
    return flags.never_show_welcome !== true;
  }, [flags]);

  const neverShowWelcome = useCallback(() => {
    setFlags((prev) => ({ ...prev, never_show_welcome: true }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return {
    guideEnabled,
    flags,
    headerMessage,
    showGuideMessage,
    showConfirmation,
    clearMessage,
    markAsSeen,
    disableGuide,
    shouldShowWelcomeModal,
    neverShowWelcome
  };
};
