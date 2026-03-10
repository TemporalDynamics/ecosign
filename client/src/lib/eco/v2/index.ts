// Canonical ECO v2 utilities (projection + verification)
import { jcsCanonicalize } from './jcs';
import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';

if (!ed.hashes.sha512) {
  ed.hashes.sha512 = sha512;
}

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

export type TsaEvent = {
  kind: 'tsa.confirmed' | 'tsa.failed';
  at: string;
  witness_hash?: string;
  tsa?: {
    token_b64: string;
    gen_time?: string;
    policy_oid?: string;
    serial?: string;
    digest_algo?: string;
    tsa_cert_fingerprint?: string;
    token_hash?: string;
  };
  payload?: Record<string, unknown>;
};

export type AnchorEvent = {
  kind: 'anchor' | 'anchor.confirmed' | 'anchor.pending' | 'anchor.failed';
  at: string;
  anchor?: {
    network: 'polygon' | 'bitcoin';
    witness_hash?: string;
    txid?: string;
    block_height?: number;
    confirmed_at?: string;
  };
  payload?: Record<string, unknown>;
};

export type RekorEvent = {
  kind: 'rekor.confirmed';
  at: string;
  payload?: Record<string, unknown>;
};

export type EventEntry = TsaEvent | AnchorEvent | RekorEvent;

export type EpiBlock = {
  level: 2;
  content_hash: string;
  content_at: string;
  root_hash: string;
  state_hashes: { hash: string; at: string }[];
  algorithm: string;
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
  events: EventEntry[];
  timestamps: {
    created_at: string;
    tca?: string;
  };
  epi?: EpiBlock;
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
  events?: unknown;
  tsa_latest?: unknown;
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

const toIso = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const deriveDeterministicIssuedAt = (events: EventEntry[], fallback: string): string => {
  const artifactEvent = [...events]
    .reverse()
    .find((event) => (event as { kind?: string })?.kind === 'artifact.finalized') as
    | ({ at?: string } & EventEntry)
    | undefined;
  const artifactAt = toIso(artifactEvent?.at);
  if (artifactAt) return artifactAt;

  const sortedAts = [...events]
    .map((event) => toIso(event?.at))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b));
  const latestAt = sortedAts.length > 0 ? sortedAts[sortedAts.length - 1] : null;

  return latestAt ?? fallback;
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
    events: parseJsonArray(row.events) as EventEntry[],
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

type CanonicalCertificate = Record<string, unknown>;

const findLatestEvent = (events: EventEntry[], kind: string): EventEntry | null => {
  for (let idx = events.length - 1; idx >= 0; idx -= 1) {
    if (events[idx]?.kind === kind) return events[idx];
  }
  return null;
};

const buildProofsFromEvents = (events: EventEntry[], witnessHash?: string) => {
  const proofs: Record<string, unknown>[] = [];

  const tsa = findLatestEvent(events, 'tsa.confirmed') as TsaEvent | null;
  if (tsa) {
    proofs.push({
      kind: 'tsa',
      status: 'confirmed',
      provider: 'https://freetsa.org/tsr',
      ref: witnessHash ?? tsa.witness_hash ?? null,
      attempted_at: tsa.at ?? null,
      token_b64: tsa.tsa?.token_b64 ?? null,
      witness_hash: witnessHash ?? tsa.witness_hash ?? null,
    });
  }

  const rekor = findLatestEvent(events, 'rekor.confirmed');
  if (rekor) {
    proofs.push({
      kind: 'rekor',
      status: 'confirmed',
      provider: 'rekor.sigstore.dev',
      ref: (rekor.payload?.['ref'] as string | undefined) ?? null,
      attempted_at: rekor.at ?? null,
      statement_hash: (rekor.payload?.['statement_hash'] as string | undefined) ?? null,
      public_key_b64: (rekor.payload?.['public_key_b64'] as string | undefined) ?? null,
      log_index: (rekor.payload?.['log_index'] as number | undefined) ?? null,
      witness_hash: (rekor.payload?.['witness_hash'] as string | undefined) ?? witnessHash ?? null,
    });
  }

  const anchors = events.filter((event) => event.kind === 'anchor' || event.kind === 'anchor.confirmed') as AnchorEvent[];
  for (const network of ['polygon', 'bitcoin'] as const) {
    const latest = [...anchors].reverse().find((event) => {
      const anchorData = event.anchor ?? event.payload;
      return anchorData?.['network'] === network;
    });
    if (!latest) continue;
    const anchorData = latest.anchor ?? latest.payload ?? {};
    proofs.push({
      kind: network,
      status: 'confirmed',
      provider: network,
      ref: (anchorData['txid'] as string | undefined) ?? null,
      attempted_at: latest.at ?? null,
      witness_hash: (anchorData['witness_hash'] as string | undefined) ?? witnessHash ?? null,
    });
  }

  return proofs;
};

