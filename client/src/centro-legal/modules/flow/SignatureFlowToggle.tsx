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
import toast from 'react-hot-toast';
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

    // Toast al activar
    if (newState) {
      toast(FLOW_COPY.toastActivated, {
        position: 'top-right',
        duration: 3000,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`h-11 px-4 rounded-lg text-sm font-medium border transition ${
        enabled
          ? 'border-blue-900 text-blue-900 bg-transparent'
          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {FLOW_COPY.toggleLabel}
    </button>
  );
};
