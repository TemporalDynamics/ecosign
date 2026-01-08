import React from 'react';

interface LegalCenterShellProps {
  children: React.ReactNode;
  modeConfirmation?: string;
  onClose: () => void;
  gridTemplateColumns: string;
  useGrid?: boolean; // false cuando se usa Stage (absolute positioning)
  ndaOpen?: boolean; // Panel NDA abierto
  flowOpen?: boolean; // Panel Flujo abierto
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
  gridTemplateColumns,
  useGrid = true, // Por defecto usa grid (legacy)
  ndaOpen = false,
  flowOpen = false
}: LegalCenterShellProps) {

  // 🎯 MODAL ELÁSTICO: Se ajusta al contenido del Stage
  // Stage usa width: fit-content → Modal se adapta automáticamente
  // - Estado cerrado: ~900px (solo Canvas)
  // - NDA abierto: ~1400px (NDA + Canvas)
  // - Ambos abiertos: ~1750px (NDA + Canvas + Firmas)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 px-0 pt-16 md:pt-20 md:px-4 md:py-6">
      <div 
        className="modal-container bg-white rounded-none md:rounded-2xl w-auto h-[calc(100svh-4rem)] md:h-[85vh] max-h-[90vh] shadow-xl flex flex-col"
        style={{ 
          maxWidth: 'calc(100vw - 80px)', // Margen mínimo lateral
          overflow: 'visible' // CRÍTICO: Permite que panels se extiendan
        }}
      >
        
        {/* Header removido temporalmente - Modal debe mantener posición */}

        {/* Content - Grid (legacy) o Stage (absolute) */}
        <div
          className={`relative ${useGrid ? 'grid overflow-y-auto' : 'h-full'}`}
          style={useGrid ? {
            gridTemplateColumns,
            transition: 'grid-template-columns 300ms ease-in-out'
          } : {
            /* STAGE: Ocupa toda la altura disponible */
            height: '100%',
            overflow: 'visible' // PERMITE que panels se extiendan fuera
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
