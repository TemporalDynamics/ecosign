import React from 'react';
import './LegalCenterStage.css';

/**
 * Legal Center Stage — Canvas Invariante (Modelo de Capas)
 *
 * PRINCIPIO:
 * "El Canvas es el ancla. Los paneles emergen desde atrás sin empujarlo."
 *
 * RESPONSABILIDAD:
 * - Define posiciones físicas (absolute positioning)
 * - Canvas FIJO en el centro (width: 800px, centrado)
 * - Paneles emergen con transform (no afectan layout)
 *
 * CONTRATO:
 * - Canvas: z-index: 10 (base)
 * - Paneles: z-index: 20 (sobre canvas)
 * - Animaciones: transform (no width)
 *
 * INVARIANTE:
 * Si el canvas cambia de ancho → arquitectura falló.
 */

interface LegalCenterStageProps {
  // Contenido del canvas central (FIJO)
  canvas: React.ReactNode;

  // Overlays (opcionales)
  leftOverlay?: React.ReactNode;
  rightOverlay?: React.ReactNode;

  // Estado de apertura
  leftOpen?: boolean;
  rightOpen?: boolean;
}

export default function LegalCenterStage({
  canvas,
  leftOverlay,
  rightOverlay,
  leftOpen = false,
  rightOpen = false
}: LegalCenterStageProps) {

  // 🔒 ANCLAJE FIJO UNIVERSAL
  // El canvas YA NO cambia de ancla
  // Siempre está en left: 500px (coordenada absoluta fija)
  // Los panels se ocultan/muestran con transform, no afectan al canvas

  return (
    <div
      className={`legal-center-stage${leftOpen ? ' has-left' : ''}${rightOpen ? ' has-right' : ''}`}
    >
      {/* Canvas Central (FIJO - left: 500px SIEMPRE) */}
      <main
        className="legal-center-stage__canvas"
        aria-label="Área principal de trabajo"
      >
        {canvas}
      </main>

      {/* Left Overlay (NDA) - left: 0, emerge desde fuera */}
      {leftOverlay && (
        <aside
          className={`legal-center-stage__left-overlay ${leftOpen ? 'open' : ''}`}
          aria-hidden={!leftOpen}
          aria-label="Panel de configuración NDA"
        >
          {leftOverlay}
        </aside>
      )}

      {/* Right Overlay (Flujo) - left: 1400px, emerge desde fuera */}
      {rightOverlay && (
        <aside
          className={`legal-center-stage__right-overlay ${rightOpen ? 'open' : ''}`}
          aria-hidden={!rightOpen}
          aria-label="Panel de configuración de flujo"
        >
          {rightOverlay}
        </aside>
      )}
    </div>
  );
}