export const generateCanonicalCertificateFromDocumentEntity = (
  row: DocumentEntityRow
): { eco: CanonicalCertificate; json: string } => {
  const witnessHash = row.witness_current_hash ?? row.witness_hash ?? undefined;
  const signedHash = row.signed_hash ?? undefined;
  const events = parseJsonArray(row.events) as EventEntry[];
  const issuedAt = deriveDeterministicIssuedAt(events, row.created_at ?? row.source_captured_at);
  const proofs = buildProofsFromEvents(events, witnessHash);

  const eco = {
    format: 'eco',
    format_version: '2.0',
    version: 'eco.v2',
    issued_at: issuedAt,
    evidence_declaration: {
      type: 'digital_protection_evidence',
      document_name: row.source_name ?? null,
      signer_email: null,
      signer_name: null,
      signing_step: null,
      total_steps: null,
      signed_at: new Date().toISOString(),
      identity_assurance_level: null,
      summary: [
        'Document integrity preserved',
        'Protection recorded',
        'Evidence is self-contained',
        'Independent verification possible',
      ],
    },
    trust_summary: {
      checks: [
        'Document integrity preserved',
        'Protection recorded',
        'Timestamped (TSA) when available',
        'Evidence is self-contained',
      ],
    },
    document: {
      id: row.id,
      name: row.source_name ?? null,
      mime: row.source_mime ?? 'application/pdf',
      source_hash: row.source_hash,
      witness_hash: witnessHash ?? null,
    },
    signing_act: {
      signer_id: null,
      signer_email: null,
      signer_display_name: null,
      step_index: null,
      step_total: null,
      signed_at: null,
    },
    signer: {
      id: null,
      email: null,
      name: null,
    },
    identity: {
      canonical_level: null,
      ial_reference: null,
      operational_level: null,
      level: null,
      owner_user_id: row.owner_id ?? null,
      owner_email: null,
      email_verified: null,
      auth_context: null,
      identity_hash: null,
    },
    fields: {
      schema_hash: null,
      schema_version: 1,
      signer_state_hash: null,
      signer_state_version: 1,
    },
    signature_capture: {
      present: Boolean(signedHash),
      stored: false,
      consent: true,
      capture_kind: null,
      store_encrypted_signature_opt_in: false,
      store_signature_vectors_opt_in: false,
      render_hash: null,
      strokes_hash: null,
      ciphertext_hash: null,
    },
    proofs,
    system: {
      schema: 'eco.canonical.certificate.v1',
      source: 'client_projection_preview',
      authoritative: false,
      issued_at_source: 'client_projection_preview',
      signed_hash: signedHash ?? null,
    },
  };

  return { eco, json: canonicalStringify(eco) };
};

export type VerificationStatus = 'valid' | 'tampered' | 'incomplete' | 'unknown';

