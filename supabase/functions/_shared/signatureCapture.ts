/**
 * P2.2 — Signature Capture and Application Helper
 * 
 * Implements "sign once, apply to all fields in batch" pattern.
 * 
 * Canonical rules:
 * - One signature_instance per (signer, batch)
 * - Multiple signature_application_events per signature_instance
 * - No new PDF generated, no hash changed
 * - Viewer derives visual from events + witness
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { SignatureInstance, SignatureApplicationEvent } from './types.ts';

/**
 * Capture a signature for a signer and batch.
 * Returns the signature_instance created.
 */
export async function captureSignature(
  supabaseClient: SupabaseClient,
  params: {
    workflowId: string;
    documentEntityId: string;
    batchId: string;
    signerId: string;
    signaturePayload: SignatureInstance['signature_payload'];
  }
): Promise<SignatureInstance> {
  const { data, error } = await supabaseClient
    .from('signature_instances')
    .insert({
      workflow_id: params.workflowId,
      document_entity_id: params.documentEntityId,
      batch_id: params.batchId,
      signer_id: params.signerId,
      signature_payload: params.signaturePayload,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to capture signature: ${error.message}`);
  }

  return data as SignatureInstance;
}

/**
 * Apply a captured signature to all fields in the batch.
 * Creates signature_application_events for each field.
 */
export async function applySignatureToFields(
  supabaseClient: SupabaseClient,
  params: {
    workflowId: string;
    signatureInstanceId: string;
    fieldIds: string[];
  }
): Promise<SignatureApplicationEvent[]> {
  const applicationEvents = params.fieldIds.map((fieldId) => ({
    workflow_id: params.workflowId,
    signature_instance_id: params.signatureInstanceId,
    field_id: fieldId,
  }));

  const { data, error } = await supabaseClient
    .from('signature_application_events')
    .insert(applicationEvents)
    .select();

  if (error) {
    throw new Error(`Failed to apply signature to fields: ${error.message}`);
  }

  return data as SignatureApplicationEvent[];
}

/**
 * Get all signature instances for a workflow.
 */
export async function getSignatureInstances(
  supabaseClient: SupabaseClient,
  workflowId: string
): Promise<SignatureInstance[]> {
  const { data, error } = await supabaseClient
    .from('signature_instances')
    .select('*')
    .eq('workflow_id', workflowId);

  if (error) {
    throw new Error(`Failed to get signature instances: ${error.message}`);
  }

  return data as SignatureInstance[];
}

/**
 * Get all application events for a signature instance.
 */
export async function getApplicationEvents(
  supabaseClient: SupabaseClient,
  signatureInstanceId: string
): Promise<SignatureApplicationEvent[]> {
  const { data, error } = await supabaseClient
    .from('signature_application_events')
    .select('*')
    .eq('signature_instance_id', signatureInstanceId);

  if (error) {
    throw new Error(`Failed to get application events: ${error.message}`);
  }

  return data as SignatureApplicationEvent[];
}

/**
 * Check if a signer has already signed a batch.
 */
export async function hasSignedBatch(
  supabaseClient: SupabaseClient,
  batchId: string,
  signerId: string
): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('signature_instances')
    .select('id')
    .eq('batch_id', batchId)
    .eq('signer_id', signerId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    throw new Error(`Failed to check batch signature: ${error.message}`);
  }

  return !!data;
}

/**
 * Capture and apply signature to all fields in a batch.
 *
 * This is the main entry point for the "sign once, apply to all" pattern.
 *
 * Flow:
 * 1. Check idempotency (skip if already signed)
 * 2. Create signature_instance
 * 3. Fetch all fields for the batch
 * 4. Create signature_application_events for each field
 *
 * @returns The signature_instance (existing or newly created)
 */
export async function captureAndApplySignature(
  supabaseClient: SupabaseClient,
  params: {
    workflow_id: string;
    document_entity_id: string;
    batch_id: string;
    signer_id: string;
    signature_payload: SignatureInstance['signature_payload'];
  }
): Promise<SignatureInstance> {
  // 1. Idempotency check: if already signed, return existing instance
  const { data: existing } = await supabaseClient
    .from('signature_instances')
    .select('*')
    .eq('batch_id', params.batch_id)
    .eq('signer_id', params.signer_id)
    .single();

  if (existing) {
    console.log('captureAndApplySignature: Batch already signed, returning existing instance', {
      batchId: params.batch_id,
      signerId: params.signer_id,
      instanceId: existing.id
    });
    return existing as SignatureInstance;
  }

  // 2. Capture signature (create signature_instance)
  const instance = await captureSignature(supabaseClient, {
    workflowId: params.workflow_id,
    documentEntityId: params.document_entity_id,
    batchId: params.batch_id,
    signerId: params.signer_id,
    signaturePayload: params.signature_payload,
  });

  // 3. Get all fields for this batch
  const { data: fields, error: fieldsError } = await supabaseClient
    .from('workflow_fields')
    .select('id')
    .eq('batch_id', params.batch_id);

  if (fieldsError) {
    console.error('captureAndApplySignature: Failed to fetch fields', fieldsError);
    throw new Error(`Failed to fetch fields for batch: ${fieldsError.message}`);
  }

  // 4. Apply signature to all fields (if any exist)
  if (fields && fields.length > 0) {
    const fieldIds = fields.map((f: { id: string }) => f.id);

    await applySignatureToFields(supabaseClient, {
      workflowId: params.workflow_id,
      signatureInstanceId: instance.id,
      fieldIds,
    });

    console.log('captureAndApplySignature: Applied signature to fields', {
      instanceId: instance.id,
      fieldCount: fieldIds.length
    });
  } else {
    console.log('captureAndApplySignature: No fields in batch, signature captured only', {
      instanceId: instance.id,
      batchId: params.batch_id
    });
  }

  return instance;
}
