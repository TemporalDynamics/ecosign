/**
 * Signature Fields Types
 * 
 * Define la estructura de campos visuales para posicionamiento de firma,
 * texto y fecha sobre documentos PDF.
 * 
 * IMPORTANTE: Estos campos son metadata de renderizado, NO verdad probatoria.
 */

export type FieldType = 'signature' | 'text' | 'date';

export interface SignatureField {
  /** ID único del campo (UUID v4) */
  id: string;

  /** Grupo lógico para duplicación por batch */
  batchId?: string;
  
  /** Tipo de campo */
  type: FieldType;
  
  /** Número de página (1-indexed) */
  page: number;
  
  /** Posición X en píxeles (relativa al PDF viewport) */
  x: number;
  
  /** Posición Y en píxeles (relativa al PDF viewport) */
  y: number;
  
  /** Ancho en píxeles */
  width: number;
  
  /** Alto en píxeles */
  height: number;
  
  /** Email del firmante asignado (opcional) */
  assignedTo?: string;
  
  /** Campo requerido para completar firma */
  required: boolean;
  
  /** Valor del campo (para text/date, vacío hasta firma) */
  value?: string;
  
  /** Aplicar en todas las páginas (solo signature) */
  applyToAllPages?: boolean;
  
  /** Metadata adicional */
  metadata?: {
    label?: string;
    placeholder?: string;
    format?: string; // Para date: 'DD/MM/YYYY', 'MM-DD-YYYY', etc.
    normalized?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface FieldCoordinates {
  /** Lista de campos configurados */
  fields: SignatureField[];
  
  /** Metadata del documento */
  documentInfo?: {
    totalPages: number;
    pageWidth: number;
    pageHeight: number;
  };
}

export interface WorkflowSigner {
  id?: string;
  email: string;
  name?: string;
  signingOrder: number;
  requireLogin?: boolean;
  requireNda?: boolean;
  quickAccess?: boolean;
  status?: 'pending' | 'ready' | 'signed' | 'requested_changes' | 'skipped';
}

export interface FieldValidationError {
  fieldId: string;
  message: string;
  type: 'missing_assignment' | 'overlapping' | 'out_of_bounds' | 'invalid_value';
}