export type VerificationResult = {
  status: VerificationStatus;
  source_hash?: string;
  witness_hash?: string;
  signed_hash?: string;
  authoritative?: boolean;
  hash_chain_mismatch?: string;
  epi?: {
    level: 1 | 2;
    status: 'valid' | 'tampered' | 'unknown';
    root_hash?: string;
    computed_root_hash?: string;
    algorithm?: string;
  };
  institutional_signature?: {
    present: boolean;
    valid?: boolean;
    trusted?: boolean;
    revoked?: boolean;
    reason?: string;
    public_key_id?: string;
    revocation_endpoint?: string;
    eco_hash_match?: boolean;
    cryptographic_valid?: boolean;
  };
  timestamps?: EcoV2['timestamps'];
  anchors?: EcoV2['anchors'];
  tsa?: {
    present: boolean;
    valid?: boolean;
    witness_hash?: string;
    gen_time?: string;
  };
};

type EpiVerification = NonNullable<VerificationResult['epi']>;

const getViteEnv = (name: string): string => {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
    return (env?.[name] ?? '').trim();
  } catch {
    return '';
  }
};

let trustStoreWarningLogged = false;

const parseTrustedPublicKeysById = (): Record<string, string> => {
  const raw =
    getViteEnv('VITE_ECOSIGN_TRUSTED_PUBLIC_KEYS_JSON') ||
    getViteEnv('VITE_ECOSIGN_TRUSTED_PUBLIC_KEYS');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const entries = parsed
        .map((item) => (typeof item === 'object' && item ? (item as Record<string, unknown>) : null))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => {
          const id = typeof item['id'] === 'string' ? item['id'].trim() : '';
          const b64 = typeof item['public_key_b64'] === 'string' ? item['public_key_b64'].trim() : '';
          return { id, b64 };
        })
        .filter((item) => item.id.length > 0 && item.b64.length > 0);
      return Object.fromEntries(entries.map((entry) => [entry.id, entry.b64]));
    }
    if (typeof parsed === 'object' && parsed) {
      const obj = parsed as Record<string, unknown>;
      const pairs = Object.entries(obj)
        .map(([id, value]) => [id.trim(), typeof value === 'string' ? value.trim() : ''] as const)
        .filter(([id, value]) => id.length > 0 && value.length > 0);
      return Object.fromEntries(pairs);
    }
  } catch {
    return {};
  }
  return {};
};

const parseRevokedKeyIds = (): Set<string> => {
  const raw = getViteEnv('VITE_ECOSIGN_REVOKED_KEY_IDS');
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
};

