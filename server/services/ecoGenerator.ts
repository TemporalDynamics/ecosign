import { randomUUID, createHash } from 'crypto';
import { pack } from '../../eco-packer/dist';

type HexString = string;

export interface EcoSigner {
  id: string;
  fullName: string;
  email: string;
  authority?: string;
  verifiedAt?: string;
}

export interface EvidenceAssetInput {
  id?: string;
  fileName: string;
  mediaType: string;
  sha256: HexString;
  durationMs?: number;
  width?: number;
  height?: number;
}

export interface EcoGenerationInput {
  documentId?: string;
  documentTitle: string;
  documentHash: HexString;
  documentFileName?: string;
  documentMediaType?: string;
  signer: EcoSigner;
  attachments?: EvidenceAssetInput[];
  timeline?: any[];
  metadata?: Record<string, unknown>;
}

export interface EcoGenerationSecrets {
  privateKey: string | Buffer;
  keyId: string;
}

export interface EcoGenerationResult {
  fileName: string;
  mimeType: string;
  bytes: number;
  sha256: HexString;
  base64: string;
  projectId: string;
  assetCount: number;
  signer: EcoSigner;
}

interface TimelineAssetInternal {
  id: string;
  fileName: string;
  mediaType: string;
  duration: number;
  width: number | null;
  height: number | null;
}

const HEX_64 = /^[a-f0-9]{64}$/i;

function normalizeHash(value: string, label: string): string {
  if (!HEX_64.test(value)) {
    throw new Error(`Invalid SHA-256 for ${label}`);
  }
  return value.toLowerCase();
}

function normalizePrivateKey(key: string | Buffer): Buffer {
  if (Buffer.isBuffer(key)) return key;
  const trimmed = key.trim();

  if (trimmed.startsWith('-----BEGIN')) {
    const base64Payload = trimmed
      .replace(/-----BEGIN [^-]+-----/g, '')
      .replace(/-----END [^-]+-----/g, '')
      .replace(/\s+/g, '');
    return Buffer.from(base64Payload, 'base64');
  }

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  return Buffer.from(trimmed, 'base64');
}

export class EcoGenerationService {
  private readonly key: Buffer;
  private readonly keyId: string;

  constructor(secrets: EcoGenerationSecrets) {
    if (!secrets.privateKey || !secrets.keyId) {
      throw new Error('privateKey and keyId are required');
    }
    this.key = normalizePrivateKey(secrets.privateKey);
    this.keyId = secrets.keyId;
  }

  async generate(input: EcoGenerationInput): Promise<EcoGenerationResult> {
    const projectId = input.documentId ?? randomUUID();
    const baseAsset: EvidenceAssetInput = {
      id: input.documentId ?? `doc-${projectId}`,
      fileName: input.documentFileName ?? `${input.documentTitle.replace(/\s+/g, '_')}.pdf`,
      mediaType: input.documentMediaType ?? 'application/pdf',
      sha256: input.documentHash,
    };

    const assets = [baseAsset, ...(input.attachments ?? [])].map((asset, index) => ({
      id: asset.id ?? `asset-${index}`,
      fileName: asset.fileName,
      mediaType: asset.mediaType,
      sha256: normalizeHash(asset.sha256, asset.fileName),
      duration: asset.durationMs ?? 0,
      width: asset.width ?? null,
      height: asset.height ?? null,
    }));

    const assetHashes = new Map(assets.map((asset) => [asset.id, asset.sha256] as const));

    const projectPayload = {
      id: projectId,
      name: input.documentTitle,
      createdAt: new Date().toISOString(),
      assets: assets.reduce<Record<string, TimelineAssetInternal>>((acc, asset) => {
        acc[asset.id] = {
          id: asset.id,
          fileName: asset.fileName,
          mediaType: asset.mediaType,
          duration: asset.duration,
          width: asset.width,
          height: asset.height,
        };
        return acc;
      }, {}),
      timeline: input.timeline ?? [],
    };

    const ecoArrayBuffer = await pack(projectPayload as any, assetHashes, {
      privateKey: this.key,
      keyId: this.keyId,
    });

    const ecoBuffer = Buffer.from(ecoArrayBuffer);
    const sha256 = createHash('sha256').update(ecoBuffer).digest('hex');

    return {
      fileName: `${projectId}.eco`,
      mimeType: 'application/vnd.verifysign.eco',
      bytes: ecoBuffer.byteLength,
      sha256,
      base64: ecoBuffer.toString('base64'),
      projectId,
      assetCount: assets.length,
      signer: input.signer,
    };
  }
}
