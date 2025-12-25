export type EcoManifest = {
  projectId: string;
  metadata?: Record<string, unknown>;
  assets: Array<{
    assetId?: string;
    name: string;
    size: number;
    hash: string;
  }>;
};

export type EcoSignature = {
  algorithm: 'Ed25519' | string;
  publicKey: string;
  signature: string;
  timestamp: string;
  legalTimestamp?: {
    standard?: string;
    tsa?: string;
    tokenSize?: number;
    verified?: boolean;
  } | null;
};

export type EcoPackage = {
  version: string;
  certificate_schema_version?: string;
  manifest: EcoManifest;
  signatures: EcoSignature[];
  metadata?: Record<string, unknown>;
};

export type VerificationResult = {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
};

export function pack(): EcoPackage {
  throw new Error('eco-packer-public: pack() is a stub.');
}

export function verify(): VerificationResult {
  throw new Error('eco-packer-public: verify() is a stub.');
}

export function unpack(): EcoPackage {
  throw new Error('eco-packer-public: unpack() is a stub.');
}
