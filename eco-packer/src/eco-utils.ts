// librerias/eco-packer/src/eco-utils.ts
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * canonicalize(obj)
 * - returns a canonical JSON string with:
 *   - object keys sorted lexicographically
 *   - arrays left as-is except where explicitly normalized (see note)
 *   - no extra whitespace, no trailing newline
 *
 * For array fields that must be stable (assets, segments, operationLog)
 * we recommend sorting by an explicit key (e.g., asset.id, segment.id).
 * The caller may pre-sort arrays prior to calling canonicalize() to ensure
 * deterministic order.
 */
export function canonicalize(obj: any): string {
  return canonicalizeInternal(obj);
}

function canonicalizeInternal(x: any): string {
  if (x === null || typeof x === 'number' || typeof x === 'boolean') {
    return JSON.stringify(x);
  }
  if (typeof x === 'string') {
    return JSON.stringify(x);
  }
  if (Array.isArray(x)) {
    // We DO NOT reorder arrays here; caller must ensure arrays are in canonical order.
    const items = x.map(item => canonicalizeInternal(item));
    return '[' + items.join(',') + ']';
  }
  // object
  const keys = Object.keys(x).sort();
  const parts: string[] = [];
  for (const k of keys) {
    parts.push(JSON.stringify(k) + ':' + canonicalizeInternal(x[k]));
  }
  return '{' + parts.join(',') + '}';
}

/** sha256Hex(buffer|string) => lowercase hex */
export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Helpers for Ed25519 signing (Node.js >=12.0 supports ed25519) */
export function generateEd25519KeyPair(): { publicKey: Buffer; privateKey: Buffer } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }) as Buffer,
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer
  };
}

/** sign canonical manifest (string) -> base64signature */
export function signManifestEd25519(canonicalManifest: string, privateKeyDer: Buffer): string {
  const keyObject = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  const sig = crypto.sign(null, Buffer.from(canonicalManifest, 'utf8'), keyObject);
  return sig.toString('base64');
}

export function verifyManifestEd25519(canonicalManifest: string, signatureBase64: string, publicKeyDer: Buffer): boolean {
  const keyObject = crypto.createPublicKey({ key: publicKeyDer, format: 'der', type: 'spki' });
  return crypto.verify(null, Buffer.from(canonicalManifest, 'utf8'), keyObject, Buffer.from(signatureBase64, 'base64'));
}

/** Convenience: canonicalize with pre-sorting of important arrays
 * - assets sorted by id
 * - segments sorted by id or projectStartTime
 * - operationLog sorted by timestamp (asc)
 */
export function canonicalizeForManifest(manifest: any): string {
  const copy = JSON.parse(JSON.stringify(manifest));

  if (Array.isArray(copy.assets)) {
    copy.assets.sort((a: any, b: any) => (a.id || '').localeCompare(b.id || ''));
  }
  if (Array.isArray(copy.segments)) {
    // order by projectStartTime then id
    copy.segments.sort((a: any, b: any) => {
      const pa = (a.projectStartTime ?? 0);
      const pb = (b.projectStartTime ?? 0);
      if (pa !== pb) return pa - pb;
      return (a.id || '').localeCompare(b.id || '');
    });
  }
  if (Array.isArray(copy.operationLog)) {
    copy.operationLog.sort((a: any, b: any) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }
  return canonicalizeInternal(copy);
}