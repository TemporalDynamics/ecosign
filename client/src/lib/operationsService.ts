// ========================================
// Servicio de Operaciones
// Basado en: docs/contratos/OPERACIONES_CONTRACT.md
// ========================================

import { getSupabase } from './supabaseClient';
import type {
  Operation,
  OperationStatus,
  CreateOperationPayload,
  UpdateOperationPayload,
  OperationWithDocuments,
  OperationsSummary,
} from '../types/operations';

type OperationEventKind =
  | 'operation.created'
  | 'operation.renamed'
  | 'operation.archived'
  | 'operation.closed'
  | 'operation.document_added'
  | 'operation.document_removed';

const resolveActorId = async (userId?: string): Promise<string | null> => {
  if (userId) return userId;
  const supabase = getSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

const appendOperationsEvent = async (payload: {
  operation_id: string;
  kind: OperationEventKind;
  actor_id: string;
  document_entity_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('operations_events')
    .insert({
      operation_id: payload.operation_id,
      document_entity_id: payload.document_entity_id ?? null,
      kind: payload.kind,
      at: new Date().toISOString(),
      actor: { id: payload.actor_id, type: 'user' },
      reason: payload.reason ?? null,
      metadata: payload.metadata ?? {},
    });

  if (error) {
    throw error;
  }
};

/**
 * Obtener todas las operaciones del usuario
 */
export async function getOperations(
  userId: string,
  status?: OperationStatus
): Promise<Operation[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('operations')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching operations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Obtener operación con sus documentos
 */
export async function getOperationWithDocuments(
  operationId: string
): Promise<OperationWithDocuments | null> {
  const supabase = getSupabase();

  const { data: operation, error: opError } = await supabase
    .from('operations')
    .select('*')
    .eq('id', operationId)
    .single();

  if (opError || !operation) {
    console.error('Error fetching operation:', opError);
    return null;
  }

  const { data: docs, error: docsError } = await supabase
    .from('operation_documents')
    .select(`
      id,
      document_entity_id,
      added_at,
      draft_file_ref,
      draft_metadata,
      document_entities (
        id,
        source_name,
        source_hash,
        created_at,
        signed_hash,
        signed_authority,
        witness_current_hash,
        witness_current_storage_path
      )
    `)
    .eq('operation_id', operationId)
    .order('added_at', { ascending: false });

  if (docsError) {
    console.error('Error fetching operation documents:', docsError);
  }

  const documents = (docs || [])
    .filter((doc: any) => doc?.document_entities?.id)
    .map((doc: any) => ({
      id: doc.document_entities.id,
      source_name: doc.document_entities.source_name,
      source_hash: doc.document_entities.source_hash,
      created_at: doc.document_entities.created_at,
      signed_hash: doc.document_entities.signed_hash,
      signed_authority: doc.document_entities.signed_authority,
      witness_current_hash: doc.document_entities.witness_current_hash,
      witness_current_storage_path: doc.document_entities.witness_current_storage_path,
      added_at: doc.added_at,
    }));

  return {
    ...operation,
    documents,
  };
}

/**
 * Crear nueva operación (puede ser vacía)
 */
export async function createOperation(
  userId: string,
  payload: CreateOperationPayload
): Promise<Operation> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('operations')
    .insert({
      owner_id: userId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      status: payload.status || 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating operation:', error);
    throw error;
  }

  try {
    await appendOperationsEvent({
      operation_id: data.id,
      kind: 'operation.created',
      actor_id: userId,
      metadata: {
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        status: payload.status || 'active',
      },
    });
  } catch (evtErr) {
    console.error('Failed to append operation.created event:', evtErr);
  }

  return data;
}

/**
 * Actualizar operación
 */
export async function updateOperation(
  operationId: string,
  payload: UpdateOperationPayload,
  userId?: string
): Promise<Operation> {
  const supabase = getSupabase();

  const updateData: any = {};

  if (payload.name !== undefined) {
    updateData.name = payload.name.trim();
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description?.trim() || null;
  }

  if (payload.status !== undefined) {
    updateData.status = payload.status;
  }

  const { data, error } = await supabase
    .from('operations')
    .update(updateData)
    .eq('id', operationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating operation:', error);
    throw error;
  }

  const actorId = await resolveActorId(userId);
  if (actorId) {
    const eventTasks: Promise<void>[] = [];
    if (payload.name !== undefined) {
      eventTasks.push(
        appendOperationsEvent({
          operation_id: operationId,
          kind: 'operation.renamed',
          actor_id: actorId,
          metadata: { name: updateData.name },
        })
      );
    }

    if (payload.status === 'archived') {
      eventTasks.push(
        appendOperationsEvent({
          operation_id: operationId,
          kind: 'operation.archived',
          actor_id: actorId,
          metadata: { status: payload.status },
        })
      );
    }

    if (payload.status === 'closed') {
      eventTasks.push(
        appendOperationsEvent({
          operation_id: operationId,
          kind: 'operation.closed',
          actor_id: actorId,
          metadata: { status: payload.status },
        })
      );
    }

    if (eventTasks.length > 0) {
      try {
        await Promise.all(eventTasks);
      } catch (evtErr) {
        console.error('Failed to append operation events:', evtErr);
      }
    }
  } else if (payload.name !== undefined || payload.status !== undefined) {
    console.warn('Skipping operation event append: missing actor id.');
  }

  return data;
}

/**
 * Agregar documento a operación
 */
export async function addDocumentToOperation(
  operationId: string,
  documentEntityId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();

  // Domain validation: ensure the provided ID exists in document_entities
  const { data: validationData, error: validationError } = await supabase
    .from('document_entities')
    .select('id')
    .eq('id', documentEntityId)
    .maybeSingle();

  if (validationError) {
    console.error('Error validating document_entity_id:', validationError);
    throw validationError;
  }

  if (!validationData) {
    throw new Error(`Invalid document_entity_id: ${documentEntityId}`);
  }

  const { error } = await supabase
    .from('operation_documents')
    .insert({
      operation_id: operationId,
      document_entity_id: documentEntityId,
      added_by: userId,
    });

  if (error) {
    throw { code: error.code, message: error.message };
  }

  // Emit canonical operation event (append-only) — best-effort: failures here should not break main flow
  try {
    await appendOperationsEvent({
      operation_id: operationId,
      kind: 'operation.document_added',
      actor_id: userId,
      document_entity_id: documentEntityId,
      metadata: {},
    });
  } catch (evtErr) {
    // Log but do not rethrow to avoid breaking the successful insert
    console.error('Failed to append operation event:', evtErr);
  }
}

/**
 * Remover documento de operación (NO borra el documento)
 */
export async function removeDocumentFromOperation(
  operationId: string,
  documentEntityId: string,
  userId?: string
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('operation_documents')
    .delete()
    .eq('operation_id', operationId)
    .eq('document_entity_id', documentEntityId);

  if (error) {
    console.error('Error removing document from operation:', error);
    throw error;
  }

  const actorId = await resolveActorId(userId);
  if (!actorId) {
    console.warn('Skipping operation.document_removed event: missing actor id.');
    return;
  }

  try {
    await appendOperationsEvent({
      operation_id: operationId,
      kind: 'operation.document_removed',
      actor_id: actorId,
      document_entity_id: documentEntityId,
      metadata: {},
    });
  } catch (evtErr) {
    console.error('Failed to append operation.document_removed event:', evtErr);
  }
}

/**
 * Obtener resumen de operaciones
 */
export async function getOperationsSummary(
  userId: string
): Promise<OperationsSummary> {
  const supabase = getSupabase();

  const { data: operations, error } = await supabase
    .from('operations')
    .select('status')
    .eq('owner_id', userId);

  if (error) {
    console.error('Error fetching operations summary:', error);
    throw error;
  }

  const summary: OperationsSummary = {
    draft_count: 0,
    active_count: 0,
    closed_count: 0,
    archived_count: 0,
    total_documents: 0,
  };

  (operations || []).forEach((op) => {
    if (op.status === 'draft') summary.draft_count++;
    else if (op.status === 'active') summary.active_count++;
    else if (op.status === 'closed') summary.closed_count++;
    else if (op.status === 'archived') summary.archived_count++;
  });

  return summary;
}

/**
 * Contar documentos en una operación
 */
export async function countDocumentsInOperation(
  operationId: string
): Promise<number> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from('operation_documents')
    .select('*', { count: 'exact', head: true })
    .eq('operation_id', operationId);

  if (error) {
    console.error('Error counting documents:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Obtener operaciones de un documento
 */
export async function getDocumentOperations(
  documentEntityId: string
): Promise<Operation[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('operation_documents')
    .select(`
      operation_id,
      operations (*)
    `)
    .eq('document_entity_id', documentEntityId);

  if (error) {
    console.error('Error fetching document operations:', error);
    return [];
  }

  return (data || []).map((item: any) => item.operations).filter(Boolean);
}

/**
 * Proteger y enviar operación (transición de draft a active)
 * Basado en: docs/contratos/DRAFT_OPERATION_RULES.md § 8
 *
 * NOTA: Esta es la implementación P0 (transición de estado solamente).
 * P1 incluirá: PDF Witness generation, batch TSA, batch anchoring.
 */
export async function protectAndSendOperation(
  operationId: string
): Promise<Operation> {
  const supabase = getSupabase();

  // Validación: debe estar en draft
  const { data: operation, error: fetchError } = await supabase
    .from('operations')
    .select('status')
    .eq('id', operationId)
    .single();

  if (fetchError || !operation) {
    throw new Error('Operación no encontrada');
  }

  if (operation.status !== 'draft') {
    throw new Error('Solo se pueden proteger operaciones en borrador');
  }

  // Transición: draft → active
  const { data, error } = await supabase
    .from('operations')
    .update({ status: 'active' })
    .eq('id', operationId)
    .select()
    .single();

  if (error) {
    console.error('Error protecting operation:', error);
    throw error;
  }

  return data;
}
