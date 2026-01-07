/**
 * MÓDULO FLUJO DE FIRMAS — COPY
 * 
 * Copy para el módulo de flujo
 */

export const FLOW_COPY = {
  // Toggle
  toggleLabel: 'Flujo de Firmas',
  
  // Toast al activar
  toastActivated: 'Agregá los correos de las personas que deben firmar o recibir el documento.',
  
  // Panel
  panelTitle: 'Flujo de Firmas',
  addSignerButton: 'Agregar firmante',
  removeSignerButton: 'Eliminar',
  
  // Campos
  emailLabel: 'Email',
  emailPlaceholder: 'email@ejemplo.com',
  nameLabel: 'Nombre (opcional)',
  namePlaceholder: 'Nombre del firmante',
  
  // Opciones
  requireLoginLabel: 'Requiere login',
  requireNdaLabel: 'Requiere NDA',
  quickAccessLabel: 'Acceso rápido',
  
  // Estados
  signerCount: (count: number) => `${count} firmante${count !== 1 ? 's' : ''}`,
  emptyState: 'Agregá al menos un firmante',
  
  // Validación
  invalidEmail: 'Email inválido',
  duplicateEmail: 'Este email ya fue agregado',
} as const;
