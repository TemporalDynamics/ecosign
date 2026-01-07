/**
 * MÓDULO MI FIRMA — REGLAS
 * 
 * Contrato: docs/centro-legal/MODULE_CONTRACTS.md
 * 
 * Propósito:
 * Permitir que el usuario prepare su firma (NO necesariamente estamparla aún).
 * 
 * Reglas:
 * R1: Modal flotante (NO altera layout)
 * R2: NO firma en blockchain (solo prepara firma visual)
 * R3: NO implica envío (activar ≠ enviar)
 * 
 * No-responsabilidades:
 * - NO persiste firma en DB
 * - NO crea eventos de firma
 * - NO valida identidad del firmante
 * 
 * Aclaración crítica:
 * "Mi firma" ≠ "Documento firmado"
 */

export type SignatureMode = 'canvas' | 'upload' | 'type';

export interface SignatureData {
  imageUrl: string;
  coordinates: { x: number; y: number };
}

export interface MySignatureModuleState {
  signatureReady: boolean;
  signatureData: SignatureData | null;
  signatureMode: SignatureMode;
}

export const SIGNATURE_RULES = {
  modalFloating: true,
  noBlockchain: true,
  noImplySend: true,
  noPersist: true,
  noCreateEvents: true,
  noValidateIdentity: true,
} as const;

export const DEFAULT_SIGNATURE_STATE: MySignatureModuleState = {
  signatureReady: false,
  signatureData: null,
  signatureMode: 'canvas',
};
