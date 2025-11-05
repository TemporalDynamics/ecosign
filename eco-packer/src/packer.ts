import JSZip from 'jszip';
import path from 'path';
import { Project } from '@vista/timeline-engine';
import { canonicalizeForManifest, signManifestEd25519 } from './eco-utils';
import { Validator } from 'jsonschema';
import MANIFEST_SCHEMA from './schema/ECO_MANIFEST_SCHEMA.json';

const SHA256_REGEX = /^[a-f0-9]{64}$/;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function sanitizeFileName(fileName: string | undefined, assetId: string): string {
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new Error(`Missing fileName for asset "${assetId}".`);
  }

  const trimmed = fileName.trim();
  const baseName = path.basename(trimmed);

  if (baseName !== trimmed) {
    throw new Error(`Invalid fileName for asset "${assetId}": path segments are not allowed.`);
  }

  if (baseName === '.' || baseName === '..') {
    throw new Error(`Invalid fileName for asset "${assetId}": dot segments are not allowed.`);
  }

  if (/[\\/:]/.test(baseName)) {
    throw new Error(`Invalid fileName for asset "${assetId}": path separators are not allowed.`);
  }

  if (!SAFE_FILENAME_REGEX.test(baseName)) {
    throw new Error(`Invalid fileName for asset "${assetId}": contains unsupported characters.`);
  }

  return baseName;
}

export interface PackOptions {
  privateKey: Buffer; // The private key for signing
  keyId: string;      // An identifier for the key
}

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
  project: Project,
  assetHashes: Map<string, string>,
  options: PackOptions
): Promise<ArrayBuffer> {
  if (!options.privateKey || !options.keyId) {
    throw new Error('Private key and keyId are required for packing.');
  }

  // 1. Construct the manifest according to the schema
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
        throw new Error(`Missing SHA256 hash for asset "${asset.id}".`);
      }

      const normalizedHash = hash.trim().toLowerCase();
      if (!SHA256_REGEX.test(normalizedHash)) {
        throw new Error(`Invalid SHA256 hash for asset "${asset.id}".`);
      }

      const sanitizedFileName = sanitizeFileName(asset.fileName, asset.id);

      return {
        id: asset.id,
        mediaType: asset.mediaType,
        fileName: sanitizedFileName,
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
        sha256: normalizedHash
      };
    }),
    segments: project.timeline,
    operationLog: [], // Placeholder for now
    signatures: [] // Will be populated after signing
  };

  // 2. Validate the manifest against the schema (excluding signatures)
  const v = new Validator();
  const validationResult = v.validate(manifest, MANIFEST_SCHEMA);
  if (!validationResult.valid) {
    const errors = validationResult.errors.map((e: Error) => e.stack).join(', ');
    throw new Error(`Manifest does not conform to schema: ${errors}`);
  }

  // 3. Canonicalize and sign the manifest
  const canonicalManifest = canonicalizeForManifest(manifest);
  const signature = signManifestEd25519(canonicalManifest, options.privateKey);

  // 4. Add the signature to the manifest
  manifest.signatures.push({
    keyId: options.keyId,
    algorithm: 'Ed25519',
    signature: signature,
    createdAt: new Date().toISOString()
  });

  // 5. Create the zip archive
  const zip = new JSZip();

  // Use the final canonical representation (including signature) for the file
  const finalCanonicalManifest = canonicalizeForManifest(manifest);
  zip.file('manifest.json', finalCanonicalManifest);

  // 6. Generate the .ecox arraybuffer
  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 9,
    },
  });
}
