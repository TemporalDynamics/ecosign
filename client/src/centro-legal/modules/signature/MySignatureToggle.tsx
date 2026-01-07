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
import toast from 'react-hot-toast';
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

    // Toast al activar
    if (newState && hasFile) {
      toast(SIGNATURE_COPY.toastActivated, {
        icon: SIGNATURE_COPY.toastIcon,
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
      {SIGNATURE_COPY.toggleLabel}
    </button>
  );
};
