/**
 * MÓDULO PROTECCIÓN — TOGGLE
 * 
 * Componente: Toggle de protección en bottom actions
 * Ubicación: Entre NDA y Mi Firma
 * 
 * Comportamiento:
 * - Mismo estilo que otros toggles (NDA, Mi Firma, Flujo)
 * - Feedback inmediato (toast neutro)
 * - NO abre modal
 * - NO escribe eventos
 */

import React from 'react';
import toast from 'react-hot-toast';
import { PROTECTION_COPY } from './protection.copy';

interface ProtectionToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const ProtectionToggle: React.FC<ProtectionToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
}) => {
  const handleClick = () => {
    if (disabled) return;

    const newState = !enabled;
    onToggle(newState);

    // BLOQUE 1: Feedback inmediato
    if (newState) {
      toast(PROTECTION_COPY.toastActivated, {
        duration: 2000,
        position: 'top-right',
      });
    } else {
      toast(PROTECTION_COPY.toastDeactivated, {
        duration: 2000,
        position: 'top-right',
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
      {PROTECTION_COPY.toggleLabel}
    </button>
  );
};
