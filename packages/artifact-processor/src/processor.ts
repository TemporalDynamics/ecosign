import type { ArtifactInput, ArtifactOutput } from './types.ts';

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const sha256 = async (data: Uint8Array): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('crypto.subtle not available');
  }
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(hashBuffer));
};

/**
 * Artifact v1 processor (deterministic stub).
 *
 * Current behavior: pass-through PDF bytes and compute SHA-256.
 * This keeps determinism while the real assembler is implemented.
 */
export const processArtifact = async (input: ArtifactInput): Promise<ArtifactOutput> => {
  const artifact = input.pdf_base;
  const hash = await sha256(artifact);

  return {
    artifact,
    hash,
    mime: 'application/pdf',
    size_bytes: artifact.byteLength,
    artifact_version: 'v1',
  };
};
