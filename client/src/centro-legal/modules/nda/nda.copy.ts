/**
 * MÓDULO NDA — COPY
 * 
 * Copy para el módulo de NDA
 */

export const NDA_COPY = {
  // Toggle
  toggleLabel: 'NDA',
  
  // Panel
  PANEL_TITLE: 'Acuerdo de Confidencialidad',
  PANEL_DESCRIPTION: 'El NDA se mostrará antes de que el destinatario pueda acceder al documento.',
  expandButton: 'Ver completo',
  collapseButton: 'Minimizar',
  
  // Acciones
  editButton: 'Editar',
  uploadButton: 'Subir archivo',
  pasteButton: 'Pegar texto',
  SAVE_BUTTON: 'Guardar NDA',
  cancelButton: 'Cancelar',
  clearButton: 'Limpiar',
  
  // Estados
  ndaConfigured: 'NDA configurado',
  ndaNotConfigured: 'Configurar NDA',
  
  // Visor
  viewerTitle: 'Vista previa del NDA',
  
  // Receptor
  acceptButton: 'Acepto',
  rejectButton: 'Rechazar',
  scrollPrompt: 'Desplázate para continuar',
  
  // Validación
  emptyNda: 'El NDA no puede estar vacío',
  invalidFile: 'Formato de archivo no válido',
  
  // Orden inmutable (R6)
  ORDER_INFO: 'Orden de acceso: NDA → OTP → Documento → Firma',
  
  // Template default
  DEFAULT_TEMPLATE: `ACUERDO DE CONFIDENCIALIDAD

Este documento contiene información confidencial y de propiedad exclusiva.

Al acceder a este documento, usted acepta:

1. Mantener la confidencialidad de toda la información contenida
2. No divulgar, copiar ni distribuir este documento sin autorización
3. Usar la información únicamente para los fines acordados
4. Devolver o destruir cualquier copia al finalizar el propósito

Este acuerdo permanece vigente por 5 años desde la fecha de aceptación.

El incumplimiento puede resultar en acciones legales según las leyes aplicables.`,
} as const;
