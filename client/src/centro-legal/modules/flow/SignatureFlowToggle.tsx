/**
 * MÓDULO FLUJO DE FIRMAS — TOGGLE
 * 
 * Componente: Toggle de Flujo de Firmas en bottom actions
 * Ubicación: Último toggle (después de Mi Firma)
 * 
 * Comportamiento:
 * - Mismo estilo que otros toggles
 * - Abre panel derecho
 * - Toast informativo
 */

import React from 'react';
import { FLOW_COPY } from './flow.copy';

interface SignatureFlowToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const SignatureFlowToggle: React.FC<SignatureFlowToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
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
      {FLOW_COPY.toggleLabel}
    </button>
  );
};
