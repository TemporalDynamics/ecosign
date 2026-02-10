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
  
  // Template default (NDA canónico v1)
  DEFAULT_TEMPLATE: `ACUERDO DE CONFIDENCIALIDAD (NDA)

Al aceptar este acuerdo, la persona firmante (“Receptor”) reconoce y acepta que:

1. Información Confidencial
Se considera Información Confidencial toda información, documento o contenido
al que el Receptor acceda en el marco del flujo de firma, incluyendo pero no
limitado a documentos, datos, metadatos y evidencias.

2. Obligación de Confidencialidad
El Receptor se compromete a no divulgar, compartir ni utilizar la Información
Confidencial para fines distintos a la finalidad del acto de firma, salvo
autorización expresa del titular o requerimiento legal válido.

3. Alcance
Este acuerdo aplica desde el momento de su aceptación y se mantiene vigente
independientemente de que el proceso de firma se complete o no.

4. Exclusiones
No se considerará Información Confidencial aquella que:
a) Sea de dominio público sin violación de este acuerdo.
b) Haya sido obtenida legítimamente por el Receptor con anterioridad.
c) Deba divulgarse por mandato legal o judicial.

5. Aceptación
La aceptación de este acuerdo queda registrada de forma verificable como un
evento independiente del documento firmado.

Fecha de versión: 2026-02-10
Versión: v1`,
} as const;
