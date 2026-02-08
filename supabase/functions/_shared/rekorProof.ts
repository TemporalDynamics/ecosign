import { canonicalize, sha256Hex } from './canonicalHash.ts';
import { getPublicKey, sign } from 'https://esm.sh/@noble/ed25519@2.0.0';

export type RekorProofResult = {
  kind: 'rekor';
  status: 'confirmed' | 'attempted' | 'failed' | 'timeout';
  provider: string;
  ref: string | null;
  attempted_at: string;
  reason?: string;
  statement_hash?: string;
  statement_type?: string;
};

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

export async function attemptRekorProof(params: {
  witness_hash: string;
  workflow_id: string;
  signer_id: string;
  timeout_ms: number;
}): Promise<RekorProofResult> {
  const attemptedAt = new Date().toISOString();
  const provider = 'rekor.sigstore.dev';

  if (!params.witness_hash) {
    return { kind: 'rekor', status: 'attempted', provider, ref: null, attempted_at: attemptedAt, reason: 'no_witness_hash' };
  }

  const priv = getPrivateKeyBytes();
  if (!priv) {
    return { kind: 'rekor', status: 'attempted', provider, ref: null, attempted_at: attemptedAt, reason: 'no_key_configured' };
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
    const statementHashBytes = hexToBytes(statementHash);

    const signature = await sign(statementHashBytes, priv);
    const pubkey = await getPublicKey(priv);

    const rekorPayload = {
      apiVersion: '0.0.1',
      kind: 'hashedrekord',
      spec: {
        data: { hash: { algorithm: 'sha256', value: statementHash } },
        signature: {
          content: bytesToBase64(signature),
          publicKey: { content: bytesToBase64(pubkey) }
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
      return {
        kind: 'rekor',
        status: 'failed',
        provider,
        ref: null,
        attempted_at: attemptedAt,
        reason: `http_${resp.status}`,
        statement_hash: statementHash,
        statement_type: statement.type
      };
    }

    const data = await resp.json().catch(() => ({}));
    const uuid = data && typeof data === 'object' ? Object.keys(data)[0] : null;
    return {
      kind: 'rekor',
      status: uuid ? 'confirmed' : 'failed',
      provider,
      ref: uuid,
      attempted_at: attemptedAt,
      statement_hash: statementHash,
      statement_type: statement.type
    };
  } catch (_err) {
    return { kind: 'rekor', status: 'timeout', provider, ref: null, attempted_at: attemptedAt };
  }
}
