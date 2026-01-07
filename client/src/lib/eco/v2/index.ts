// Canonical ECO v2 utilities (projection + verification)
import { jcsCanonicalize } from './jcs';

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

export type EcoV2 = {
  version: 'eco.v2';
  document_entity_id: string;
  source: {
    hash: string;
    mime: string;
    name?: string;
    size_bytes: number;
    captured_at: string;
  };
  witness?: {
    hash: string;
    mime: 'application/pdf';
    generated_at?: string;
    status: 'generated' | 'signed';
  };
  signed?: {
    hash: string;
    signed_at?: string;
    authority?: 'internal' | 'external';
    authority_ref?: {
      id?: string;
      type?: string;
      jurisdiction?: string;
    };
  };
  hash_chain: HashChain;
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
    rfc3161?: {
      tsa?: string;
      serial?: string;
      timestamp?: string;
      status: 'valid' | 'invalid';
    };
  };
};

export type DocumentEntityRow = {
  id: string;
  owner_id?: string;
  source_name: string;
  source_mime: string;
  source_size: number;
  source_hash: string;
  source_captured_at: string;
  source_storage_path?: string | null;
  custody_mode?: 'hash_only' | 'encrypted_custody';
  lifecycle_status?: string | null;
  witness_current_hash?: string | null;
  witness_current_mime?: 'application/pdf' | null;
  witness_current_status?: 'generated' | 'signed' | null;
  witness_current_storage_path?: string | null;
  witness_current_generated_at?: string | null;
  witness_hash?: string | null;
  signed_hash?: string | null;
  signed_authority?: 'internal' | 'external' | null;
  signed_authority_ref?: Record<string, unknown> | null;
  composite_hash?: string | null;
  hash_chain?: unknown;
  transform_log?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  signed_at?: string | null;
};

export const canonicalStringify = (value: unknown): string => jcsCanonicalize(value);

const parseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
};

const parseJsonArray = (value: unknown): unknown[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
};

const buildHashChainFallback = (row: DocumentEntityRow): HashChain => {
  return {
    source_hash: row.source_hash,
    witness_hash: row.witness_hash ?? row.witness_current_hash ?? undefined,
    signed_hash: row.signed_hash ?? undefined,
    composite_hash: row.composite_hash ?? undefined,
  };
};

export const projectEcoV2FromDocumentEntity = (row: DocumentEntityRow): EcoV2 => {
  const hashChainPrimary = parseJsonObject(row.hash_chain) as HashChain | null;
  const hashChainFallback = buildHashChainFallback(row);
  // TODO(contract): if hash_chain exists and differs from fallback, verifier must flag.
  const hashChain = hashChainPrimary ?? hashChainFallback;

  const eco: EcoV2 = {
    version: 'eco.v2',
    document_entity_id: row.id,
    source: {
      hash: row.source_hash,
      mime: row.source_mime,
      name: row.source_name,
      size_bytes: row.source_size,
      captured_at: row.source_captured_at,
    },
    hash_chain: hashChain,
    transform_log: parseJsonArray(row.transform_log) as TransformLogEntry[],
    timestamps: {
      created_at: row.created_at ?? row.source_captured_at,
    },
    anchors: {}, // Snapshot only; anchors never replace hash verification.
  };

  if (row.witness_current_hash) {
    eco.witness = {
      hash: row.witness_current_hash,
      mime: (row.witness_current_mime ?? 'application/pdf') as 'application/pdf',
      generated_at: row.witness_current_generated_at ?? undefined,
      status: (row.witness_current_status ?? 'generated') as 'generated' | 'signed',
    };
  }

  if (row.signed_hash) {
    eco.signed = {
      hash: row.signed_hash,
      signed_at: row.signed_at ?? undefined,
      authority: row.signed_authority ?? undefined,
      authority_ref: row.signed_authority_ref ?? undefined,
    };
  }

  return eco;
};

export const serializeEcoV2 = (eco: EcoV2): string => canonicalStringify(eco);

export const generateEcoV2 = (row: DocumentEntityRow): { eco: EcoV2; json: string } => {
  const eco = projectEcoV2FromDocumentEntity(row);
  return { eco, json: serializeEcoV2(eco) };
};

export type VerificationStatus = 'valid' | 'tampered' | 'incomplete' | 'unknown';

export type VerificationResult = {
  status: VerificationStatus;
  source_hash?: string;
  witness_hash?: string;
  signed_hash?: string;
  timestamps?: EcoV2['timestamps'];
  anchors?: EcoV2['anchors'];
};

const transformLogIsConsistent = (
  log: TransformLogEntry[],
  chain: HashChain
): boolean => {
  if (!Array.isArray(log)) return false;
  if (log.length === 0) return true;

  for (let i = 0; i < log.length - 1; i += 1) {
    if (log[i].to_hash !== log[i + 1].from_hash) {
      return false;
    }
  }

  const last = log[log.length - 1];
  const expectedLast =
    chain.signed_hash ?? chain.witness_hash ?? chain.source_hash;

  return last.to_hash === expectedLast;
};

const isIncomplete = (eco: EcoV2): boolean => {
  if (!eco.witness || !eco.hash_chain.witness_hash) return true;
  if (!eco.signed || !eco.hash_chain.signed_hash) return true;
  return false;
};

export const verifyEcoV2 = (eco: unknown): VerificationResult => {
  if (!eco || typeof eco !== 'object') {
    return { status: 'unknown' };
  }

  const candidate = eco as EcoV2;

  if (candidate.version !== 'eco.v2') {
    return { status: 'unknown' };
  }

  if (!candidate.hash_chain || !candidate.source?.hash) {
    return { status: 'unknown' };
  }

  if (candidate.source.hash !== candidate.hash_chain.source_hash) {
    return { status: 'tampered' };
  }

  if (candidate.witness) {
    if (!candidate.hash_chain.witness_hash) return { status: 'tampered' };
    if (candidate.witness.hash !== candidate.hash_chain.witness_hash) {
      return { status: 'tampered' };
    }
  }

  if (candidate.signed) {
    if (!candidate.hash_chain.signed_hash) return { status: 'tampered' };
    if (candidate.signed.hash !== candidate.hash_chain.signed_hash) {
      return { status: 'tampered' };
    }
  }

  if (!transformLogIsConsistent(candidate.transform_log ?? [], candidate.hash_chain)) {
    return { status: 'tampered' };
  }

  if (isIncomplete(candidate)) {
    return {
      status: 'incomplete',
      source_hash: candidate.hash_chain.source_hash,
      witness_hash: candidate.hash_chain.witness_hash,
      signed_hash: candidate.hash_chain.signed_hash,
      timestamps: candidate.timestamps,
      anchors: candidate.anchors,
    };
  }

  return {
    status: 'valid',
    source_hash: candidate.hash_chain.source_hash,
    witness_hash: candidate.hash_chain.witness_hash,
    signed_hash: candidate.hash_chain.signed_hash,
    timestamps: candidate.timestamps,
    anchors: candidate.anchors,
  };
};
