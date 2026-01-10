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

  // 🎯 CONTRATO HORIZONTAL: Modal elástico con clamp()
  // Stage usa width: fit-content → Modal se adapta automáticamente
  // - Canvas: clamp(420px, 55vw, 900px) - elástico
  // - NDA: clamp(300px, 25vw, 500px) - elástico
  // - Flow: clamp(280px, 20vw, 350px) - elástico

  // 🎯 CONTRATO VERTICAL: Altura máxima explícita
  // - Modal NO crece infinitamente con viewport
  // - max-height = viewport - header - margins
  // - Canvas es el ÚNICO scroll owner

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 px-0 pt-12 md:pt-16 md:px-4 md:py-4">
      <div
        className="modal-container bg-white rounded-none md:rounded-2xl w-auto shadow-xl flex flex-col"
        style={{
          // CONTRATO HORIZONTAL
          maxWidth: 'calc(100vw - 80px)', // Margen mínimo lateral

          // CONTRATO VERTICAL (CRÍTICO)
          // Mobile: viewport - 4rem header
          height: 'calc(100svh - 3rem)',
          // Desktop: viewport - 80px header - 48px margins
          maxHeight: 'calc(100vh - 96px)',

          // IMPORTANTE: overflow visible permite que panels absolute
          // se extiendan lateralmente fuera del modal sin clipearlos.
          // El control vertical está en el Canvas (scroll owner).
          overflow: 'visible',
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
            /* STAGE: Ocupa toda la altura disponible del modal */
            height: '100%',
            /* CRÍTICO: overflow visible permite que panels se extiendan lateralmente */
            overflow: 'visible'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