const base64ToBytes = (input: string): Uint8Array | null => {
  try {
    const normalized = input.replace(/\s+/g, '');
    const binary = atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
};

const verifyInstitutionalSignature = (
  raw: Record<string, unknown>,
): VerificationResult['institutional_signature'] => {
  const block = raw['ecosign_signature'];
  if (!block || typeof block !== 'object') {
    return { present: false };
  }

  const signature = block as Record<string, unknown>;
  const policyBlock = raw['ecosign_signature_policy'];
  const policy = (typeof policyBlock === 'object' && policyBlock)
    ? (policyBlock as Record<string, unknown>)
    : null;
  const revocationEndpoint = typeof policy?.['revocation_endpoint'] === 'string'
    ? policy['revocation_endpoint']
    : undefined;
  const alg = typeof signature['alg'] === 'string' ? signature['alg'].toLowerCase() : '';
  const publicKeyId = typeof signature['public_key_id'] === 'string' ? signature['public_key_id'] : undefined;
  const ecoHash = typeof signature['eco_hash'] === 'string' ? signature['eco_hash'].toLowerCase() : '';
  const signatureB64 = typeof signature['signature_b64'] === 'string' ? signature['signature_b64'] : '';
  const embeddedPublicKeyB64 =
    typeof signature['public_key_b64'] === 'string' ? signature['public_key_b64'].trim() : '';

  if (alg !== 'ed25519' || !publicKeyId || !ecoHash || !signatureB64) {
    return {
      present: true,
      valid: false,
      trusted: false,
      revoked: false,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      reason: 'institutional_signature_invalid_shape',
    };
  }

  const trustedKeys = parseTrustedPublicKeysById();
  const trustedKeyCount = Object.keys(trustedKeys).length;
  const revokedKeyIds = parseRevokedKeyIds();
  const revoked = revokedKeyIds.has(publicKeyId);
  const trustedPublicKey = trustedKeys[publicKeyId];
  const hasTrustStore = trustedKeyCount > 0;
  const trusted = Boolean(trustedPublicKey);

  if (!hasTrustStore && !trustStoreWarningLogged) {
    console.warn(
      '[eco.verify] Trust store missing: configure VITE_ECOSIGN_TRUSTED_PUBLIC_KEYS_JSON to enable key trust validation.'
    );
    trustStoreWarningLogged = true;
  }

  if (hasTrustStore && !trustedPublicKey) {
    return {
      present: true,
      valid: false,
      trusted: false,
      revoked,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      reason: revoked ? 'institutional_signature_key_revoked' : 'institutional_signature_key_not_trusted',
    };
  }

  if (trustedPublicKey && embeddedPublicKeyB64 && trustedPublicKey !== embeddedPublicKeyB64) {
    return {
      present: true,
      valid: false,
      trusted: true,
      revoked,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      reason: 'institutional_signature_public_key_mismatch',
    };
  }

  const publicKeyB64 = trustedPublicKey || embeddedPublicKeyB64;
  if (!publicKeyB64) {
    return {
      present: true,
      valid: false,
      trusted,
      revoked,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      reason: 'institutional_signature_public_key_missing',
    };
  }

  const unsigned = { ...raw };
  delete unsigned['ecosign_signature'];
  delete unsigned['ecosign_signature_policy'];
  const computedEcoHash = bytesToHex(sha256(utf8ToBytes(canonicalStringify(unsigned))));
  const ecoHashMatch = computedEcoHash === ecoHash;
  if (!ecoHashMatch) {
    return {
      present: true,
      valid: false,
      trusted,
      revoked,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      eco_hash_match: false,
      reason: 'institutional_signature_eco_hash_mismatch',
    };
  }

  const sigBytes = base64ToBytes(signatureB64);
  const pubBytes = base64ToBytes(publicKeyB64);
  if (!sigBytes || !pubBytes) {
    return {
      present: true,
      valid: false,
      trusted,
      revoked,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      eco_hash_match: true,
      reason: 'institutional_signature_decode_failed',
    };
  }

  const ecoHashBytes = hexToBytes(ecoHash);
  let cryptographicValid = false;
  try {
    cryptographicValid = ed.verify(sigBytes, ecoHashBytes, pubBytes);
  } catch {
    cryptographicValid = false;
  }

  if (!cryptographicValid) {
    return {
      present: true,
      valid: false,
      trusted,
      revoked,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      eco_hash_match: true,
      cryptographic_valid: false,
      reason: 'institutional_signature_invalid',
    };
  }

  if (revoked) {
    return {
      present: true,
      valid: false,
      trusted,
      revoked: true,
      public_key_id: publicKeyId,
      revocation_endpoint: revocationEndpoint,
      eco_hash_match: true,
      cryptographic_valid: true,
      reason: 'institutional_signature_key_revoked',
    };
  }

  return {
    present: true,
    valid: true,
    trusted,
    revoked: false,
    public_key_id: publicKeyId,
    revocation_endpoint: revocationEndpoint,
    eco_hash_match: true,
    cryptographic_valid: true,
    reason: trusted ? undefined : 'institutional_signature_no_trust_store',
  };
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

const getHashChainMismatch = (eco: EcoV2): string | null => {
  const chain = eco.hash_chain;
  if (!chain) return null;

  const sourceHash = eco.source?.hash;
  if (sourceHash && chain.source_hash && chain.source_hash !== sourceHash) {
    return 'source_hash_mismatch';
  }

  const witnessHash = eco.witness?.hash;
  if (chain.witness_hash && witnessHash && chain.witness_hash !== witnessHash) {
    return 'witness_hash_mismatch';
  }
  if (chain.witness_hash && !witnessHash) {
    return 'witness_hash_missing_in_document';
  }

  const signedHash = eco.signed?.hash;
  if (chain.signed_hash && signedHash && chain.signed_hash !== signedHash) {
    return 'signed_hash_mismatch';
  }
  if (chain.signed_hash && !signedHash) {
    return 'signed_hash_missing_in_document';
  }

  return null;
};

const verifyTsaEvents = (
  events: EventEntry[],
  witnessHash: string | undefined
): { present: boolean; valid?: boolean; witness_hash?: string; gen_time?: string } => {
  const tsaEvents = events.filter((e): e is TsaEvent =>
    e.kind === 'tsa.confirmed'
  );
  
  if (tsaEvents.length === 0) {
    return { present: false };
  }

  const lastTsa = tsaEvents[tsaEvents.length - 1];

  // MUST: TSA witness_hash must match canonical witness_hash
  const tsaWitness = lastTsa.witness_hash ?? (lastTsa.payload?.['witness_hash'] as string | undefined);
  const tsaGenTime = lastTsa.tsa?.gen_time ?? (lastTsa.payload?.['gen_time'] as string | undefined);
  const tsaToken = lastTsa.tsa?.token_b64 ?? (lastTsa.payload?.['token_b64'] as string | undefined);

  if (witnessHash && tsaWitness && tsaWitness !== witnessHash) {
    return {
      present: true,
      valid: false,
      witness_hash: tsaWitness,
      gen_time: tsaGenTime,
    };
  }

  // MUST: token_b64 must be present
  if (!tsaToken) {
    return {
      present: true,
      valid: false,
      witness_hash: tsaWitness,
      gen_time: tsaGenTime,
    };
  }

  // TSA present and consistent (full validation requires RFC3161 parsing)
  return {
    present: true,
    valid: true,
    witness_hash: tsaWitness,
    gen_time: tsaGenTime,
  };
};

const verifyRekorEvents = (
  events: EventEntry[],
  witnessHash: string | undefined
): { present: boolean; valid?: boolean; ref?: string; witness_hash?: string } => {
  const rekorEvents = events.filter((e) => e.kind === 'rekor.confirmed');
  if (rekorEvents.length === 0) return { present: false };

  const last = rekorEvents[rekorEvents.length - 1];
  const rekorWitness = last.payload?.['witness_hash'] as string | undefined;
  const ref = last.payload?.['ref'] as string | undefined;

  // EPI invariant: rekor.witness_hash must match canonical hash_chain.witness_hash
  if (witnessHash && rekorWitness && rekorWitness !== witnessHash) {
    return { present: true, valid: false, ref, witness_hash: rekorWitness };
  }

  return { present: true, valid: true, ref, witness_hash: rekorWitness };
};

type EpiLeafType = 'content' | 'state' | 'tsa' | 'anchor';
type EpiLeaf = { type: EpiLeafType; hash: string; at: string };

const sha256HexString = (input: string): string => bytesToHex(sha256(utf8ToBytes(input)));

const sortEpiLeavesCanonically = (leaves: EpiLeaf[]): EpiLeaf[] => {
  const typeOrder: Record<EpiLeafType, number> = {
    content: 0,
    state: 1,
    tsa: 2,
    anchor: 3,
  };
  return [...leaves].sort((a, b) => {
    const typeDiff = typeOrder[a.type] - typeOrder[b.type];
    if (typeDiff !== 0) return typeDiff;
    return String(a.at).localeCompare(String(b.at));
  });
};

const buildEpiRoot = (epi: EpiBlock): string | null => {
  if (!epi?.content_hash || !epi?.content_at) return null;
  const stateLeaves = Array.isArray(epi.state_hashes)
    ? epi.state_hashes
        .filter((entry) => typeof entry?.hash === 'string' && typeof entry?.at === 'string')
        .map((entry) => ({ type: 'state' as const, hash: entry.hash, at: entry.at }))
    : [];
  if (stateLeaves.length === 0) return null;

  const leaves: EpiLeaf[] = [
    { type: 'content', hash: epi.content_hash, at: epi.content_at },
    ...stateLeaves,
  ];

  let hashes = sortEpiLeavesCanonically(leaves).map((leaf) => sha256HexString(leaf.hash));

  while (hashes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] ?? hashes[i];
      next.push(sha256HexString(`${left}${right}`));
    }
    hashes = next;
  }

  return hashes[0] ?? null;
};

