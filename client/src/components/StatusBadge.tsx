// ========================================
// StatusBadge - Componente de Estado Visual
// Contrato: docs/ui/DOCUMENT_STATES_CONTRACT.md
// ========================================

import React from 'react';
import type { StatePhase } from '../lib/deriveDocumentState';

interface StatusBadgeProps {
  label: string;      // "Esperando firma (1/2)"
  phase: StatePhase;  // 'green' | 'blue' | 'gray'
  tooltip?: string;   // Opcional: texto para tooltip
}

/**
 * Badge de estado que mapea phase → colores CSS.
 *
 * REGLAS:
 * - Solo 3 fases: green, blue, gray
 * - Sin amarillo, sin rojo, sin error
 * - Colores suaves, sin estrés
 */
export default function StatusBadge({ label, phase, tooltip }: StatusBadgeProps) {

  // Mapeo phase → colores CSS
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  const classes = colorClasses[phase];

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${classes}`}
      title={tooltip}
    >
      {label}
    </span>
  );
}
