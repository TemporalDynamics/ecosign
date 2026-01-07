/**
 * ORCHESTRATION: Grid Column Logic
 * Determina qué columnas del grid están visibles según el estado actual
 */

interface GridState {
  ndaEnabled: boolean;
  rightPanelOpen: boolean;
  isMobile: boolean;
}

/**
 * Calcula el template de columnas CSS para el grid del Centro Legal
 * 
 * Lógica canónica:
 * - Mobile: siempre 1 columna (center)
 * - Desktop: 1-3 columnas dependiendo de qué paneles están abiertos
 * 
 * @returns CSS grid-template-columns value
 */
export function resolveGridColumns({
  ndaEnabled,
  rightPanelOpen,
  isMobile
}: GridState): string {
  // Mobile: siempre 1 columna
  if (isMobile) {
    return '1fr';
  }

  // Desktop: 3 columnas posibles
  const leftWidth = ndaEnabled ? '320px' : '0px';
  const rightWidth = rightPanelOpen ? '380px' : '0px';
  
  return `${leftWidth} 1fr ${rightWidth}`;
}

/**
 * Determina qué paneles deberían estar visibles según el step actual
 */
export function resolveVisiblePanels(step: number): {
  canShowNda: boolean;
  canShowRightPanel: boolean;
} {
  return {
    canShowNda: step >= 1, // NDA disponible desde que hay documento
    canShowRightPanel: step >= 2 // Panel derecho solo después de certificar
  };
}
