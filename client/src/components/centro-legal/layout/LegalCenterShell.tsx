import React from 'react';
import { X } from 'lucide-react';

interface LegalCenterShellProps {
  children: React.ReactNode;
  modeConfirmation?: string;
  onClose: () => void;
  gridTemplateColumns: string;
}

/**
 * LAYOUT: Shell del Centro Legal
 * Responsabilidad: Contenedor modal base (backdrop, modal, header, grid)
 * NO contiene lógica de negocio
 */
export function LegalCenterShell({
  children,
  modeConfirmation,
  onClose,
  gridTemplateColumns
}: LegalCenterShellProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-0 py-0 md:px-4 md:py-6">
      <div className="modal-container bg-white rounded-none md:rounded-2xl w-full max-w-7xl max-h-full md:max-h-[94vh] h-[100svh] md:h-auto shadow-xl flex flex-col overflow-hidden">
        
        {/* Header fijo */}
        <div className="sticky top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Centro Legal
            </h2>
            {modeConfirmation && (
              <span className="text-sm text-gray-500 animate-fadeIn">
                {modeConfirmation}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Grid fijo de 3 zonas */}
        <div
          className="relative overflow-x-hidden overflow-y-auto grid flex-1"
          style={{ 
            gridTemplateColumns, 
            transition: 'grid-template-columns 300ms ease-in-out' 
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
