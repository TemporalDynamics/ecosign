export class ManifestValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super('Manifest validation failed');
    this.name = 'ManifestValidationError';
  }
}

export class MissingAssetHashError extends Error {
  constructor(assetId: string) {
    super(`Missing SHA256 hash for asset "${assetId}".`);
    this.name = 'MissingAssetHashError';
  }
}

export class InvalidHashFormatError extends Error {
  constructor(assetId: string) {
    super(`Invalid SHA256 hash for asset "${assetId}".`);
    this.name = 'InvalidHashFormatError';
  }
}

export class InvalidFileNameError extends Error {
  constructor(assetId: string, reason: string) {
    super(`Invalid fileName for asset "${assetId}": ${reason}`);
    this.name = 'InvalidFileNameError';
  }
}

export class PackQuotaExceededError extends Error {
  constructor(public readonly metric: 'assetCount' | 'totalSize', public readonly value: number, public readonly limit: number) {
    super(`Pack quota exceeded for ${metric}: value=${value}, limit=${limit}`);
    this.name = 'PackQuotaExceededError';
  }
}
