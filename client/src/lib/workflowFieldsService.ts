/**
 * Workflow Fields Service (Client-Side)
 *
 * Servicio para persistir campos de workflow multi-firmante
 * Sprint 6: Workflow Fields Persistence
 *
 * Uso:
 * 1. Owner configura campos en LegalCenterModalV2
 * 2. Llama saveWorkflowFields() antes de enviar workflow
 * 3. Campos se persisten en DB con RLS
 * 4. Recovery: loadWorkflowFields() al reabrir documento
 *
 * Security:
 * - RLS enforced: Solo owner puede CRUD sus campos
 * - Signer asignado puede leer y actualizar solo value
 */

import { getSupabase } from './supabaseClient';
import type { SignatureField } from '../types/signature-fields';

/**
 * Workflow Field (DB format)
 */
export interface WorkflowField {
  id?: string;
  document_entity_id: string;
  field_type: 'signature' | 'text' | 'date';
  label?: string;
  placeholder?: string;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  assigned_to?: string;
  required: boolean;
  value?: string;
  metadata?: Record<string, unknown>;
  batch_id?: string;
  apply_to_all_pages?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Convierte SignatureField del frontend a WorkflowField para API
 *
 * @param field - Campo del frontend
 * @param documentEntityId - ID del documento
 * @param previewWidth - Ancho del preview (para normalizar coordenadas)
 * @param previewHeight - Alto del preview (para normalizar coordenadas)
 * @returns WorkflowField listo para persistir
 */
export function signatureFieldToWorkflowField(
  field: SignatureField,
  documentEntityId: string,
  previewWidth: number,
  previewHeight: number
): WorkflowField {
  return {
    document_entity_id: documentEntityId,
    field_type: field.type,
    label: field.metadata?.label,
    placeholder: field.metadata?.placeholder,
    position: {
      page: field.page,
      x: field.x / previewWidth,
      y: field.y / previewHeight,
      width: field.width / previewWidth,
      height: field.height / previewHeight
    },
    assigned_to: field.assignedTo || undefined,
    required: field.required,
    value: field.value,
    metadata: {
      ...field.metadata,
      frontend_id: field.id // Guardar ID del frontend para mapping
    },
    batch_id: field.batchId,
    apply_to_all_pages: field.applyToAllPages || false
  };
}

/**
 * Convierte WorkflowField de DB a SignatureField del frontend
 *
 * @param dbField - Campo desde DB
 * @param previewWidth - Ancho del preview
 * @param previewHeight - Alto del preview
 * @returns SignatureField para state del frontend
 */
export function workflowFieldToSignatureField(
  dbField: WorkflowField,
  previewWidth: number,
  previewHeight: number
): SignatureField {
  return {
    id: dbField.metadata?.frontend_id as string || crypto.randomUUID(),
    type: dbField.field_type,
    page: dbField.position.page,
    x: dbField.position.x * previewWidth,
    y: dbField.position.y * previewHeight,
    width: dbField.position.width * previewWidth,
    height: dbField.position.height * previewHeight,
    assignedTo: dbField.assigned_to,
    required: dbField.required,
    value: dbField.value,
    batchId: dbField.batch_id,
    applyToAllPages: dbField.apply_to_all_pages,
    metadata: {
      label: dbField.label,
      placeholder: dbField.placeholder,
      ...dbField.metadata,
      db_id: dbField.id // Guardar ID de DB para updates
    }
  };
}

/**
 * Guarda campos de workflow en DB
 *
 * @param fields - Array de SignatureField del frontend
 * @param documentEntityId - ID del documento
 * @param previewWidth - Ancho del preview (default: 1000 virtual canvas)
 * @param previewHeight - Alto del preview (default: 1414 virtual canvas)
 * @returns Array de campos guardados con IDs de DB
 */
export async function saveWorkflowFields(
  fields: SignatureField[],
  documentEntityId: string,
  previewWidth: number = 1000,
  previewHeight: number = 1414
): Promise<WorkflowField[]> {
  const supabase = getSupabase();

  if (fields.length === 0) {
    return [];
  }

  // Convertir a formato DB y preservar batch_id.
  // Contract (P1): a signer can only sign if their batches are assigned.
  // We therefore persist fields grouped by batchId.
  const byBatch = new Map<string, SignatureField[]>();
  fields.forEach((f) => {
    const bid = f.batchId || f.id;
    if (!byBatch.has(bid)) byBatch.set(bid, []);
    byBatch.get(bid)!.push(f);
  });

  const saved: WorkflowField[] = [];

  for (const [batchId, batchFields] of byBatch.entries()) {
    const workflowFields = batchFields.map((field) => {
      const wf = signatureFieldToWorkflowField(field, documentEntityId, previewWidth, previewHeight);
      // Ensure we persist the caller batch id.
      wf.batch_id = batchId;
      return wf;
    });

    const { data, error } = await supabase.functions.invoke('workflow-fields/batch', {
      body: { fields: workflowFields }
    });

    if (error) {
      console.error('Error saving workflow fields (batch):', error);
      throw new Error(`Failed to save workflow fields: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error('Failed to save workflow fields');
    }

    saved.push(...(data.fields || []));
  }

  return saved;
}

/**
 * Carga campos de workflow desde DB
 *
 * @param documentEntityId - ID del documento
 * @param previewWidth - Ancho del preview (default: 1000)
 * @param previewHeight - Alto del preview (default: 1414)
 * @returns Array de SignatureField para state del frontend
 */
export async function loadWorkflowFields(
  documentEntityId: string,
  previewWidth: number = 1000,
  previewHeight: number = 1414
): Promise<SignatureField[]> {
  const supabase = getSupabase();

  // Llamar a Edge Function (GET)
  const { data, error } = await supabase.functions.invoke('workflow-fields', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: undefined // GET no lleva body, params en URL
  });

  // Workaround: Edge Function GET requiere query params en URL
  // Usar direct REST API call
  const { data: fieldsData, error: queryError } = await supabase
    .from('workflow_fields')
    .select('*')
    .eq('document_entity_id', documentEntityId)
    .order('created_at', { ascending: true });

  if (queryError) {
    console.error('Error loading workflow fields:', queryError);
    throw new Error(`Failed to load workflow fields: ${queryError.message}`);
  }

  if (!fieldsData) {
    return [];
  }

  // Convertir a formato frontend
  return fieldsData.map(field =>
    workflowFieldToSignatureField(field, previewWidth, previewHeight)
  );
}

/**
 * Actualiza un campo de workflow
 *
 * @param fieldId - ID del campo en DB
 * @param updates - Campos a actualizar
 * @returns Campo actualizado
 */
export async function updateWorkflowField(
  fieldId: string,
  updates: Partial<WorkflowField>
): Promise<WorkflowField> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke(`workflow-fields/${fieldId}`, {
    method: 'PUT',
    body: updates
  });

  if (error) {
    console.error('Error updating workflow field:', error);
    throw new Error(`Failed to update workflow field: ${error.message}`);
  }

  if (!data || !data.success) {
    throw new Error('Failed to update workflow field');
  }

  return data.field;
}

/**
 * Elimina un campo de workflow
 *
 * @param fieldId - ID del campo en DB
 */
export async function deleteWorkflowField(fieldId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.functions.invoke(`workflow-fields/${fieldId}`, {
    method: 'DELETE'
  });

  if (error) {
    console.error('Error deleting workflow field:', error);
    throw new Error(`Failed to delete workflow field: ${error.message}`);
  }
}

/**
 * Elimina todos los campos de un documento
 *
 * @param documentEntityId - ID del documento
 */
export async function deleteAllWorkflowFields(documentEntityId: string): Promise<void> {
  const supabase = getSupabase();

  // Direct DB call (más eficiente que llamar Edge Function por cada campo)
  const { error } = await supabase
    .from('workflow_fields')
    .delete()
    .eq('document_entity_id', documentEntityId);

  if (error) {
    console.error('Error deleting workflow fields:', error);
    throw new Error(`Failed to delete workflow fields: ${error.message}`);
  }
}

/**
 * Cuenta campos de un documento
 *
 * @param documentEntityId - ID del documento
 * @returns Número de campos
 */
export async function countWorkflowFields(documentEntityId: string): Promise<number> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from('workflow_fields')
    .select('*', { count: 'exact', head: true })
    .eq('document_entity_id', documentEntityId);

  if (error) {
    console.error('Error counting workflow fields:', error);
    return 0;
  }

  return count || 0;
}
