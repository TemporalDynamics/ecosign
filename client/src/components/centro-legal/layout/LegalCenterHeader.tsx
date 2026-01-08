import React from 'react';
import { X } from 'lucide-react';

interface LegalCenterHeaderProps {
  onClose: () => void;
  modeConfirmation?: string;
}

/**
 * Header del Centro Legal
 * 
 * - Componente independiente que vive fuera del Stage
 * - Se expande/contrae con el ancho del modal automáticamente
 * - No afecta al Canvas ni a los paneles
 */
export default function LegalCenterHeader({
  onClose,
  modeConfirmation
}: LegalCenterHeaderProps) {
  return (
    <div className="
      sticky top-0 left-0 right-0 z-50
      bg-white border-b border-gray-200
      px-6 py-2
      flex items-center justify-between
      transition-all duration-300
    ">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Centro Legal
        </h2>
        {modeConfirmation && (
          <span className="text-sm text-gray-500">
            {modeConfirmation}
          </span>
        )}
      </div>

      <button
        onClick={onClose}
        className="
          p-2 
          hover:bg-gray-100 
          rounded-lg 
          transition-colors
          text-gray-500 hover:text-gray-900
        "
        aria-label="Cerrar Centro Legal"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
