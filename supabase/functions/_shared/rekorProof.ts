import { canonicalize, sha256Hex } from './canonicalHash.ts';
import * as ed from 'https://esm.sh/@noble/ed25519@2.0.0';
import { sha512 } from 'https://esm.sh/@noble/hashes@1.5.0/sha512';

// @noble/ed25519 on Deno/esm may require explicit sha512 wiring for sync internals.
if (typeof ed.etc.sha512Sync !== 'function') {
  ed.etc.sha512Sync = (...messages: Uint8Array[]) => {
    const total = messages.reduce((sum, m) => sum + m.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const m of messages) {
      merged.set(m, offset);
      offset += m.length;
    }
    return sha512(merged);
  };
}

export type RekorProofResult = {
  kind: 'rekor';
  status: 'confirmed' | 'attempted' | 'failed' | 'timeout';
  provider: string;
  ref: string | null;
  attempted_at: string;
  elapsed_ms?: number;
  reason?: string;
  statement_hash?: string;
  statement_type?: string;
  public_key_b64?: string;
  log_index?: number;
  integrated_time?: number;
  inclusion_proof?: Record<string, unknown>;
};

function normalizeRekorError(err: unknown): { status: 'failed' | 'timeout'; reason: string } {
  if (err && typeof err === 'object') {
    const maybeName = String((err as { name?: unknown }).name ?? '').trim();
    const maybeMessage = String((err as { message?: unknown }).message ?? '').trim();

    if (maybeName === 'AbortError') {
      return { status: 'timeout', reason: 'abort_timeout' };
    }

    if (maybeMessage.length > 0) {
      return { status: 'failed', reason: `network_error:${maybeMessage.slice(0, 120)}` };
    }
  }
  return { status: 'failed', reason: 'unknown_error' };
}

type RekorStatement = {
  type: 'ecosign.proof.v1';
  hash: string;
  workflow_id: string;
  signer_id: string;
  issued_at: string;
};

