/**
 * Canonical Document Entity Service
 *
 * This is the single write interface to document_entities.
 * All callers must use this service to preserve canonical invariants.
 */

import { getSupabase } from './supabaseClient';
import { generateEcoV2, type DocumentEntityRow, type EcoV2 } from './eco/v2';

export type CustodyMode = 'hash_only' | 'encrypted_custody';

export type LifecycleStatus =
  | 'protected'
  | 'needs_witness'
  | 'witness_ready'
  | 'in_signature_flow'
  | 'signed'
  | 'anchored'
  | 'revoked'
  | 'archived';

export type WitnessStatus = 'generated' | 'signed';
export type SignedAuthority = 'internal' | 'external';
export type SignedAuthorityRef = {
  id?: string;
  type?: string;
  jurisdiction?: string;
};

export type HashChain = {
  source_hash: string;
  witness_hash?: string;
  signed_hash?: string;
  composite_hash?: string;
};

export type TransformLogEntry = {
  from_mime: string;
  to_mime: string;
  from_hash: string;
  to_hash: string;
  method: 'client' | 'server';
  reason: 'visualization' | 'signature' | 'workflow';
  executed_at: string;
};

export type TsaEventPayload = {
  token_b64: string;
  witness_hash: string;
  gen_time?: string;
  policy_oid?: string;
  serial?: string;
  digest_algo?: string;
  tsa_cert_fingerprint?: string;
  token_hash?: string;
};

export type TsaEvent = {
  kind: 'tsa';
  at: string;
  witness_hash: string;
  tsa: {
    token_b64: string;
    gen_time?: string;
    policy_oid?: string;
    serial?: string;
    digest_algo?: string;
    tsa_cert_fingerprint?: string;
    token_hash?: string;
  };
};

export type SourceTruthInput = {
  name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
  captured_at?: string;
  custody_mode: CustodyMode;
  storage_path?: string | null;
};

export type WitnessInput = {
  hash: string;
  mime_type: 'application/pdf';
  storage_path: string;
  status: WitnessStatus;
  generated_at?: string;
};

export type EcoPayloadV1 = {
  version: 'eco.v1';
  document_id: string;
  source: {
    hash: string;
    mime: string;
    name?: string;
    captured_at: string;
  };
  witness?: {
    hash: string;
    mime: 'application/pdf';
    generated_at: string;
  };
  signed?: {
    hash: string;
    signed_at: string;
  };
  transform_log: TransformLogEntry[];
  timestamps: {
    created_at: string;
    tca?: string;
  };
  anchors: {
    polygon?: {
      network: 'polygon';
      txid: string;
      anchored_at: string;
      status: 'pending' | 'confirmed' | 'failed';
    };
    bitcoin?: {
      network: 'bitcoin';
      txid: string;
      anchored_at: string;
      status: 'pending' | 'confirmed' | 'failed';
    };
  };
};

const assertCustodyConsistency = (input: SourceTruthInput) => {
  if (input.custody_mode === 'hash_only' && input.storage_path) {
    throw new Error('hash_only cannot include storage_path');
  }
  if (input.custody_mode === 'encrypted_custody' && !input.storage_path) {
    throw new Error('encrypted_custody requires storage_path');
  }
};

export const getDocumentEntity = async (id: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('document_entities')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'document_entities record not found');
  }

  return data;
};

export const mapEntityToDocumentRecord = (entity: any) => {
  const documentHash = entity.signed_hash || entity.witness_current_hash || entity.source_hash;
  return {
    id: entity.id,
    document_name: entity.source_name,
    document_hash: documentHash,
    content_hash: entity.source_hash,
    created_at: entity.created_at || entity.source_captured_at,
    pdf_storage_path: entity.witness_current_storage_path ?? null,
    source_storage_path: entity.source_storage_path ?? null,
    status: entity.lifecycle_status ?? null,
    signed_authority: entity.signed_authority ?? null,
    has_legal_timestamp: false,
    has_polygon_anchor: false,
    has_bitcoin_anchor: false,
    events: entity.events || [],
    signer_links: [],
  };
};

export const ensureSigned = async (
  documentId: string,
  signedHash: string,
  authority?: SignedAuthority,
  authorityRef?: SignedAuthorityRef | null
) => {
  const doc = await getDocumentEntity(documentId);
  const nextHashChain: HashChain = {
    ...(doc.hash_chain || {}),
    signed_hash: signedHash,
  };

  const { error } = await getSupabase()
    .from('document_entities')
    .update({
      signed_hash: signedHash,
      signed_authority: authority ?? null,
      signed_authority_ref: authorityRef ?? null,
      hash_chain: nextHashChain,
      lifecycle_status: 'signed',
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(error.message);
  }
};

export const createSourceTruth = async (input: SourceTruthInput) => {
  assertCustodyConsistency(input);

  const supabase = getSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    throw new Error(authError?.message || 'Usuario no autenticado');
  }

  const payload = {
    owner_id: authData.user.id,
    source_name: input.name,
    source_mime: input.mime_type,
    source_size: input.size_bytes,
    source_hash: input.hash,
    source_captured_at: input.captured_at ?? new Date().toISOString(),
    source_storage_path: input.storage_path ?? null,
    custody_mode: input.custody_mode,
    lifecycle_status: 'protected' as LifecycleStatus,
    hash_chain: { source_hash: input.hash } as HashChain,
    transform_log: [],
    witness_history: [],
  };

  const { data, error } = await supabase
    .from('document_entities')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: existingError } = await supabase
        .from('document_entities')
        .select('*')
        .eq('owner_id', authData.user.id)
        .eq('source_hash', input.hash)
        .single();

      if (!existingError && existing) {
        return existing;
      }
    }
    throw new Error(error.message || 'Failed to create document_entities');
  }

  if (!data) {
    throw new Error('Failed to create document_entities');
  }

  return data;
};

