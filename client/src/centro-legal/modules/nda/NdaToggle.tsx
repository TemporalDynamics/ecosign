/**
 * MÓDULO NDA — TOGGLE
 * 
 * Componente: Toggle de NDA en bottom actions
 * Ubicación: Primer toggle (antes de Protección)
 * 
 * Comportamiento:
 * - Mismo estilo que otros toggles
 * - Abre panel izquierdo
 * - NO muestra toast (silencioso por ahora)
 */

import React from 'react';
import { NDA_COPY } from './nda.copy';

interface NdaToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const NdaToggle: React.FC<NdaToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled) return;
    onToggle(!enabled);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        enabled
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {NDA_COPY.toggleLabel}
    </button>
  );
};
