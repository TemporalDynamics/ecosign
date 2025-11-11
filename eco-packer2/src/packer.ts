import JSZip from 'jszip';
import path from 'path';
import { canonicalizeForManifest, signManifestEd25519 } from './eco-utils';
import { Validator } from 'jsonschema';
import MANIFEST_SCHEMA from './schema/ECO_MANIFEST_SCHEMA.json';
import type { EcoProject } from './types';
import {
  InvalidFileNameError,
  InvalidHashFormatError,
  ManifestValidationError,
  MissingAssetHashError,
  PackQuotaExceededError,
} from './errors';

const SHA256_REGEX = /^[a-f0-9]{64}$/;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function sanitizeFileName(fileName: string | undefined, assetId: string): string {
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new InvalidFileNameError(assetId, 'missing');
  }

  const trimmed = fileName.trim();
  const baseName = path.basename(trimmed);

  if (baseName !== trimmed) {
    throw new InvalidFileNameError(assetId, 'path segments are not allowed');
  }

  if (baseName === '.' || baseName === '..') {
    throw new InvalidFileNameError(assetId, 'dot segments are not allowed');
  }

  if (/[\\/:]/.test(baseName)) {
    throw new InvalidFileNameError(assetId, 'path separators are not allowed');
  }

  if (!SAFE_FILENAME_REGEX.test(baseName)) {
    throw new InvalidFileNameError(assetId, 'contains unsupported characters');
  }

  return baseName;
}

export interface PackOptions {
  privateKey: Buffer | Buffer[];
  keyId: string | string[];
  maxAssets?: number;
  maxTotalSize?: number;
  logger?: (event: PackLoggerEvent) => void;
  telemetry?: (event: PackTelemetryEvent) => void;
  requireAllSignatures?: boolean;
}

export type PackLoggerEvent =
  | { type: 'manifest_validated'; assetCount: number; totalSize: number }
  | { type: 'signature_created'; keyId: string }
  | { type: 'pack_completed'; assetCount: number; durationMs: number };

export interface PackTelemetryEvent {
  stage: 'canonicalize' | 'sign' | 'zip';
  durationMs: number;
  assets: number;
}

const now = () => {
  const perf = typeof globalThis !== 'undefined' ? (globalThis as any).performance : undefined;
  return perf && typeof perf.now === 'function' ? perf.now.call(perf) : Date.now();
};

/**
 * Creates a secure, verifiable .ecox project file.
 * The .ecox file is a zip archive containing a signed manifest.
 * It does NOT contain the media assets themselves, only their metadata and checksums.
 *
 * @param project The VISTA NEO project object.
 * @param assetHashes A map of assetId to its sha256 hash.
 * @param options The packer options including the private key.
 * @returns A Blob representing the .ecox file.
 */
export async function pack(
  project: EcoProject,
  assetHashes: Map<string, string>,
  options: PackOptions
): Promise<ArrayBuffer> {
  if (!options.privateKey || !options.keyId) {
    throw new Error('Private key and keyId are required for packing.');
  }

  const privateKeys = Array.isArray(options.privateKey)
    ? options.privateKey
    : [options.privateKey];
  const keyIds = Array.isArray(options.keyId) ? options.keyId : [options.keyId];

  if (privateKeys.length !== keyIds.length) {
    throw new Error('When providing multiple keys, the number of keyIds must match.');
  }

  // 1. Construct the manifest according to the schema
  let totalSize = 0;
  const manifest: any = {
    specVersion: '1.0.0',
    projectId: project.id,
    title: project.name,
    createdAt: new Date(project.createdAt).toISOString(),
    author: {
      name: 'VISTA NEO User' // Placeholder, this should come from user context
    },
    assets: Object.values(project.assets).map(asset => {
      const hash = assetHashes.get(asset.id);
      if (typeof hash !== 'string' || hash.trim().length === 0) {
        throw new MissingAssetHashError(asset.id);
      }

      const normalizedHash = hash.trim().toLowerCase();
      if (!SHA256_REGEX.test(normalizedHash)) {
        throw new InvalidHashFormatError(asset.id);
      }

      const sanitizedFileName = sanitizeFileName(asset.fileName, asset.id);
      const fileSize = typeof asset.fileSize === 'number'
        ? asset.fileSize
        : typeof (asset as any).size === 'number'
          ? (asset as any).size
          : 0;

      const manifestAsset = {
        id: asset.id,
        mediaType: asset.mediaType,
        fileName: sanitizedFileName,
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
        sha256: normalizedHash
      };

      totalSize += fileSize;

      return manifestAsset;
    }),
    segments: project.timeline,
    operationLog: [], // Placeholder for now
    signatures: [] // Will be populated after signing
  };

  // 2. Validate the manifest against the schema (excluding signatures)
  const v = new Validator();
  const validationResult = v.validate(manifest, MANIFEST_SCHEMA);
  if (!validationResult.valid) {
    const errors = validationResult.errors.map((e: Error) => e.stack ?? String(e));
    throw new ManifestValidationError(errors);
  }

  const assetCount = manifest.assets.length;

  if (typeof options.maxAssets === 'number' && assetCount > options.maxAssets) {
    throw new PackQuotaExceededError('assetCount', assetCount, options.maxAssets);
  }

  if (typeof options.maxTotalSize === 'number' && totalSize > options.maxTotalSize) {
    throw new PackQuotaExceededError('totalSize', totalSize, options.maxTotalSize);
  }

  options.logger?.({ type: 'manifest_validated', assetCount, totalSize });

  const timings: Record<string, number> = {};
  const packStart = now();

  // 3. Canonicalize and sign the manifest
  const canonicalStart = now();
  const canonicalManifest = canonicalizeForManifest(manifest);
  timings.canonicalize = now() - canonicalStart;
  options.telemetry?.({ stage: 'canonicalize', durationMs: timings.canonicalize, assets: assetCount });

  keyIds.forEach((currentKeyId, index) => {
    const signingStart = now();
    const signature = signManifestEd25519(canonicalManifest, privateKeys[index]);
    const duration = now() - signingStart;
    timings.sign = (timings.sign ?? 0) + duration;
    manifest.signatures.push({
      keyId: currentKeyId,
      algorithm: 'Ed25519',
      signature,
      createdAt: new Date().toISOString()
    });
    options.logger?.({ type: 'signature_created', keyId: currentKeyId });
  });

  if (timings.sign) {
    options.telemetry?.({ stage: 'sign', durationMs: timings.sign, assets: assetCount });
  }

  // 5. Create the zip archive
  const zip = new JSZip();

  // Use the final canonical representation (including signature) for the file
  const finalCanonicalManifest = canonicalizeForManifest(manifest);
  zip.file('manifest.json', finalCanonicalManifest);

  // 6. Generate the .ecox arraybuffer
  const zipStart = now();
  const result = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });

  timings.zip = now() - zipStart;
  options.telemetry?.({ stage: 'zip', durationMs: timings.zip, assets: assetCount });
  options.logger?.({ type: 'pack_completed', assetCount, durationMs: now() - packStart });

  return result;
}