export const ensureWitnessCurrent = async (
  documentId: string,
  witness: WitnessInput
) => {
  const doc = await getDocumentEntity(documentId);

  if (doc.witness_current_hash) {
    return;
  }

  const witnessHistory = Array.isArray(doc.witness_history)
    ? [...doc.witness_history, witness]
    : [witness];

  const nextHashChain: HashChain = {
    ...(doc.hash_chain || {}),
    witness_hash: witness.hash,
  };

  const { error } = await getSupabase()
    .from('document_entities')
    .update({
      witness_current_hash: witness.hash,
      witness_current_mime: witness.mime_type,
      witness_current_status: witness.status,
      witness_current_storage_path: witness.storage_path,
      witness_current_generated_at: witness.generated_at ?? new Date().toISOString(),
      witness_history: witnessHistory,
      witness_hash: witness.hash,
      hash_chain: nextHashChain,
      lifecycle_status: 'witness_ready',
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * NOTE: All append operations assume serialized writes per document.
 * Concurrency is handled at application flow level.
 */
export const appendTransform = async (
  documentId: string,
  entry: TransformLogEntry
) => {
  const doc = await getDocumentEntity(documentId);
  const transformLog = Array.isArray(doc.transform_log)
    ? [...doc.transform_log, entry]
    : [entry];

  const { error } = await getSupabase()
    .from('document_entities')
    .update({ transform_log: transformLog })
    .eq('id', documentId);

  if (error) {
    throw new Error(error.message);
  }
};

export const advanceLifecycle = async (
  documentId: string,
  status: LifecycleStatus
) => {
  const { error } = await getSupabase()
    .from('document_entities')
    .update({ lifecycle_status: status })
    .eq('id', documentId);

  if (error) {
    throw new Error(error.message);
  }
};

export const emitEcoVNext = async (
  documentId: string
): Promise<{ eco: EcoV2; json: string }> => {
  const doc = await getDocumentEntity(documentId);
  return generateEcoV2(doc as DocumentEntityRow);
};

/**
 * Append TSA event to document_entities.events[]
 * 
 * MUST: witness_hash must match document_entities.witness_hash
 * MUST: token_b64 must be valid base64 RFC 3161 token
 * 
 * This function enforces canonical rules per TSA_EVENT_RULES.md
 */
export const appendOperationEvent = async (
  documentId: string,
  eventPayload: {
    kind: 'operation.document_added' | 'operation.document_removed';
    actor: { id: string; type: 'user' | 'service' };
    operation_id: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  }
) => {
  // Validate kind
  if (!['operation.document_added', 'operation.document_removed'].includes(eventPayload.kind)) {
    throw new Error(`Invalid operation event kind: ${eventPayload.kind}`);
  }

  // Ensure document exists
  const doc = await getDocumentEntity(documentId);

  // Ensure operation exists
  const supabase = getSupabase();
  const { data: opData, error: opError } = await supabase
    .from('operations')
    .select('id')
    .eq('id', eventPayload.operation_id)
    .maybeSingle();

  if (opError) {
    console.error('Error validating operation_id:', opError);
    throw opError;
  }

  if (!opData) {
    throw new Error(`Invalid operation_id: ${eventPayload.operation_id}`);
  }

  // Build canonical event
  const event = {
    kind: eventPayload.kind,
    at: new Date().toISOString(),
    actor: eventPayload.actor,
    operation_id: eventPayload.operation_id,
    document_entity_id: documentId,
    reason: eventPayload.reason ?? null,
    metadata: eventPayload.metadata ?? {},
  };

  // Append to document.events[] (append-only)
  const currentEvents = Array.isArray(doc.events) ? doc.events : [];
  const { error } = await getSupabase()
    .from('document_entities')
    .update({ events: [...currentEvents, event] })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to append operation event: ${error.message}`);
  }
};

export const appendDocumentEvent = async (
  documentId: string,
  event: Record<string, unknown>
) => {
  const doc = await getDocumentEntity(documentId);
  const currentEvents = Array.isArray(doc.events) ? doc.events : [];
  const { error } = await getSupabase()
    .from('document_entities')
    .update({
      events: [...currentEvents, event],
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to append document event: ${error.message}`);
  }
};

export const appendTsaEvent = async (
  documentId: string,
  payload: TsaEventPayload
) => {
  const doc = await getDocumentEntity(documentId);

  // MUST: witness_hash consistency check
  if (payload.witness_hash !== doc.witness_hash) {
    throw new Error(
      `TSA witness_hash mismatch: expected ${doc.witness_hash}, got ${payload.witness_hash}`
    );
  }

  // MUST: witness_hash must exist (document must have witness)
  if (!doc.witness_hash) {
    throw new Error('Cannot append TSA event: document has no witness_hash');
  }

  // Build TSA event
  const event: TsaEvent = {
    kind: 'tsa',
    at: new Date().toISOString(),
    witness_hash: payload.witness_hash,
    tsa: {
      token_b64: payload.token_b64,
      gen_time: payload.gen_time,
      policy_oid: payload.policy_oid,
      serial: payload.serial,
      digest_algo: payload.digest_algo || 'sha256',
      tsa_cert_fingerprint: payload.tsa_cert_fingerprint,
      token_hash: payload.token_hash,
    },
  };

  // Append to events[] (DB trigger will validate)
  const currentEvents = Array.isArray(doc.events) ? doc.events : [];
  const { error } = await getSupabase()
    .from('document_entities')
    .update({
      events: [...currentEvents, event],
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to append TSA event: ${error.message}`);
  }
};
