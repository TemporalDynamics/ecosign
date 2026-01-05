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

const getDocumentEntity = async (id: string) => {
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

export const ensureSigned = async (
  documentId: string,
  signedHash: string
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
