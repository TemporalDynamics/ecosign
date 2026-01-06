/**
 * MÓDULO NDA — REGLAS
 * 
 * Contrato: docs/centro-legal/MODULE_CONTRACTS.md
 * 
 * Propósito:
 * Permitir que un documento esté condicionado legalmente a la aceptación
 * explícita de un NDA antes de acceder, firmar o completar un flujo.
 * 
 * Reglas:
 * R1: Asociación fuerte (documento, NO envío)
 * R2: NDA único por documento
 * R3: Múltiples formas de creación (editar/subir/pegar)
 * R4: Experiencia del receptor (NDA → OTP → Acceso → Firma)
 * R5: NDA en flujo de firmas (cada firmante ve/acepta)
 * R6: Orden inmutable (NDA → OTP → Acceso → Firma)
 * 
 * Aclaración crítica:
 * - El NDA NO protege el archivo (eso lo hace el cifrado)
 * - El NDA protege el contexto legal del acceso
 * - El NDA NO se cifra (visible antes de OTP)
 * - El documento SÍ se cifra (OTP necesario)
 * 
 * No-responsabilidades:
 * - NO cifra documentos
 * - NO valida identidad
 * - NO registra IP
 * - NO guarda aceptación probatoria (eso es evento)
 * - NO decide niveles de protección
 */

export type NdaSource = 'inline-text' | 'uploaded-file' | 'pasted-text';
export type NdaContext = 'share-link' | 'signature-flow' | 'internal-review';
export type NdaPanelState = 'collapsed' | 'expanded';
export type NdaEditState = 'editing' | 'viewing';
export type NdaValidState = 'valid' | 'invalid';
export type NdaSaveState = 'dirty' | 'saved';

export interface NdaModuleState {
  ndaConfigured: boolean;
  ndaContent: string | File | null;
  ndaSource: NdaSource;
  ndaRequired: boolean;
  context: NdaContext;
}

export interface NdaPolicy {
  requiresAcceptance: boolean;
  appliesTo: ('share' | 'signature')[];
}

export const NDA_RULES = {
  strongAssociation: true,  // R1
  uniquePerDocument: true,  // R2
  multipleForms: true,      // R3
  receptorExperience: true, // R4
  inSignatureFlow: true,    // R5
  immutableOrder: true,     // R6
  notEncrypted: true,
  documentEncrypted: true,
} as const;

export const DEFAULT_NDA_STATE: NdaModuleState = {
  ndaConfigured: false,
  ndaContent: null,
  ndaSource: 'inline-text',
  ndaRequired: false,
  context: 'share-link',
};

export const DEFAULT_NDA_TEMPLATE = `ACUERDO DE CONFIDENCIALIDAD (NDA)

Las partes acuerdan mantener la confidencialidad de la información contenida en este documento.

1. Definiciones
La "Información Confidencial" incluye todo el contenido de este documento.

2. Obligaciones
El receptor se compromete a no divulgar la información a terceros.

3. Duración
Este acuerdo permanece vigente mientras la información sea confidencial.
`;
