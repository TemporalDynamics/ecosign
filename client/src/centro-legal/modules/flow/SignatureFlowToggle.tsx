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
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        enabled
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {FLOW_COPY.toggleLabel}
    </button>
  );
};