function base64ToBytes(input: string): Uint8Array {
  const raw = atob(input);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function utf8ToBase64(input: string): string {
  return btoa(new TextEncoder().encode(input).reduce((acc, b) => acc + String.fromCharCode(b), ''));
}

// SubjectPublicKeyInfo DER prefix for Ed25519 public keys (RFC 8410):
// SEQUENCE {
//   SEQUENCE { OID 1.3.101.112 }
//   BIT STRING (32-byte public key)
// }
function ed25519PublicKeySpkiDer(pubkey32: Uint8Array): Uint8Array {
  const prefix = hexToBytes('302a300506032b6570032100');
  const out = new Uint8Array(prefix.length + pubkey32.length);
  out.set(prefix, 0);
  out.set(pubkey32, prefix.length);
  return out;
}

function ed25519PublicKeyPem(pubkey32: Uint8Array): string {
  const spkiDer = ed25519PublicKeySpkiDer(pubkey32);
  const body = bytesToBase64(spkiDer).match(/.{1,64}/g)?.join('\n') ?? bytesToBase64(spkiDer);
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.toLowerCase();
  if (!/^([0-9a-f]{2})+$/.test(clean)) {
    return new Uint8Array();
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getPrivateKeyBytes(): Uint8Array | null {
  const raw = (Deno.env.get('REKOR_ED25519_PRIVATE_KEY_B64') || '').trim();
  if (!raw) return null;
  try {
    const bytes = base64ToBytes(raw);
    if (bytes.length === 32 || bytes.length === 64) return bytes;
    return null;
  } catch (_err) {
    return null;
  }
}

async function signForRekor(message: Uint8Array, priv: Uint8Array): Promise<Uint8Array> {
  const signer = ed as unknown as {
    sign: (msg: Uint8Array, sk: Uint8Array, opts?: { prehash?: boolean }) => Promise<Uint8Array>;
  };
  // Rekor verifies Ed25519 signatures with SHA-512 hashing semantics.
  // Prefer Ed25519ph when available; fallback to standard Ed25519.
  try {
    return await signer.sign(message, priv, { prehash: true });
  } catch {
    return await signer.sign(message, priv);
  }
}

export async function attemptRekorProof(params: {
  witness_hash: string;
  workflow_id: string;
  signer_id: string;
  timeout_ms: number;
}): Promise<RekorProofResult> {
  const startedAtMs = Date.now();
  const attemptedAt = new Date().toISOString();
  const provider = 'rekor.sigstore.dev';

  if (!params.witness_hash) {
    return {
      kind: 'rekor',
      status: 'attempted',
      provider,
      ref: null,
      attempted_at: attemptedAt,
      elapsed_ms: Date.now() - startedAtMs,
      reason: 'no_witness_hash'
    };
  }

  const priv = getPrivateKeyBytes();
  if (!priv) {
    return {
      kind: 'rekor',
      status: 'attempted',
      provider,
      ref: null,
      attempted_at: attemptedAt,
      elapsed_ms: Date.now() - startedAtMs,
      reason: 'no_key_configured'
    };
  }

  try {
    const issuedAt = new Date().toISOString();
    const statement: RekorStatement = {
      type: 'ecosign.proof.v1',
      hash: params.witness_hash,
      workflow_id: params.workflow_id,
      signer_id: params.signer_id,
      issued_at: issuedAt,
    };

    const statementJson = canonicalize(statement);
    const statementHash = await sha256Hex(statementJson);
    const statementBytes = new TextEncoder().encode(statementJson);
    const statementDigest512 = sha512(statementBytes);
    const statementHash512 = bytesToHex(statementDigest512);

    const signature = await signForRekor(statementDigest512, priv);
    const pubkey = await ed.getPublicKey(priv);
    const pubkeyB64 = bytesToBase64(pubkey);
    const spkiDer = ed25519PublicKeySpkiDer(pubkey);
    const pem = ed25519PublicKeyPem(pubkey);
    const pemB64 = utf8ToBase64(pem);

    const rekorPayload = {
      apiVersion: '0.0.1',
      kind: 'hashedrekord',
      spec: {
        data: { hash: { algorithm: 'sha512', value: statementHash512 } },
        signature: {
          content: bytesToBase64(signature),
          publicKey: { content: pemB64 }
        }
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeout_ms);
    const resp = await fetch(`https://${provider}/api/v1/log/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rekorPayload),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      let responseBodySnippet = '';
      try {
        const raw = await resp.text();
        if (raw) {
          responseBodySnippet = raw.slice(0, 200).replace(/\s+/g, ' ').trim();
        }
      } catch {
        // ignore body parsing errors
      }
      return {
        kind: 'rekor',
        status: 'failed',
        provider,
        ref: null,
        attempted_at: attemptedAt,
        elapsed_ms: Date.now() - startedAtMs,
        reason: responseBodySnippet
          ? `http_${resp.status}:${responseBodySnippet}:spki_len_${spkiDer.length}:pem_b64_len_${pemB64.length}`
          : `http_${resp.status}:spki_len_${spkiDer.length}:pem_b64_len_${pemB64.length}`,
        statement_hash: statementHash,
        statement_type: statement.type
      };
    }

    const data = await resp.json().catch(() => ({}));
    const uuid = data && typeof data === 'object' ? Object.keys(data)[0] : null;
    const entry = uuid ? (data as any)[uuid] : null;
    const body = entry?.body ? (() => {
      try {
        const raw = typeof entry.body === 'string' ? atob(entry.body) : null;
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })() : null;
    const logIndex = typeof entry?.logIndex === 'number' ? entry.logIndex : null;
    const integratedTime = typeof entry?.integratedTime === 'number' ? entry.integratedTime : null;
    const inclusionProof = body?.verification || null;
    return {
      kind: 'rekor',
      status: uuid ? 'confirmed' : 'failed',
      provider,
      ref: uuid,
      attempted_at: attemptedAt,
      elapsed_ms: Date.now() - startedAtMs,
      statement_hash: statementHash,
      statement_type: statement.type,
      public_key_b64: pubkeyB64,
      log_index: logIndex ?? undefined,
      integrated_time: integratedTime ?? undefined,
      inclusion_proof: inclusionProof ?? undefined
    };
  } catch (err) {
    const normalized = normalizeRekorError(err);
    return {
      kind: 'rekor',
      status: normalized.status,
      provider,
      ref: null,
      attempted_at: attemptedAt,
      elapsed_ms: Date.now() - startedAtMs,
      reason: normalized.reason
    };
  }
}
