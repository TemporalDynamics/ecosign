import { canonicalize, sha256Hex } from './canonicalHash.ts';
import * as ed from 'https://esm.sh/@noble/ed25519@2.0.0';
import { sha512 } from 'https://esm.sh/@noble/hashes@1.5.0/sha512';

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

type SignResult = {
  signed: boolean;
  eco: Record<string, unknown>;
  reason?: string;
};

function base64ToBytes(input: string): Uint8Array {
  const raw = atob(input);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (!/^([0-9a-f]{2})+$/.test(clean)) return new Uint8Array();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

function getPrivateKeyBytes(): Uint8Array | null {
  const primary = (Deno.env.get('ECO_SIGNING_PRIVATE_KEY_B64') || '').trim();
  const legacy = (Deno.env.get('ECO_SIGNING_PRIVATE_KEY') || '').trim();
  const raw = primary || legacy;
  if (!raw) return null;
  try {
    // Accept plain base64 DER or PEM payload.
    const normalizedBase64 = raw.includes('BEGIN')
      ? raw.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
      : raw.replace(/\s+/g, '');
    const bytes = base64ToBytes(normalizedBase64);
    if (bytes.length === 32 || bytes.length === 64) return bytes;
    return null;
  } catch {
    return null;
  }
}

export async function signFinalEcoInstitutionally(
  ecoPayload: Record<string, unknown>,
): Promise<SignResult> {
  const requireSignature = (Deno.env.get('ECO_REQUIRE_INSTITUTIONAL_SIGNATURE') || '').trim() === '1';
  const keyId = (Deno.env.get('ECO_SIGNING_PUBLIC_KEY_ID') || 'k1').trim();
  const privateKey = getPrivateKeyBytes();

  if (!privateKey) {
    if (requireSignature) {
      throw new Error('institutional_signature_required_but_key_missing');
    }
    return { signed: false, eco: ecoPayload, reason: 'institutional_signature_key_missing' };
  }

  const unsignedEco = { ...ecoPayload };
  delete (unsignedEco as Record<string, unknown>)['ecosign_signature'];
  const canonicalJson = canonicalize(unsignedEco);
  const ecoHashHex = await sha256Hex(canonicalJson);
  const ecoHashBytes = hexToBytes(ecoHashHex);

  const signer = ed as unknown as {
    sign: (msg: Uint8Array, sk: Uint8Array) => Promise<Uint8Array>;
    getPublicKey: (sk: Uint8Array) => Promise<Uint8Array>;
  };
  const signatureBytes = await signer.sign(ecoHashBytes, privateKey);
  const publicKeyBytes = await signer.getPublicKey(privateKey);

  const signedAt = typeof ecoPayload?.['issued_at'] === 'string'
    ? String(ecoPayload['issued_at'])
    : new Date().toISOString();

  const signedEco = {
    ...unsignedEco,
    ecosign_signature: {
      version: 'ecosign.signature.v1',
      alg: 'ed25519',
      public_key_id: keyId,
      public_key_b64: bytesToBase64(publicKeyBytes),
      eco_hash: ecoHashHex,
      signature_b64: bytesToBase64(signatureBytes),
      signed_at: signedAt,
    },
  };

  return { signed: true, eco: signedEco };
}
