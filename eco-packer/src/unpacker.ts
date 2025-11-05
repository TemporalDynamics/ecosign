import JSZip from 'jszip';
import { Validator } from 'jsonschema';
import { canonicalizeForManifest, verifyManifestEd25519 } from './eco-utils';
import MANIFEST_SCHEMA from './schema/ECO_MANIFEST_SCHEMA.json';

export type EcoxInput = Blob | ArrayBuffer | Uint8Array;

export interface ManifestSignature {
  keyId: string;
  algorithm: string;
  signature: string;
  createdAt: string;
  notes?: string;
}

export interface ManifestAsset {
  id: string;
  mediaType: string;
  fileName: string;
  duration?: number;
  width?: number;
  height?: number;
  sha256: string;
  notes?: string;
}

export interface ManifestSegment {
  id: string;
  assetId: string;
  startTime: number;
  endTime: number;
  projectStartTime: number;
  speed?: number;
  volume?: number;
}

export interface ManifestOperationLogEntry {
  opId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface EcoManifest {
  specVersion: string;
  projectId: string;
  title: string;
  description?: string;
  createdAt: string;
  author: {
    name: string;
    email?: string;
  };
  assets: ManifestAsset[];
  segments: ManifestSegment[];
  operationLog: ManifestOperationLogEntry[];
  metadata?: {
    tags?: string[];
    custom?: Record<string, unknown>;
  };
  signatures: ManifestSignature[];
}

export interface UnpackerOptions {
  publicKey: Buffer | Uint8Array | string;
  /** Optional key identifier to match against the signature block */
  expectedKeyId?: string;
}

const MANIFEST_SIZE_LIMIT = 1_000_000; // 1 MB hard limit
const SAFE_MANIFEST_PATTERN = /^[a-zA-Z0-9{}\[\]:,"._\-\+\/\=\s]+$/;

function normalizePublicKey(key: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(key)) {
    return key;
  }
  if (typeof key === 'string') {
    return Buffer.from(key, 'base64');
  }
  return Buffer.from(key);
}

function selectSignature(
  signatures: ManifestSignature[],
  expectedKeyId?: string
): ManifestSignature {
  const matchingSignature = signatures.find(sig => {
    if (sig.algorithm !== 'Ed25519') {
      return false;
    }
    if (expectedKeyId) {
      return sig.keyId === expectedKeyId;
    }
    return true;
  });

  if (!matchingSignature) {
    throw new Error('No compatible Ed25519 signature found in manifest.');
  }

  if (!matchingSignature.signature) {
    throw new Error('Invalid signature block: signature is missing.');
  }

  return matchingSignature;
}

function ensureUniqueAssetIds(assets: ManifestAsset[]): void {
  const ids = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.id)) {
      throw new Error(`Manifest validation failed: duplicate asset id "${asset.id}".`);
    }
    ids.add(asset.id);
  }
}

function verifySegmentReferences(segments: ManifestSegment[], assets: ManifestAsset[]): void {
  const assetIds = new Set(assets.map(asset => asset.id));
  for (const segment of segments) {
    if (!assetIds.has(segment.assetId)) {
      throw new Error(`Manifest validation failed: segment "${segment.id}" references unknown asset "${segment.assetId}".`);
    }
    if (segment.startTime < 0 || segment.endTime < 0) {
      throw new Error(`Manifest validation failed: segment "${segment.id}" contains negative timestamps.`);
    }
    if (segment.endTime < segment.startTime) {
      throw new Error(`Manifest validation failed: segment "${segment.id}" has endTime < startTime.`);
    }
    if (segment.speed !== undefined && segment.speed <= 0) {
      throw new Error(`Manifest validation failed: segment "${segment.id}" has non-positive speed.`);
    }
  }
}

function validateOperationLog(entries: ManifestOperationLogEntry[]): void {
  for (const entry of entries) {
    if (Number.isNaN(Date.parse(entry.timestamp))) {
      throw new Error(`Manifest validation failed: operation ${entry.opId} has invalid timestamp.`);
    }
  }
}

async function loadZip(ecoFile: EcoxInput): Promise<JSZip> {
  try {
    if (typeof Blob !== 'undefined' && ecoFile instanceof Blob) {
      const arrayBuffer = await ecoFile.arrayBuffer();
      return await JSZip.loadAsync(arrayBuffer);
    }
    return await JSZip.loadAsync(ecoFile as ArrayBuffer | Uint8Array);
  } catch (error) {
    throw new Error(`Failed to read .ecox file: ${error instanceof Error ? error.message : 'Invalid format'}`);
  }
}

/**
 * Unpacks a secure .ecox project file, verifies integrity and signature and returns the verified manifest.
 */
export async function unpack(
  ecoFile: EcoxInput,
  options: UnpackerOptions
): Promise<EcoManifest> {
  if (!options?.publicKey) {
    throw new Error('Public key is required for unpacking and verification.');
  }

  const zip = await loadZip(ecoFile);

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Invalid .ecox file: manifest.json not found.');
  }

  let manifestJson: string;
  try {
    manifestJson = await manifestFile.async('string');
  } catch (error) {
    throw new Error(`Failed to read manifest.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (manifestJson.length > MANIFEST_SIZE_LIMIT) {
    throw new Error('Manifest too large: exceeds 1 MB limit.');
  }

  if (!SAFE_MANIFEST_PATTERN.test(manifestJson)) {
    throw new Error('Manifest contains invalid or unsupported characters.');
  }

  let manifest: EcoManifest;
  try {
    manifest = JSON.parse(manifestJson);
  } catch (error) {
    throw new Error('Invalid .ecox file: manifest.json is not valid JSON.');
  }

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid manifest structure.');
  }

  if (!Array.isArray(manifest.signatures) || manifest.signatures.length === 0) {
    throw new Error('Invalid manifest: No signatures found.');
  }

  const signatureInfo = selectSignature(manifest.signatures, options.expectedKeyId);
  const manifestForVerification = JSON.parse(JSON.stringify(manifest));
  manifestForVerification.signatures = [];

  const canonicalManifestToVerify = canonicalizeForManifest(manifestForVerification);
  const publicKey = normalizePublicKey(options.publicKey);

  const isVerified = verifyManifestEd25519(
    canonicalManifestToVerify,
    signatureInfo.signature,
    publicKey
  );

  if (!isVerified) {
    throw new Error('Manifest verification failed: The project file is corrupt or has been tampered with.');
  }

  const validator = new Validator();
  const validationResult = validator.validate(manifest, MANIFEST_SCHEMA);
  if (!validationResult.valid) {
    const errors = validationResult.errors.map((e: Error) => e.stack).join(', ');
    throw new Error(`Manifest schema validation failed: ${errors}`);
  }

  ensureUniqueAssetIds(manifest.assets);
  verifySegmentReferences(manifest.segments, manifest.assets);
  validateOperationLog(manifest.operationLog);

  return manifest;
}
