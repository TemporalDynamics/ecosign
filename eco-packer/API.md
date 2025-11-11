# 📚 eco-packer API Reference

**Version**: 1.1.0
**Last Updated**: November 10, 2025

Complete API documentation for `@temporaldynamics/eco-packer` - cryptographically signed asset packaging for VISTA NEO.

---

## 📦 Table of Contents

1. [Core Functions](#core-functions)
   - [pack()](#pack)
   - [unpack()](#unpack)
   - [packEcoFromEcoX()](#packecofromeocx)
2. [Cryptographic Functions](#cryptographic-functions)
   - [generateEd25519KeyPair()](#generateed25519keypair)
   - [signManifestEd25519()](#signmanifested25519)
   - [verifyManifestEd25519()](#verifymanifested25519)
3. [Hash Functions](#hash-functions)
   - [sha256Hex()](#sha256hex)
   - [validateAssetHash()](#validateassethash)
4. [Validation Functions](#validation-functions)
   - [validateManifest()](#validatemanifest)
   - [validateProject()](#validateproject)
   - [sanitizeFileName()](#sanitizefilename)
5. [Utility Functions](#utility-functions)
   - [canonicalizeJSON()](#canonicalizejson)
   - [parsePublicKey()](#parsepublickey)
6. [Error Classes](#error-classes)
7. [TypeScript Types](#typescript-types)

---

## Core Functions

### `pack()`

Creates a signed `.ecox` file from a project manifest and asset hashes.

#### Signature

```typescript
async function pack(
  project: EcoProject,
  assetHashes: Map<string, string>,
  options: PackOptions
): Promise<ArrayBuffer>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project` | `EcoProject` | The complete project manifest (metadata, assets, segments) |
| `assetHashes` | `Map<string, string>` | Map of `assetId` → SHA-256 hex hash (64-char lowercase) |
| `options` | `PackOptions` | Signing configuration (privateKey, keyId, etc.) |

#### Returns

`Promise<ArrayBuffer>` - The complete `.ecox` file as binary data (ZIP format).

#### PackOptions

```typescript
interface PackOptions {
  privateKey: Buffer;           // Ed25519 private key (DER format, 48 bytes)
  keyId: string;                // Key identifier (e.g., "tenant-123-prod")
  signerId?: string;            // Optional signer identifier
  metadata?: Record<string, any>; // Optional custom metadata
  compressionLevel?: number;     // ZIP compression (0-9, default: 6)
}
```

#### Example

```typescript
import { pack } from '@temporaldynamics/eco-packer';
import { generateEd25519KeyPair, sha256Hex } from '@temporaldynamics/eco-packer';
import fs from 'fs';

const project: EcoProject = {
  version: '1.1.0',
  projectId: 'proj-12345',
  createdBy: 'user@example.com',
  createdAt: new Date().toISOString(),
  assets: [
    {
      assetId: 'video-001',
      type: 'video',
      source: 'uploads/video.mp4',
      duration: 120.5,
      metadata: { codec: 'h264', resolution: '1920x1080' }
    }
  ],
  segments: [
    {
      segmentId: 'seg-001',
      assetId: 'video-001',
      startTime: 0,
      endTime: 10,
      order: 0
    }
  ],
  metadata: {
    title: 'My First Project',
    description: 'Demo project'
  }
};

// Calculate asset hashes
const assetHashes = new Map<string, string>();
const videoData = fs.readFileSync('/path/to/video.mp4');
assetHashes.set('video-001', sha256Hex(videoData));

// Generate signing keys
const { privateKey, publicKey } = generateEd25519KeyPair();

// Pack the project
const ecoBuffer = await pack(project, assetHashes, {
  privateKey,
  keyId: 'tenant-demo-2025',
  signerId: 'user@example.com',
  compressionLevel: 9
});

// Save to file
fs.writeFileSync('project.ecox', Buffer.from(ecoBuffer));
console.log('✅ Packed to project.ecox');
```

#### Throws

| Error Type | Condition |
|------------|-----------|
| `ManifestValidationError` | Invalid project structure (missing required fields) |
| `HashValidationError` | Missing hash for an asset referenced in segments |
| `SignatureError` | Invalid private key format or signing failure |
| `Error` | ZIP creation or I/O errors |

#### Notes

- **Canonicalization**: Manifest is canonicalized before signing (sorted keys, deterministic arrays).
- **Compression**: Uses ZIP with DEFLATE (default level: 6).
- **Security**: Private key should never be exposed to untrusted environments.
- **Performance**: ~50ms for 100 assets, ~300ms for 1,000 assets (see [BENCHMARKS.md](./BENCHMARKS.md)).

---

### `unpack()`

Verifies and extracts a signed `.ecox` file, returning the validated manifest.

#### Signature

```typescript
async function unpack(
  ecoFile: Blob | ArrayBuffer | Uint8Array,
  options: UnpackerOptions
): Promise<EcoManifest>
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ecoFile` | `Blob \| ArrayBuffer \| Uint8Array` | The `.ecox` file data |
| `options` | `UnpackerOptions` | Verification configuration (publicKey, expectedKeyId) |

#### Returns

`Promise<EcoManifest>` - The validated manifest with signature metadata.

#### UnpackerOptions

```typescript
interface UnpackerOptions {
  publicKey: Buffer | string;    // Ed25519 public key (DER/PEM/hex)
  expectedKeyId?: string;        // Optional: enforce specific keyId
  verifyHashes?: boolean;        // Optional: verify asset hashes (default: true)
  allowExpired?: boolean;        // Optional: allow expired manifests (default: false)
}
```

#### Example

```typescript
import { unpack } from '@temporaldynamics/eco-packer';
import fs from 'fs';

const ecoBuffer = fs.readFileSync('project.ecox');

const manifest = await unpack(ecoBuffer, {
  publicKey: Buffer.from('302a300506...', 'hex'), // DER format
  expectedKeyId: 'tenant-demo-2025',
  verifyHashes: true
});

console.log('✅ Manifest verified!');
console.log(`Project: ${manifest.projectId}`);
console.log(`Assets: ${manifest.assets.length}`);
console.log(`Signed by: ${manifest.signatures[0].keyId}`);
console.log(`Signature valid: ${manifest.signatures[0].valid}`);
```

#### Throws

| Error Type | Condition |
|------------|-----------|
| `SignatureError` | Signature verification fails |
| `ManifestValidationError` | Manifest structure invalid |
| `HashValidationError` | Asset hash mismatch (if `verifyHashes: true`) |
| `PathTraversalError` | Malicious file path detected (e.g., `../etc/passwd`) |
| `Error` | ZIP parsing errors or I/O failures |

#### Notes

- **Security**: Always verify signatures. Never trust unverified manifests.
- **Key Formats**: Supports DER (Buffer), PEM (string), or hex (string).
- **Performance**: ~30ms for typical manifests, ~150ms for 1,000+ assets.

---

### `packEcoFromEcoX()`

Generates a public `.eco` preview from a signed `.ecox` manifest (for auditing/sharing).

#### Signature

```typescript
function packEcoFromEcoX(
  manifest: EcoManifest,
  signature: string
): ArrayBuffer
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `manifest` | `EcoManifest` | The unpacked manifest from `.ecox` |
| `signature` | `string` | The base64 signature from `manifest.signatures[0].signature` |

#### Returns

`ArrayBuffer` - The `.eco` file (public preview, no asset data).

#### Example

```typescript
import { unpack, packEcoFromEcoX } from '@temporaldynamics/eco-packer';
import fs from 'fs';

// Unpack the original .ecox
const ecoBuffer = fs.readFileSync('project.ecox');
const manifest = await unpack(ecoBuffer, { publicKey });

// Generate public preview
const ecoPreview = packEcoFromEcoX(
  manifest,
  manifest.signatures[0].signature
);

// Save for sharing
fs.writeFileSync('project.eco', Buffer.from(ecoPreview));
console.log('✅ Public preview created: project.eco');
```

#### Use Cases

1. **Public Auditing**: Share signed manifests without exposing assets.
2. **Content-Addressable Storage**: Store manifests separately from assets.
3. **Verification Portals**: Allow users to verify signatures without downloading full `.ecox`.

#### Notes

- **No Assets**: `.eco` files contain ONLY the manifest and signature.
- **Signature Preservation**: Original signature is preserved for verification.
- **Small File Size**: Typically <10KB (vs. full `.ecox` with assets).

---

## Cryptographic Functions

### `generateEd25519KeyPair()`

Generates a new Ed25519 key pair for signing manifests.

#### Signature

```typescript
function generateEd25519KeyPair(): {
  privateKey: Buffer;
  publicKey: Buffer;
}
```

#### Returns

```typescript
{
  privateKey: Buffer;  // DER format, 48 bytes
  publicKey: Buffer;   // DER format, 44 bytes
}
```

#### Example

```typescript
import { generateEd25519KeyPair } from '@temporaldynamics/eco-packer';
import fs from 'fs';

const { privateKey, publicKey } = generateEd25519KeyPair();

// Save keys securely
fs.writeFileSync('private.key', privateKey, { mode: 0o600 }); // Unix: rw-------
fs.writeFileSync('public.key', publicKey);

console.log('✅ Keys generated');
console.log(`Private: ${privateKey.toString('hex')}`);
console.log(`Public: ${publicKey.toString('hex')}`);
```

#### Security Notes

- **Private Key Storage**: Store in secure vaults (AWS KMS, HashiCorp Vault, etc.).
- **Key Rotation**: Rotate keys annually or after suspected compromise.
- **Multi-Tenancy**: Use separate key pairs per tenant for isolation.

---

### `signManifestEd25519()`

Signs a canonicalized manifest with an Ed25519 private key.

#### Signature

```typescript
function signManifestEd25519(
  canonicalJson: string,
  privateKey: Buffer
): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `canonicalJson` | `string` | The canonicalized JSON manifest (from `canonicalizeJSON()`) |
| `privateKey` | `Buffer` | Ed25519 private key (DER format, 48 bytes) |

#### Returns

`string` - Base64-encoded signature (86 characters).

#### Example

```typescript
import { signManifestEd25519, canonicalizeJSON } from '@temporaldynamics/eco-packer';

const manifest = { version: '1.1.0', projectId: 'test' };
const canonical = canonicalizeJSON(manifest);
const signature = signManifestEd25519(canonical, privateKey);

console.log(`Signature: ${signature}`);
// Output: "MEUCIQDx7... (86 chars)"
```

#### Notes

- **Canonicalization Required**: Always canonicalize before signing to ensure deterministic output.
- **Algorithm**: Uses Ed25519 (RFC 8032) via Node.js `crypto.sign()`.

---

### `verifyManifestEd25519()`

Verifies an Ed25519 signature against a canonicalized manifest.

#### Signature

```typescript
function verifyManifestEd25519(
  canonicalJson: string,
  signature: string,
  publicKey: Buffer
): boolean
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `canonicalJson` | `string` | The canonicalized JSON manifest |
| `signature` | `string` | Base64-encoded signature (86 chars) |
| `publicKey` | `Buffer` | Ed25519 public key (DER format, 44 bytes) |

#### Returns

`boolean` - `true` if signature is valid, `false` otherwise.

#### Example

```typescript
import { verifyManifestEd25519, canonicalizeJSON } from '@temporaldynamics/eco-packer';

const manifest = { version: '1.1.0', projectId: 'test' };
const canonical = canonicalizeJSON(manifest);
const isValid = verifyManifestEd25519(canonical, signature, publicKey);

if (isValid) {
  console.log('✅ Signature verified!');
} else {
  console.error('❌ Invalid signature!');
  throw new SignatureError('Signature verification failed');
}
```

#### Security Notes

- **Constant-Time Comparison**: Uses `crypto.verify()` to prevent timing attacks.
- **Public Key Validation**: Validates key format before verification.

---

## Hash Functions

### `sha256Hex()`

Calculates SHA-256 hash of binary data (for asset integrity verification).

#### Signature

```typescript
function sha256Hex(data: Buffer | Uint8Array | string): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `Buffer \| Uint8Array \| string` | The data to hash (strings are UTF-8 encoded) |

#### Returns

`string` - Lowercase hex hash (64 characters).

#### Example

```typescript
import { sha256Hex } from '@temporaldynamics/eco-packer';
import fs from 'fs';

// Hash file
const videoData = fs.readFileSync('video.mp4');
const hash = sha256Hex(videoData);
console.log(`Hash: ${hash}`);
// Output: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

// Hash string
const textHash = sha256Hex('Hello, World!');
console.log(`Text hash: ${textHash}`);
```

#### Notes

- **Streaming**: For large files (>1GB), consider streaming APIs (not yet implemented).
- **Case**: Always returns lowercase hex (per convention).

---

### `validateAssetHash()`

Validates that an asset hash matches the expected format.

#### Signature

```typescript
function validateAssetHash(hash: string): boolean
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `hash` | `string` | The hash to validate |

#### Returns

`boolean` - `true` if valid SHA-256 hex (64 chars, lowercase), `false` otherwise.

#### Example

```typescript
import { validateAssetHash } from '@temporaldynamics/eco-packer';

const valid = validateAssetHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
console.log(valid); // true

const invalid = validateAssetHash('not-a-hash');
console.log(invalid); // false
```

---

## Validation Functions

### `validateManifest()`

Validates a manifest against the JSON Schema.

#### Signature

```typescript
function validateManifest(manifest: any): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `manifest` | `any` | The manifest object to validate |

#### Throws

`ManifestValidationError` - If validation fails (with detailed error messages).

#### Example

```typescript
import { validateManifest, ManifestValidationError } from '@temporaldynamics/eco-packer';

try {
  validateManifest({
    version: '1.1.0',
    projectId: 'test',
    assets: [],
    segments: []
  });
  console.log('✅ Manifest valid');
} catch (err) {
  if (err instanceof ManifestValidationError) {
    console.error('❌ Validation failed:', err.message);
    console.error('Details:', err.details);
  }
}
```

#### Schema Requirements

```typescript
{
  version: string;              // Semver (e.g., "1.1.0")
  projectId: string;            // Unique project ID
  createdBy?: string;           // Creator identifier
  createdAt?: string;           // ISO 8601 timestamp
  assets: EcoAsset[];           // Array of assets
  segments: EcoSegment[];       // Array of timeline segments
  metadata?: Record<string, any>; // Optional custom metadata
  operationLog?: Array<{ ... }>;  // Optional edit history
}
```

---

### `validateProject()`

Validates that a project structure is complete and internally consistent.

#### Signature

```typescript
function validateProject(project: EcoProject): void
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `project` | `EcoProject` | The project to validate |

#### Throws

`ManifestValidationError` - If validation fails.

#### Checks

1. **Asset References**: All segments reference existing assets.
2. **Time Ranges**: `startTime < endTime` for all segments.
3. **Durations**: Segment times don't exceed asset durations.
4. **Order**: Segment orders are unique and sequential.

#### Example

```typescript
import { validateProject } from '@temporaldynamics/eco-packer';

const project: EcoProject = {
  version: '1.1.0',
  projectId: 'test',
  assets: [
    { assetId: 'a1', type: 'video', source: 'video.mp4', duration: 100 }
  ],
  segments: [
    { segmentId: 's1', assetId: 'a1', startTime: 0, endTime: 10, order: 0 }
  ]
};

validateProject(project); // Passes

// This would fail:
project.segments[0].assetId = 'nonexistent';
validateProject(project); // Throws ManifestValidationError
```

---

### `sanitizeFileName()`

Sanitizes file names to prevent path traversal attacks.

#### Signature

```typescript
function sanitizeFileName(fileName: string): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fileName` | `string` | The file name to sanitize |

#### Returns

`string` - Sanitized file name (or throws on malicious input).

#### Throws

`PathTraversalError` - If the file name contains dangerous patterns.

#### Example

```typescript
import { sanitizeFileName, PathTraversalError } from '@temporaldynamics/eco-packer';

// Safe names
console.log(sanitizeFileName('video.mp4'));      // "video.mp4"
console.log(sanitizeFileName('sub/dir/file.txt')); // "sub/dir/file.txt"

// Dangerous names (throw)
try {
  sanitizeFileName('../etc/passwd');
} catch (err) {
  console.error('❌ Path traversal detected:', err.message);
}
```

#### Blocked Patterns

- `../` or `..\` (parent directory traversal)
- Absolute paths (`/`, `C:\`)
- Null bytes (`\0`)
- Control characters (`\x00`-`\x1F`)

---

## Utility Functions

### `canonicalizeJSON()`

Produces deterministic JSON output (sorted keys, stable arrays).

#### Signature

```typescript
function canonicalizeJSON(obj: any): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `obj` | `any` | The object to canonicalize |

#### Returns

`string` - Canonicalized JSON string (deterministic).

#### Example

```typescript
import { canonicalizeJSON } from '@temporaldynamics/eco-packer';

const obj = {
  z: 3,
  a: 1,
  m: [{ id: 2 }, { id: 1 }]
};

const canonical = canonicalizeJSON(obj);
console.log(canonical);
// Output: {"a":1,"m":[{"id":1},{"id":2}],"z":3}
```

#### Canonicalization Rules

1. **Object Keys**: Sorted alphabetically.
2. **Arrays**: Sorted by `id`, `assetId`, `segmentId`, or `order` (if present).
3. **Nested Objects**: Recursively canonicalized.
4. **Numbers**: Preserved as-is (no scientific notation).

---

### `parsePublicKey()`

Parses a public key from multiple formats (DER, PEM, hex).

#### Signature

```typescript
function parsePublicKey(key: Buffer | string): Buffer
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `Buffer \| string` | The public key (DER Buffer, PEM string, or hex string) |

#### Returns

`Buffer` - The public key in DER format (44 bytes for Ed25519).

#### Example

```typescript
import { parsePublicKey } from '@temporaldynamics/eco-packer';

// DER format (Buffer)
const derKey = Buffer.from('302a300506...', 'hex');
const parsed1 = parsePublicKey(derKey);

// PEM format (string)
const pemKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;
const parsed2 = parsePublicKey(pemKey);

// Hex format (string)
const hexKey = '302a300506032b6570032100...';
const parsed3 = parsePublicKey(hexKey);

console.log(parsed1.equals(parsed2)); // true (if same key)
```

---

## Error Classes

### `ManifestValidationError`

Thrown when manifest structure is invalid.

```typescript
class ManifestValidationError extends Error {
  details?: any; // Optional validation error details
}
```

**Example**:
```typescript
throw new ManifestValidationError(
  'Invalid manifest: missing required field "projectId"',
  { field: 'projectId', expected: 'string' }
);
```

---

### `HashValidationError`

Thrown when asset hash validation fails.

```typescript
class HashValidationError extends Error {
  assetId?: string;
  expected?: string;
  actual?: string;
}
```

**Example**:
```typescript
throw new HashValidationError(
  'Hash mismatch for asset "video-001"',
  { assetId: 'video-001', expected: 'abc123...', actual: 'def456...' }
);
```

---

### `SignatureError`

Thrown when cryptographic operations fail.

```typescript
class SignatureError extends Error {
  keyId?: string;
}
```

**Example**:
```typescript
throw new SignatureError(
  'Signature verification failed for keyId "tenant-123"',
  { keyId: 'tenant-123' }
);
```

---

### `PathTraversalError`

Thrown when malicious file paths are detected.

```typescript
class PathTraversalError extends Error {
  path?: string;
}
```

**Example**:
```typescript
throw new PathTraversalError(
  'Path traversal detected: ../etc/passwd',
  { path: '../etc/passwd' }
);
```

---

## TypeScript Types

### `EcoProject`

```typescript
interface EcoProject {
  version: string;              // e.g., "1.1.0"
  projectId: string;            // Unique ID
  createdBy?: string;           // Creator
  createdAt?: string;           // ISO 8601
  assets: EcoAsset[];
  segments: EcoSegment[];
  metadata?: Record<string, any>;
  operationLog?: Array<{
    timestamp: string;
    operation: string;
    params: any;
  }>;
}
```

---

### `EcoAsset`

```typescript
interface EcoAsset {
  assetId: string;              // Unique ID
  type: 'video' | 'audio' | 'image' | 'text';
  source: string;               // Original source path
  duration?: number;            // Duration in seconds (for video/audio)
  metadata?: Record<string, any>; // Custom metadata
}
```

---

### `EcoSegment`

```typescript
interface EcoSegment {
  segmentId: string;            // Unique ID
  assetId: string;              // Reference to EcoAsset
  startTime: number;            // Start time in seconds
  endTime: number;              // End time in seconds
  order: number;                // Timeline order (0-based)
  effects?: Array<{
    type: string;
    params: any;
  }>;
}
```

---

### `EcoManifest`

```typescript
interface EcoManifest extends EcoProject {
  signatures: Array<{
    keyId: string;              // Key identifier
    signature: string;          // Base64 signature
    signedAt: string;           // ISO 8601 timestamp
    algorithm: 'Ed25519';
    valid: boolean;             // Verification result
  }>;
  assetHashes: Map<string, string>; // Asset ID → SHA-256 hash
}
```

---

### `PackOptions`

```typescript
interface PackOptions {
  privateKey: Buffer;           // Ed25519 private key (DER)
  keyId: string;                // Key identifier
  signerId?: string;            // Optional signer ID
  metadata?: Record<string, any>;
  compressionLevel?: number;    // 0-9 (default: 6)
}
```

---

### `UnpackerOptions`

```typescript
interface UnpackerOptions {
  publicKey: Buffer | string;   // Ed25519 public key
  expectedKeyId?: string;       // Enforce specific keyId
  verifyHashes?: boolean;       // Verify asset hashes (default: true)
  allowExpired?: boolean;       // Allow expired manifests (default: false)
}
```

---

## Performance Notes

| Operation | Time (typical) | Notes |
|-----------|---------------|-------|
| `pack()` | 50ms (100 assets) | Includes hashing + signing |
| `unpack()` | 30ms | Signature verification + parsing |
| `sha256Hex()` | 1ms (1MB file) | Node.js crypto (native) |
| `verifyManifestEd25519()` | 2ms | Ed25519 verification |

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed performance data.

---

## Version History

| Version | Release Date | Changes |
|---------|-------------|---------|
| 1.1.0 | 2025-11-09 | Multi-signature support, custom errors, security fixes |
| 1.0.0 | 2025-02-15 | Initial release |

---

**Last Updated**: November 10, 2025
**License**: MIT (Community) / Commercial (Professional/Enterprise)
**Author**: Temporal Dynamics LLC
