import { canonicalize, sha256Hex } from './canonicalHash.ts';

export type MerkleLeafType = 'content' | 'state' | 'tsa' | 'anchor';

export interface MerkleLeaf {
  type: MerkleLeafType;
  hash: string;
  at: string; // ISO timestamp — used for canonical ordering within same type
}

export interface EpiStateField {
  field_id?: string;
  id?: string;
  external_field_id?: string;
  field_type?: string;
  type?: string;
  page?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  w?: number;
  h?: number;
  signer_id?: string | null;
  signer_email?: string | null;
}

export interface EpiPageMetrics {
  page?: number;
  pageNumber?: number;
  width?: number;
  height?: number;
}

const HEX_64_RE = /^[0-9a-f]{64}$/i;
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isValidHexHash(value: unknown): value is string {
  return typeof value === 'string' && HEX_64_RE.test(value.trim());
}

function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!ISO_TS_RE.test(trimmed)) return false;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed);
}

function assertValidLeaf(leaf: MerkleLeaf, index: number) {
  if (!isValidHexHash(leaf.hash)) {
    throw new Error(`Invalid Merkle leaf hash at index ${index}`);
  }
  if (!isValidIsoTimestamp(leaf.at)) {
    throw new Error(`Invalid Merkle leaf timestamp at index ${index}`);
  }
}

/**
 * Orden canónico de leaves para el Merkle tree EPI.
 *
 * INVARIANTE: Este orden NO puede cambiar una vez que el primer H_r
 * sea emitido en producción. Cambiar el orden invalida todos los H_r
 * anteriores.
 */
export function sortLeavesCanonically(leaves: MerkleLeaf[]): MerkleLeaf[] {
  const typeOrder: Record<MerkleLeafType, number> = {
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
}

/**
 * Merkle tree simple (sin pruebas de inclusión).
 * Algoritmo: SHA256(SHA256(leaf_a) || SHA256(leaf_b))
 * Para número impar de hojas: duplicar la última.
 */
export async function buildMerkleRoot(leaves: MerkleLeaf[]): Promise<string> {
  if (!Array.isArray(leaves) || leaves.length === 0) {
    throw new Error('Cannot build Merkle root from empty leaves');
  }

  const filtered = leaves.filter(Boolean);
  if (filtered.length === 0) {
    throw new Error('Cannot build Merkle root from empty leaves');
  }
  filtered.forEach((leaf, index) => assertValidLeaf(leaf, index));

  const sorted = sortLeavesCanonically(filtered);
  if (sorted.length === 0) {
    throw new Error('Cannot build Merkle root from empty leaves');
  }

  let hashes = await Promise.all(sorted.map((leaf) => sha256Hex(leaf.hash)));

  while (hashes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] ?? hashes[i];
      next.push(await sha256Hex(`${left}${right}`));
    }
    hashes = next;
  }

  return hashes[0];
}

/**
 * Computa H_s para un batch de firmante.
 *
 * Incluye: fields + page_metrics.
 * NO incluye: witness_hash del PDF resultante (ese va en signature.completed).
 */
export async function computeStateHash(
  fields: EpiStateField[],
  pageMetrics: EpiPageMetrics[]
): Promise<string> {
  const normalizeCoord = (n: number) => Math.round(n);

  const normalizedFields = (fields || [])
    .map((f) => {
      const fieldId = (f.field_id || f.id || f.external_field_id || '').toString();
      return {
        field_id: fieldId,
        field_type: (f.field_type || f.type || 'unknown') as string,
        page: Number.isFinite(f.page) ? Number(f.page) : 1,
        x: normalizeCoord(Number(f.x ?? 0)),
        y: normalizeCoord(Number(f.y ?? 0)),
        width: normalizeCoord(Number(f.width ?? f.w ?? 0)),
        height: normalizeCoord(Number(f.height ?? f.h ?? 0)),
        signer_id: f.signer_id ?? null,
        signer_email: f.signer_email ?? null,
      };
    })
    .filter((f) => f.field_id.length > 0)
    .sort((a, b) => a.field_id.localeCompare(b.field_id));

  const normalizedPages = (pageMetrics || [])
    .map((p) => ({
      page: Number.isFinite(p.page) ? Number(p.page) : Number(p.pageNumber ?? 1),
      width: normalizeCoord(Number(p.width ?? 0)),
      height: normalizeCoord(Number(p.height ?? 0)),
    }))
    .filter((p) => Number.isFinite(p.page) && p.page > 0)
    .sort((a, b) => a.page - b.page);

  const canonical = {
    fields: normalizedFields,
    pages: normalizedPages,
  };

  return sha256Hex(canonicalize(canonical));
}

/**
 * Derives the canonical timestamp to use as content_at for the EPI block.
 * Prefers entity.created_at, then the earliest event timestamp.
 */
export function deriveContentAt(events: unknown[], fallback?: string | null): string {
  const fallbackAt = typeof fallback === 'string' ? fallback.trim() : '';
  if (fallbackAt) return fallbackAt;
  const ats = Array.isArray(events)
    ? events
        .map((e: any) => (typeof e?.at === 'string' ? e.at : ''))
        .filter((v) => v.length > 0)
        .sort((a, b) => a.localeCompare(b))
    : [];
  return ats[0] ?? '';
}

export type EpiBlock = {
  level: 2;
  content_hash: string;
  content_at: string;
  root_hash: string;
  state_hashes: { hash: string; at: string }[];
  algorithm: string;
};

export async function buildEpiBlockFromEvents(params: {
  source_hash?: string | null;
  content_at?: string | null;
  events: any[];
}): Promise<EpiBlock | null> {
  const sourceHash = typeof params.source_hash === 'string' ? params.source_hash : '';
  const contentAt = typeof params.content_at === 'string' ? params.content_at : '';
  if (!sourceHash || !contentAt) return null;
  if (!isValidHexHash(sourceHash) || !isValidIsoTimestamp(contentAt)) return null;

  const signatureEvents = Array.isArray(params.events) ? params.events : [];
  const stateLeaves = signatureEvents
    .filter((e: any) => e?.kind === 'signature.completed')
    .map((e: any) => {
      const hash = e?.evidence?.epi_state_hash ?? e?.payload?.evidence?.epi_state_hash ?? null;
      const at = typeof e?.at === 'string' ? e.at : '';
      return hash && at ? ({ type: 'state' as const, hash: String(hash), at }) : null;
    })
    .filter(Boolean) as MerkleLeaf[];

  if (stateLeaves.length === 0) return null;

  const contentLeaf: MerkleLeaf = {
    type: 'content',
    hash: sourceHash,
    at: contentAt,
  };

  let rootHash: string;
  try {
    rootHash = await buildMerkleRoot([contentLeaf, ...stateLeaves]);
  } catch (err) {
    console.warn('buildEpiBlockFromEvents: invalid merkle input (best-effort)', err);
    return null;
  }
  const stateHashes = [...stateLeaves]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((leaf) => ({ hash: leaf.hash, at: leaf.at }));

  return {
    level: 2,
    content_hash: sourceHash,
    content_at: contentAt,
    root_hash: rootHash,
    state_hashes: stateHashes,
    algorithm: 'merkle-sha256-canonical-v1',
  };
}
