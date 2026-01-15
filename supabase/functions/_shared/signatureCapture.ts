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
