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
    }
    // Parent handles messaging via guide system
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isValidating}
      className={`min-h-11 h-auto w-full min-w-0 px-2 py-1.5 rounded-lg text-[13px] leading-4 text-center font-medium border transition ${
        enabled
          ? 'border-blue-900 text-blue-900 bg-transparent'
          : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'
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
