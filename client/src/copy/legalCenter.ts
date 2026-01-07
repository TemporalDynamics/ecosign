/**
 * Legal Center Copy
 * 
 * REGLAS CANÓNICAS:
 * - NO usar: "legal", "certificado", "criptográfico", "inmutable", "blockchain"
 * - SÍ usar: "protegido", "respaldado", "registro", "verificable"
 * 
 * DIFERENCIA CRÍTICA:
 * - "Protección activada" = toggle ON, sin hechos aún
 * - "Protegido" = hechos verificables en events[]
 */

export const LEGAL_CENTER_COPY = {
  protected: {
    title: 'Documento protegido',
    description: 'EcoSign registra este documento para que pueda verificarse en el futuro.',
    badge: 'Protegido',
  },
  
  protectionEnabled: {
    title: 'Protección activada',
    description: 'La protección se aplicará cuando se confirme el documento.',
    badge: 'Protección activada',
  },
  
  draft: {
    title: 'Borrador',
    description: 'Estás trabajando en un borrador. Aún no tiene validez probatoria.',
    badge: 'Borrador',
    autoSaveHint: 'Cambios guardados automáticamente',
  },
  
  unprotected: {
    title: 'Sin protección',
    description: 'Este documento no quedará respaldado.',
    badge: 'Sin protección',
  },
  
  toggle: {
    label: 'Protección del documento',
    hint: 'Recomendado para cualquier documento importante',
    ariaLabel: 'Activar o desactivar protección del documento',
  },
  
  warning: {
    title: '¿Salir sin protección?',
    message: 'Este documento no tendrá protección probatoria. Podrás usarlo, pero no quedará respaldado por EcoSign.',
    primaryAction: 'Activar protección',
    secondaryAction: 'Salir sin protección',
    dontShowAgain: 'No volver a mostrar este aviso',
  },
  
  feedback: {
    protectionEnabled: 'Documento protegido',
    protectionDisabled: 'Documento sin protección',
    draftSaved: 'Borrador guardado',
  },
} as const;

export type LegalCenterCopy = typeof LEGAL_CENTER_COPY;
