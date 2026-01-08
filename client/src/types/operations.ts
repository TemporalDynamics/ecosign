// ========================================
// Tipos para Operaciones (Carpetas Lógicas)
// Basado en: docs/contratos/OPERACIONES_CONTRACT.md
// Basado en: docs/contratos/DRAFT_OPERATION_RULES.md
// ========================================

/**
 * Estado de una operación según contrato P0 + Draft
 */
export type OperationStatus = 'draft' | 'active' | 'closed' | 'archived';

/**
 * Operación - Contenedor lógico de documentos relacionados
 */
export interface Operation {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: OperationStatus;
  created_at: string;
  updated_at: string;

  // Campos agregados en el frontend
  document_count?: number;
}

/**
 * Relación documento-operación
 */
export interface OperationDocument {
  id: string;
  operation_id: string;
  document_entity_id: string;
  added_at: string;
  added_by: string | null;
}

/**
 * Operación con documentos incluidos (para vista detallada)
 */
export interface OperationWithDocuments extends Operation {
  documents: Array<{
    id: string;
    source_name: string;
    source_hash: string;
    created_at: string;
    added_at: string; // Cuando se agregó a la operación
  }>;
}

/**
 * Resumen de operaciones para el dashboard
 */
export interface OperationsSummary {
  draft_count: number;
  active_count: number;
  closed_count: number;
  archived_count: number;
  total_documents: number;
}

/**
 * Payload para crear operación
 */
export interface CreateOperationPayload {
  name: string;
  description?: string;
  status?: OperationStatus; // Default: 'active'
}

/**
 * Payload para actualizar operación
 */
export interface UpdateOperationPayload {
  name?: string;
  description?: string;
  status?: OperationStatus;
}
