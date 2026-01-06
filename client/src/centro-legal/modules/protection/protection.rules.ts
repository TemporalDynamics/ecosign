/**
 * MÓDULO PROTECCIÓN — REGLAS
 * 
 * Contrato: docs/centro-legal/MODULE_CONTRACTS.md
 * 
 * Propósito:
 * Registrar el documento para verificación futura (TSA / Anchors).
 * 
 * Reglas:
 * R1: Solo si hay documento cargado
 * R2: Usuario puede activar/desactivar en cualquier momento
 * R3: Puede mostrar overlays informativos (NO técnicos)
 * R4: NO decide nivel de protección (se deriva de events[])
 * 
 * No-responsabilidades:
 * - NO escribe eventos TSA
 * - NO crea anchors
 * - NO calcula protection level
 * - NO valida certificados
 */

export interface ForensicConfig {
  useLegalTimestamp: boolean;  // TSA
  usePolygonAnchor: boolean;   // Polygon
  useBitcoinAnchor: boolean;   // Bitcoin
}

export interface ProtectionModuleState {
  forensicEnabled: boolean;
  forensicConfig: ForensicConfig;
}

export const PROTECTION_RULES = {
  requiresDocument: true,
  canToggle: true,
  showsOverlays: true,
  decidesLevel: false,
} as const;

export const DEFAULT_PROTECTION_STATE: ProtectionModuleState = {
  forensicEnabled: true, // ON by default
  forensicConfig: {
    useLegalTimestamp: true,
    usePolygonAnchor: true,
    useBitcoinAnchor: true,
  },
};
