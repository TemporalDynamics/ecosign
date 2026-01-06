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
 *
 * P0.3: Soporta validación async (TSA connectivity)
 * - isValidating prop muestra "Validando..."
 * - onToggle puede ser async
 */

import React from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { PROTECTION_COPY } from './protection.copy';

interface ProtectionToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void | Promise<void>;
  disabled?: boolean;
  isValidating?: boolean; // P0.3: TSA validation state
}

export const ProtectionToggle: React.FC<ProtectionToggleProps> = ({
  enabled,
  onToggle,
  disabled = false,
  isValidating = false,
}) => {
  const handleClick = async () => {
    if (disabled || isValidating) return;

    const newState = !enabled;
    const result = onToggle(newState);

    // If onToggle is async (returns Promise), wait for it
    if (result instanceof Promise) {
      await result;
      // Parent handles toast after validation
    } else {
      // Sync toggle - show toast immediately
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
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isValidating}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        enabled
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${disabled || isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isValidating ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Validando...
        </span>
      ) : (
        PROTECTION_COPY.toggleLabel
      )}
    </button>
  );
};
