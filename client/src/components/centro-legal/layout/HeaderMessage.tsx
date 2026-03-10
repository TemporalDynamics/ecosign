import { useEffect, useState, useRef } from 'react';
import type { HeaderMessage as HeaderMessageData } from '../../../hooks/useLegalCenterGuide';

interface HeaderMessageProps {
  message: HeaderMessageData | null;
}

/**
 * Mensaje contextual inline en el header de Centro Legal.
 * Una sola línea, contenido entre comillas tipográficas, azul profundo.
 */
export default function HeaderMessage({ message }: HeaderMessageProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState<string | null>(null);
  const fadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (fadeOutTimer.current) {
      clearTimeout(fadeOutTimer.current);
      fadeOutTimer.current = null;
    }

    if (message) {
      setDisplayText(message.text);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      fadeOutTimer.current = setTimeout(() => {
        setDisplayText(null);
      }, 300);
    }

    return () => {
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
    };
  }, [message]);

  if (!displayText) return null;

  return (
    <span
      className={`text-[11px] leading-none text-blue-900 italic transition-opacity duration-300 line-clamp-2 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      «{displayText}»
    </span>
  );
}