const verifyEpiBlock = (epi: unknown): EpiVerification => {
  if (!epi || typeof epi !== 'object') {
    return { level: 1, status: 'unknown' };
  }
  const block = epi as Partial<EpiBlock>;
  if (block.level !== 2) {
    return { level: 1, status: 'unknown' };
  }
  const computed = buildEpiRoot(block as EpiBlock);
  const rootHash = typeof block.root_hash === 'string' ? block.root_hash : undefined;
  if (!computed || !rootHash) {
    return {
      level: 2,
      status: 'unknown',
      root_hash: rootHash,
      computed_root_hash: computed ?? undefined,
      algorithm: typeof block.algorithm === 'string' ? block.algorithm : undefined,
    };
  }
  if (computed !== rootHash) {
    return {
      level: 2,
      status: 'tampered',
      root_hash: rootHash,
      computed_root_hash: computed,
      algorithm: typeof block.algorithm === 'string' ? block.algorithm : undefined,
    };
  }
  return {
    level: 2,
    status: 'valid',
    root_hash: rootHash,
    computed_root_hash: computed,
    algorithm: typeof block.algorithm === 'string' ? block.algorithm : undefined,
  };
};

export const verifyEcoV2 = (eco: unknown): VerificationResult => {
  if (!eco || typeof eco !== 'object') {
    return { status: 'unknown' };
  }

  const raw = eco as Record<string, unknown>;

  // Canonical certificate format (declarative):
  // { format: 'eco', version: 'eco.v2', document: {...}, proofs: [...] }
  // Also matches canonical certificates that only have format: 'eco' without version field.
  const isCanonicalCertificate =
    (raw['version'] === 'eco.v2' || raw['format'] === 'eco') &&
    typeof raw['document'] === 'object' &&
    raw['document'] !== null &&
    !raw['hash_chain'];

  if (isCanonicalCertificate) {
    const system = typeof raw['system'] === 'object' && raw['system'] !== null
      ? (raw['system'] as Record<string, unknown>)
      : null;
    const authoritative = system?.['authoritative'] !== false;

    const document = raw['document'] as Record<string, unknown>;
    const sourceHash = typeof document['source_hash'] === 'string' ? document['source_hash'] : undefined;
    const witnessHash = typeof document['witness_hash'] === 'string' ? document['witness_hash'] : undefined;
    const proofs = Array.isArray(raw['proofs']) ? (raw['proofs'] as Array<Record<string, unknown>>) : [];
    const tsaProof = proofs.find((proof) => proof?.['kind'] === 'tsa');
    const tsa = tsaProof
      ? {
          present: true,
          valid: tsaProof['status'] === 'confirmed',
          witness_hash:
            typeof tsaProof['witness_hash'] === 'string'
              ? (tsaProof['witness_hash'] as string)
              : witnessHash,
          gen_time: typeof tsaProof['attempted_at'] === 'string' ? (tsaProof['attempted_at'] as string) : undefined,
        }
      : { present: false as const };
    const institutionalSignature =
      verifyInstitutionalSignature(raw) ?? ({ present: false } as NonNullable<VerificationResult['institutional_signature']>);
    const epiVerification = verifyEpiBlock(raw['epi']);

    if (!sourceHash) return { status: 'unknown' };
    if (tsa.present && tsa.valid === false) return { status: 'tampered', tsa };
    if (institutionalSignature.present && institutionalSignature.valid === false) {
      const trustPolicyReason =
        institutionalSignature.reason === 'institutional_signature_key_not_trusted' ||
        institutionalSignature.reason === 'institutional_signature_key_revoked';
      if (!trustPolicyReason) {
        return { status: 'tampered', tsa, institutional_signature: institutionalSignature, epi: epiVerification };
      }
    }
    if (epiVerification.status === 'tampered') {
      return { status: 'tampered', tsa, institutional_signature: institutionalSignature, epi: epiVerification };
    }

    return {
      status: witnessHash ? 'valid' : 'incomplete',
      source_hash: sourceHash,
      witness_hash: witnessHash,
      authoritative,
      institutional_signature: institutionalSignature,
      epi: epiVerification,
      signed_hash: typeof raw?.['system'] === 'object' && raw['system'] !== null
        ? ((raw['system'] as Record<string, unknown>)['signed_hash'] as string | undefined)
        : undefined,
      tsa,
    };
  }

  const candidate = eco as EcoV2;

  if (candidate.version !== 'eco.v2' && (raw as Record<string, unknown>)['format'] !== 'eco') {
    return { status: 'unknown' };
  }

  const epiVerification = verifyEpiBlock(candidate.epi);

  if (!candidate.hash_chain) {
    const hasDigestData = Boolean(candidate.source?.hash || candidate.witness?.hash || candidate.signed?.hash);
    if (hasDigestData) {
      return {
        status: 'tampered',
        source_hash: candidate.source?.hash,
        witness_hash: candidate.witness?.hash,
        signed_hash: candidate.signed?.hash,
        hash_chain_mismatch: 'hash_chain_missing',
      };
    }
    return { status: 'unknown' };
  }

  if (!candidate.source?.hash) {
    return { status: 'unknown' };
  }

  const hashChainMismatch = getHashChainMismatch(candidate);
  if (hashChainMismatch) {
    return {
      status: 'tampered',
      source_hash: candidate.source?.hash,
      witness_hash: candidate.hash_chain.witness_hash,
      signed_hash: candidate.hash_chain.signed_hash,
      hash_chain_mismatch: hashChainMismatch,
      epi: epiVerification,
    };
  }

  if (candidate.source.hash !== candidate.hash_chain.source_hash) {
    return { status: 'tampered', epi: epiVerification };
  }

  if (candidate.witness) {
    if (!candidate.hash_chain.witness_hash) return { status: 'tampered' };
    if (candidate.witness.hash !== candidate.hash_chain.witness_hash) {
      return { status: 'tampered', epi: epiVerification };
    }
  }

  if (candidate.signed) {
    if (!candidate.hash_chain.signed_hash) return { status: 'tampered' };
    if (candidate.signed.hash !== candidate.hash_chain.signed_hash) {
      return { status: 'tampered', epi: epiVerification };
    }
  }

  if (!transformLogIsConsistent(candidate.transform_log ?? [], candidate.hash_chain)) {
    return { status: 'tampered', epi: epiVerification };
  }

  // Verify TSA events consistency
  const tsaVerification = verifyTsaEvents(
    candidate.events ?? [],
    candidate.hash_chain.witness_hash
  );

  // If TSA present but invalid → tampered
  if (tsaVerification.present && tsaVerification.valid === false) {
    return { status: 'tampered', tsa: tsaVerification, epi: epiVerification };
  }

  // Verify Rekor events consistency (EPI: witness_hash must match hash_chain)
  const rekorVerification = verifyRekorEvents(
    candidate.events ?? [],
    candidate.hash_chain.witness_hash
  );

  if (rekorVerification.present && rekorVerification.valid === false) {
    return {
      status: 'tampered',
      tsa: tsaVerification,
      hash_chain_mismatch: 'rekor_witness_hash_mismatch',
      epi: epiVerification,
    };
  }

  if (epiVerification.status === 'tampered') {
    return {
      status: 'tampered',
      tsa: tsaVerification,
      epi: epiVerification,
    };
  }

  if (isIncomplete(candidate)) {
    return {
      status: 'incomplete',
      source_hash: candidate.hash_chain.source_hash,
      witness_hash: candidate.hash_chain.witness_hash,
      signed_hash: candidate.hash_chain.signed_hash,
      timestamps: candidate.timestamps,
      anchors: candidate.anchors,
      tsa: tsaVerification,
      epi: epiVerification,
    };
  }

  return {
    status: 'valid',
    source_hash: candidate.hash_chain.source_hash,
    witness_hash: candidate.hash_chain.witness_hash,
    signed_hash: candidate.hash_chain.signed_hash,
    authoritative: true,
    timestamps: candidate.timestamps,
    anchors: candidate.anchors,
    tsa: tsaVerification,
    epi: epiVerification,
  };
};
