/**
 * MÓDULO MI FIRMA — TOGGLE
 * 
 * Componente: Toggle de Mi Firma en bottom actions
 * Ubicación: Después de Protección
 * 
 * Comportamiento:
 * - Mismo estilo que otros toggles (NDA, Protección, Flujo)
 * - Abre modal de firma sobre preview
 * - Toast informativo
 * - NO escribe eventos
 */

import React from 'react';
import { SIGNATURE_COPY } from './signature.copy';

interface MySignatureToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  hasFile?: boolean;
}

export const MySignatureToggle: React.FC<MySignatureToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
  hasFile = false,
}) => {
  const handleClick = () => {
    if (disabled) return;

    const newState = !enabled;
    onToggle(newState);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`min-h-11 h-auto w-full min-w-0 px-2 py-1.5 rounded-lg text-[13px] leading-4 text-center font-medium border transition ${
        enabled
          ? 'border-blue-900 text-blue-900 bg-transparent'
          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {SIGNATURE_COPY.toggleLabel}
    </button>
  );
};
