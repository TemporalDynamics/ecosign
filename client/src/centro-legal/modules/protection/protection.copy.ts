/**
 * MÓDULO PROTECCIÓN — COPY
 * 
 * BLOQUE 1: Copy simple y no técnico
 * 
 * Prohibido:
 * - Mencionar "blockchain"
 * - Mencionar "RFC 3161"
 * - Mencionar "Polygon" / "Bitcoin"
 * - Explicar técnicas
 */

export const PROTECTION_COPY = {
  // Toggle
  toggleLabel: 'Protejer',
  
  // Toast al activar
  toastActivated: '🛡️ Protección activada',
  
  // Toast al desactivar
  toastDeactivated: 'Documento sin protección',
  
  // Toast inicial (al subir documento)
  toastInitial: '🛡️ Protección activada — Este documento quedará respaldado por EcoSign.',
  
  // Modal info (simple, NO técnico)
  modalTitle: 'Protección Legal',
  modalDescription: 'EcoSign registra este documento para que pueda verificarse en el futuro.',
  
  // Warning modal
  warningTitle: '¿Salir sin protección?',
  warningDescription: 'Este documento no tendrá protección probatoria. Podrás usarlo, pero no quedará respaldado por EcoSign.',
  warningActivateButton: 'Activar protección',
  warningExitButton: 'Salir sin protección',
} as const;
