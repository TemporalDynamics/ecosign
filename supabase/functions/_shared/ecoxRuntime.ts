type JsonObject = Record<string, unknown>;

const DEFAULT_STORAGE_BUCKET = 'user-documents';

const asObject = (value: unknown): JsonObject | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : null;

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pickFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const parsed = asString(value);
    if (parsed) return parsed;
  }
  return null;
};

export type EcoxRuntimeMetadata = {
  encrypted_path: string | null;
  wrapped_key: string | null;
  wrap_iv: string | null;
  storage_bucket: string;
};

export function readEcoxRuntimeMetadata(metadata: unknown): EcoxRuntimeMetadata {
  const root = asObject(metadata) ?? {};
  const ecox = asObject(root.ecox) ?? {};
  const runtime = asObject(ecox.runtime) ?? {};

  const encryptedPath = pickFirstString(
    runtime.encrypted_path,
    runtime.encryptedPath,
    ecox.encrypted_path,
    root.encrypted_path,
  );
  const wrappedKey = pickFirstString(
    runtime.wrapped_key,
    runtime.wrappedKey,
    ecox.wrapped_key,
    root.wrapped_key,
  );
  const wrapIv = pickFirstString(
    runtime.wrap_iv,
    runtime.wrapIv,
    ecox.wrap_iv,
    root.wrap_iv,
  );
  const storageBucket = pickFirstString(
    runtime.storage_bucket,
    runtime.bucket,
    ecox.storage_bucket,
    root.storage_bucket,
  ) ?? DEFAULT_STORAGE_BUCKET;

  return {
    encrypted_path: encryptedPath,
    wrapped_key: wrappedKey,
    wrap_iv: wrapIv,
    storage_bucket: storageBucket,
  };
}
