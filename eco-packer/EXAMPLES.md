# 🎓 eco-packer Examples

**Version**: 1.1.0
**Last Updated**: November 10, 2025

Real-world usage examples for `@temporaldynamics/eco-packer` - from basic operations to advanced enterprise workflows.

---

## 📋 Table of Contents

1. [Quickstart](#1-quickstart)
2. [Multi-Tenant Signing](#2-multi-tenant-signing)
3. [Batch Processing](#3-batch-processing)
4. [Cloud Storage Integration](#4-cloud-storage-integration)
5. [Streaming Large Files](#5-streaming-large-files)
6. [Multi-Signature Workflows](#6-multi-signature-workflows)
7. [Offline Verification](#7-offline-verification)
8. [Migrating from ZIP Archives](#8-migrating-from-zip-archives)
9. [Error Handling Best Practices](#9-error-handling-best-practices)
10. [Custom Validation Hooks](#10-custom-validation-hooks)
11. [Content-Addressable Storage](#11-content-addressable-storage)

---

## 1. Quickstart

**Goal**: Pack and unpack a simple project with one video asset.

```typescript
import {
  pack,
  unpack,
  generateEd25519KeyPair,
  sha256Hex
} from '@temporaldynamics/eco-packer';
import fs from 'fs';

// Step 1: Generate keys (do this once, store securely)
const { privateKey, publicKey } = generateEd25519KeyPair();
fs.writeFileSync('keys/private.key', privateKey, { mode: 0o600 });
fs.writeFileSync('keys/public.key', publicKey);

// Step 2: Define project
const project = {
  version: '1.1.0',
  projectId: 'my-first-project',
  createdBy: 'john@example.com',
  createdAt: new Date().toISOString(),
  assets: [
    {
      assetId: 'video-main',
      type: 'video' as const,
      source: 'uploads/gameplay.mp4',
      duration: 125.5,
      metadata: {
        codec: 'h264',
        resolution: '1920x1080',
        fps: 60
      }
    }
  ],
  segments: [
    {
      segmentId: 'intro',
      assetId: 'video-main',
      startTime: 0,
      endTime: 5.0,
      order: 0
    },
    {
      segmentId: 'main-action',
      assetId: 'video-main',
      startTime: 30.5,
      endTime: 45.2,
      order: 1
    }
  ],
  metadata: {
    title: 'Epic Gameplay Highlights',
    description: 'Best moments from last night\'s stream',
    tags: ['gaming', 'fps', 'highlights']
  }
};

// Step 3: Calculate asset hashes
const assetHashes = new Map();
const videoData = fs.readFileSync('uploads/gameplay.mp4');
assetHashes.set('video-main', sha256Hex(videoData));

// Step 4: Pack the project
const ecoBuffer = await pack(project, assetHashes, {
  privateKey,
  keyId: 'user-john-2025',
  signerId: 'john@example.com'
});

fs.writeFileSync('outputs/project.ecox', Buffer.from(ecoBuffer));
console.log('✅ Packed to project.ecox');

// Step 5: Unpack and verify
const unpackedManifest = await unpack(
  fs.readFileSync('outputs/project.ecox'),
  {
    publicKey,
    expectedKeyId: 'user-john-2025'
  }
);

console.log('✅ Signature verified!');
console.log(`Project: ${unpackedManifest.projectId}`);
console.log(`Assets: ${unpackedManifest.assets.length}`);
console.log(`Segments: ${unpackedManifest.segments.length}`);
console.log(`Signed at: ${unpackedManifest.signatures[0].signedAt}`);
```

**Output**:
```
✅ Packed to project.ecox
✅ Signature verified!
Project: my-first-project
Assets: 1
Segments: 2
Signed at: 2025-11-10T14:32:45.123Z
```

---

## 2. Multi-Tenant Signing

**Goal**: Isolate signing keys per tenant in a SaaS environment.

```typescript
import { pack, unpack, generateEd25519KeyPair } from '@temporaldynamics/eco-packer';
import { getSecrets } from './vault'; // Your secret manager

interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
}

class MultiTenantPacker {
  private keyCache = new Map<string, { privateKey: Buffer; publicKey: Buffer }>();

  async getKeys(tenantId: string) {
    // Check cache first
    if (this.keyCache.has(tenantId)) {
      return this.keyCache.get(tenantId)!;
    }

    // Load from secure vault (AWS KMS, HashiCorp Vault, etc.)
    const secrets = await getSecrets(`tenant/${tenantId}/keys`);

    if (!secrets.privateKey) {
      // Generate new keys for tenant
      const keys = generateEd25519KeyPair();
      await this.storeKeys(tenantId, keys);
      return keys;
    }

    const keys = {
      privateKey: Buffer.from(secrets.privateKey, 'hex'),
      publicKey: Buffer.from(secrets.publicKey, 'hex')
    };

    this.keyCache.set(tenantId, keys);
    return keys;
  }

  async storeKeys(tenantId: string, keys: { privateKey: Buffer; publicKey: Buffer }) {
    // Store in vault with rotation policy
    await putSecrets(`tenant/${tenantId}/keys`, {
      privateKey: keys.privateKey.toString('hex'),
      publicKey: keys.publicKey.toString('hex'),
      createdAt: new Date().toISOString(),
      rotateAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  async packForTenant(tenant: Tenant, project: any, assetHashes: Map<string, string>) {
    const { privateKey } = await this.getKeys(tenant.id);

    // Enforce plan limits
    if (tenant.plan === 'free' && project.assets.length > 100) {
      throw new Error('Free plan limited to 100 assets. Upgrade to Pro.');
    }

    return await pack(project, assetHashes, {
      privateKey,
      keyId: `tenant-${tenant.id}-prod`,
      signerId: tenant.name,
      metadata: {
        tenantId: tenant.id,
        plan: tenant.plan,
        environment: 'production'
      }
    });
  }

  async verifyForTenant(tenantId: string, ecoFile: Buffer) {
    const { publicKey } = await this.getKeys(tenantId);

    return await unpack(ecoFile, {
      publicKey,
      expectedKeyId: `tenant-${tenantId}-prod`
    });
  }
}

// Usage
const packer = new MultiTenantPacker();

const tenant: Tenant = {
  id: 'tenant-acme-corp',
  name: 'ACME Corp',
  plan: 'enterprise'
};

const ecoBuffer = await packer.packForTenant(tenant, project, assetHashes);
const manifest = await packer.verifyForTenant(tenant.id, ecoBuffer);

console.log(`✅ Packed for tenant: ${tenant.name}`);
console.log(`   Plan: ${tenant.plan}`);
console.log(`   Assets: ${manifest.assets.length}`);
```

---

## 3. Batch Processing

**Goal**: Process 1,000+ projects in parallel with rate limiting.

```typescript
import { pack, sha256Hex } from '@temporaldynamics/eco-packer';
import pLimit from 'p-limit';
import fs from 'fs/promises';
import path from 'path';

interface BatchJob {
  projectPath: string;
  outputPath: string;
}

class BatchPacker {
  private concurrency: number;
  private limit: ReturnType<typeof pLimit>;

  constructor(concurrency = 10) {
    this.concurrency = concurrency;
    this.limit = pLimit(concurrency);
  }

  async processProject(job: BatchJob, privateKey: Buffer): Promise<void> {
    // Read project JSON
    const projectJson = await fs.readFile(job.projectPath, 'utf-8');
    const project = JSON.parse(projectJson);

    // Calculate hashes for all assets
    const assetHashes = new Map<string, string>();
    for (const asset of project.assets) {
      const assetPath = path.join(path.dirname(job.projectPath), asset.source);
      const assetData = await fs.readFile(assetPath);
      assetHashes.set(asset.assetId, sha256Hex(assetData));
    }

    // Pack
    const ecoBuffer = await pack(project, assetHashes, {
      privateKey,
      keyId: `batch-${new Date().toISOString().split('T')[0]}`,
      metadata: {
        processedAt: new Date().toISOString(),
        batchId: job.projectPath
      }
    });

    // Write output
    await fs.writeFile(job.outputPath, Buffer.from(ecoBuffer));
  }

  async processBatch(jobs: BatchJob[], privateKey: Buffer): Promise<void> {
    const startTime = Date.now();
    let processed = 0;
    let failed = 0;

    const promises = jobs.map(job =>
      this.limit(async () => {
        try {
          await this.processProject(job, privateKey);
          processed++;
          if (processed % 100 === 0) {
            console.log(`✅ Processed ${processed}/${jobs.length}`);
          }
        } catch (err) {
          failed++;
          console.error(`❌ Failed: ${job.projectPath}`, err);
        }
      })
    );

    await Promise.all(promises);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n📊 Batch Complete:`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Rate: ${(processed / parseFloat(duration)).toFixed(2)} projects/sec`);
  }
}

// Usage
const batcher = new BatchPacker(20); // 20 concurrent workers

const jobs: BatchJob[] = [
  { projectPath: 'input/project1.json', outputPath: 'output/project1.ecox' },
  { projectPath: 'input/project2.json', outputPath: 'output/project2.ecox' },
  // ... 1,000 more
];

await batcher.processBatch(jobs, privateKey);
```

**Output**:
```
✅ Processed 100/1000
✅ Processed 200/1000
...
✅ Processed 1000/1000

📊 Batch Complete:
   Processed: 987
   Failed: 13
   Duration: 45.23s
   Rate: 21.81 projects/sec
```

---

## 4. Cloud Storage Integration

**Goal**: Upload `.ecox` files to S3 with pre-signed URLs.

```typescript
import { pack } from '@temporaldynamics/eco-packer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

async function packAndUpload(
  project: any,
  assetHashes: Map<string, string>,
  privateKey: Buffer,
  bucketName: string
): Promise<string> {

  // Pack the project
  const ecoBuffer = await pack(project, assetHashes, {
    privateKey,
    keyId: 'cloud-prod-2025',
    metadata: {
      uploadedAt: new Date().toISOString(),
      environment: 'production'
    }
  });

  // Generate S3 key
  const s3Key = `projects/${project.projectId}/${Date.now()}.ecox`;

  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: Buffer.from(ecoBuffer),
    ContentType: 'application/x-ecox',
    Metadata: {
      'project-id': project.projectId,
      'created-by': project.createdBy || 'unknown'
    },
    ServerSideEncryption: 'AES256'
  }));

  // Generate pre-signed URL (valid for 1 hour)
  const downloadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    }),
    { expiresIn: 3600 }
  );

  console.log(`✅ Uploaded to S3: s3://${bucketName}/${s3Key}`);
  return downloadUrl;
}

// Usage
const downloadUrl = await packAndUpload(
  project,
  assetHashes,
  privateKey,
  'my-ecox-bucket'
);

console.log(`🔗 Download URL: ${downloadUrl}`);
// Share with users or embed in emails
```

---

## 5. Streaming Large Files

**Goal**: Hash large video files (>1GB) without loading into memory.

```typescript
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

async function sha256Stream(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 }); // 64KB chunks

  await pipeline(stream, hash);

  return hash.digest('hex');
}

// Usage with eco-packer
import { pack } from '@temporaldynamics/eco-packer';

const project = {
  version: '1.1.0',
  projectId: 'large-project',
  assets: [
    {
      assetId: 'huge-video',
      type: 'video' as const,
      source: 'uploads/4k-footage.mp4',
      duration: 3600 // 1 hour
    }
  ],
  segments: [
    { segmentId: 's1', assetId: 'huge-video', startTime: 0, endTime: 60, order: 0 }
  ]
};

// Stream hash (doesn't load entire file into memory)
const assetHashes = new Map();
console.log('📊 Hashing large file...');
const hash = await sha256Stream('uploads/4k-footage.mp4');
assetHashes.set('huge-video', hash);
console.log(`✅ Hash: ${hash}`);

// Pack normally
const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId: 'large-prod' });
```

---

## 6. Multi-Signature Workflows

**Goal**: Implement co-signing (e.g., author + reviewer approval).

```typescript
import {
  pack,
  unpack,
  signManifestEd25519,
  canonicalizeJSON
} from '@temporaldynamics/eco-packer';

interface Signer {
  name: string;
  role: string;
  privateKey: Buffer;
  publicKey: Buffer;
}

async function multiSignPack(
  project: any,
  assetHashes: Map<string, string>,
  signers: Signer[]
): Promise<ArrayBuffer> {

  if (signers.length === 0) {
    throw new Error('At least one signer required');
  }

  // First signer creates the initial pack
  const primarySigner = signers[0];
  const ecoBuffer = await pack(project, assetHashes, {
    privateKey: primarySigner.privateKey,
    keyId: `${primarySigner.role}-${primarySigner.name}`,
    signerId: primarySigner.name,
    metadata: {
      signerRole: primarySigner.role,
      signedAt: new Date().toISOString()
    }
  });

  // Additional signers co-sign the manifest
  const manifest = await unpack(ecoBuffer, {
    publicKey: primarySigner.publicKey
  });

  const canonical = canonicalizeJSON(manifest);

  for (let i = 1; i < signers.length; i++) {
    const signer = signers[i];
    const signature = signManifestEd25519(canonical, signer.privateKey);

    manifest.signatures.push({
      keyId: `${signer.role}-${signer.name}`,
      signature,
      signedAt: new Date().toISOString(),
      algorithm: 'Ed25519',
      valid: true // Will be verified on unpack
    });

    console.log(`✅ Co-signed by: ${signer.name} (${signer.role})`);
  }

  // Re-pack with all signatures
  // (In production, you'd implement a custom multi-sig pack function)
  return ecoBuffer; // Simplified for example
}

// Usage
const signers: Signer[] = [
  {
    name: 'Alice',
    role: 'author',
    privateKey: alicePrivateKey,
    publicKey: alicePublicKey
  },
  {
    name: 'Bob',
    role: 'reviewer',
    privateKey: bobPrivateKey,
    publicKey: bobPublicKey
  },
  {
    name: 'Carol',
    role: 'manager',
    privateKey: carolPrivateKey,
    publicKey: carolPublicKey
  }
];

const multiSignedEco = await multiSignPack(project, assetHashes, signers);
console.log('✅ Multi-signature complete (3 signers)');
```

---

## 7. Offline Verification

**Goal**: Verify `.ecox` files without network access (air-gapped systems).

```typescript
import { unpack, verifyManifestEd25519, canonicalizeJSON } from '@temporaldynamics/eco-packer';
import fs from 'fs';
import path from 'path';

interface OfflineVerifier {
  trustedKeys: Map<string, Buffer>; // keyId → publicKey
  verificationLog: Array<{
    timestamp: string;
    file: string;
    result: 'valid' | 'invalid';
    keyId: string;
  }>;
}

const verifier: OfflineVerifier = {
  trustedKeys: new Map(),
  verificationLog: []
};

// Load trusted keys from local keystore
function loadTrustedKeys(keystoreDir: string) {
  const keyFiles = fs.readdirSync(keystoreDir);

  for (const keyFile of keyFiles) {
    if (keyFile.endsWith('.pub')) {
      const keyId = path.basename(keyFile, '.pub');
      const publicKey = fs.readFileSync(path.join(keystoreDir, keyFile));
      verifier.trustedKeys.set(keyId, publicKey);
      console.log(`✅ Loaded trusted key: ${keyId}`);
    }
  }
}

async function verifyOffline(ecoFilePath: string): Promise<boolean> {
  const ecoBuffer = fs.readFileSync(ecoFilePath);

  try {
    // Extract manifest without network
    const manifest = await unpack(ecoBuffer, {
      publicKey: Buffer.alloc(44), // Dummy key for initial parse
      verifyHashes: false // Skip hash verification (no asset access)
    });

    // Manual signature verification
    const keyId = manifest.signatures[0].keyId;
    const publicKey = verifier.trustedKeys.get(keyId);

    if (!publicKey) {
      console.error(`❌ Unknown key: ${keyId}`);
      verifier.verificationLog.push({
        timestamp: new Date().toISOString(),
        file: ecoFilePath,
        result: 'invalid',
        keyId
      });
      return false;
    }

    const canonical = canonicalizeJSON({
      ...manifest,
      signatures: undefined // Remove signatures for verification
    });

    const isValid = verifyManifestEd25519(
      canonical,
      manifest.signatures[0].signature,
      publicKey
    );

    verifier.verificationLog.push({
      timestamp: new Date().toISOString(),
      file: ecoFilePath,
      result: isValid ? 'valid' : 'invalid',
      keyId
    });

    if (isValid) {
      console.log(`✅ Valid signature from ${keyId}`);
    } else {
      console.error(`❌ Invalid signature from ${keyId}`);
    }

    return isValid;

  } catch (err) {
    console.error(`❌ Verification failed:`, err);
    return false;
  }
}

// Usage
loadTrustedKeys('./keystore');

const files = [
  'project1.ecox',
  'project2.ecox',
  'project3.ecox'
];

for (const file of files) {
  await verifyOffline(file);
}

// Export verification log
fs.writeFileSync('verification-log.json', JSON.stringify(verifier.verificationLog, null, 2));
console.log(`📝 Verification log: verification-log.json`);
```

---

## 8. Migrating from ZIP Archives

**Goal**: Convert legacy ZIP projects to signed `.ecox` format.

```typescript
import { pack, sha256Hex } from '@temporaldynamics/eco-packer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

interface LegacyProject {
  name: string;
  created: string;
  files: Array<{
    name: string;
    path: string;
  }>;
}

async function migrateLegacyZip(
  zipPath: string,
  privateKey: Buffer,
  outputPath: string
): Promise<void> {

  console.log(`📦 Migrating: ${zipPath}`);

  // Extract legacy ZIP
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();

  // Find metadata.json
  const metadataEntry = zipEntries.find(e => e.entryName === 'metadata.json');
  if (!metadataEntry) {
    throw new Error('No metadata.json found in legacy ZIP');
  }

  const legacyProject: LegacyProject = JSON.parse(
    metadataEntry.getData().toString('utf-8')
  );

  // Build new EcoProject
  const assets = legacyProject.files.map((file, i) => ({
    assetId: `asset-${i}`,
    type: path.extname(file.name).includes('mp4') ? 'video' : 'image' as const,
    source: file.path,
    metadata: {
      originalName: file.name,
      migratedFrom: 'legacy-zip'
    }
  }));

  const project = {
    version: '1.1.0',
    projectId: `migrated-${path.basename(zipPath, '.zip')}`,
    createdBy: 'migration-script',
    createdAt: legacyProject.created,
    assets,
    segments: assets.map((asset, i) => ({
      segmentId: `seg-${i}`,
      assetId: asset.assetId,
      startTime: 0,
      endTime: 10, // Default duration
      order: i
    })),
    metadata: {
      originalName: legacyProject.name,
      migratedAt: new Date().toISOString()
    }
  };

  // Calculate hashes for all files
  const assetHashes = new Map<string, string>();
  for (let i = 0; i < legacyProject.files.length; i++) {
    const file = legacyProject.files[i];
    const entry = zipEntries.find(e => e.entryName === file.path);
    if (entry) {
      const data = entry.getData();
      assetHashes.set(`asset-${i}`, sha256Hex(data));
    }
  }

  // Pack as .ecox
  const ecoBuffer = await pack(project, assetHashes, {
    privateKey,
    keyId: 'migration-2025',
    metadata: {
      migrationSource: 'legacy-zip',
      migrationDate: new Date().toISOString()
    }
  });

  fs.writeFileSync(outputPath, Buffer.from(ecoBuffer));
  console.log(`✅ Migrated to: ${outputPath}`);
}

// Batch migration
const legacyZips = fs.readdirSync('legacy-projects').filter(f => f.endsWith('.zip'));

for (const zipFile of legacyZips) {
  const inputPath = path.join('legacy-projects', zipFile);
  const outputPath = path.join('migrated', zipFile.replace('.zip', '.ecox'));

  await migrateLegacyZip(inputPath, privateKey, outputPath);
}

console.log(`✅ Migrated ${legacyZips.length} projects`);
```

---

## 9. Error Handling Best Practices

**Goal**: Robust error handling for production systems.

```typescript
import {
  pack,
  unpack,
  ManifestValidationError,
  HashValidationError,
  SignatureError,
  PathTraversalError
} from '@temporaldynamics/eco-packer';

async function robustPack(
  project: any,
  assetHashes: Map<string, string>,
  privateKey: Buffer
): Promise<ArrayBuffer | null> {

  try {
    return await pack(project, assetHashes, {
      privateKey,
      keyId: 'prod-key',
      compressionLevel: 9
    });

  } catch (err) {
    if (err instanceof ManifestValidationError) {
      console.error('❌ Invalid project structure:', err.message);
      console.error('   Details:', err.details);

      // Log to monitoring service
      await logError('manifest_validation', {
        projectId: project.projectId,
        error: err.message,
        details: err.details
      });

      return null;

    } else if (err instanceof HashValidationError) {
      console.error('❌ Asset hash validation failed:', err.message);
      console.error(`   Asset: ${err.assetId}`);
      console.error(`   Expected: ${err.expected}`);
      console.error(`   Actual: ${err.actual}`);

      // Retry with recalculated hash
      const assetPath = project.assets.find(a => a.assetId === err.assetId)?.source;
      if (assetPath) {
        console.log('🔄 Recalculating hash...');
        const data = fs.readFileSync(assetPath);
        assetHashes.set(err.assetId!, sha256Hex(data));
        return robustPack(project, assetHashes, privateKey); // Retry
      }

      return null;

    } else if (err instanceof SignatureError) {
      console.error('❌ Cryptographic error:', err.message);
      console.error(`   Key ID: ${err.keyId}`);

      // Alert security team
      await alertSecurity('signature_failure', {
        keyId: err.keyId,
        timestamp: new Date().toISOString()
      });

      return null;

    } else {
      console.error('❌ Unexpected error:', err);
      throw err; // Re-throw unknown errors
    }
  }
}

async function robustUnpack(
  ecoFile: Buffer,
  publicKey: Buffer
): Promise<any | null> {

  try {
    return await unpack(ecoFile, {
      publicKey,
      verifyHashes: true
    });

  } catch (err) {
    if (err instanceof SignatureError) {
      console.error('❌ Signature verification failed!');
      console.error('   This file may be tampered or corrupted.');

      // Quarantine the file
      await quarantineFile(ecoFile);

      return null;

    } else if (err instanceof PathTraversalError) {
      console.error('❌ SECURITY ALERT: Path traversal detected!');
      console.error(`   Malicious path: ${err.path}`);

      // Alert security team immediately
      await alertSecurity('path_traversal_attempt', {
        path: err.path,
        timestamp: new Date().toISOString()
      });

      return null;

    } else if (err instanceof ManifestValidationError) {
      console.error('❌ Manifest validation failed:', err.message);
      return null;

    } else {
      console.error('❌ Unexpected error:', err);
      throw err;
    }
  }
}

// Helper functions (implement based on your infrastructure)
async function logError(type: string, data: any) {
  // Send to monitoring service (Datadog, Sentry, etc.)
}

async function alertSecurity(eventType: string, data: any) {
  // Send to security team (PagerDuty, Slack, etc.)
}

async function quarantineFile(file: Buffer) {
  // Move to quarantine storage
}
```

---

## 10. Custom Validation Hooks

**Goal**: Add custom business logic validation before packing.

```typescript
import { pack, validateProject } from '@temporaldynamics/eco-packer';

interface ValidationHook {
  name: string;
  validate: (project: any) => Promise<void>;
}

class CustomValidator {
  private hooks: ValidationHook[] = [];

  addHook(hook: ValidationHook) {
    this.hooks.push(hook);
  }

  async validate(project: any): Promise<void> {
    // First, run standard validation
    validateProject(project);

    // Then, run custom hooks
    for (const hook of this.hooks) {
      console.log(`🔍 Running hook: ${hook.name}`);
      await hook.validate(project);
    }
  }
}

// Define custom hooks
const validator = new CustomValidator();

// Hook 1: Enforce naming conventions
validator.addHook({
  name: 'naming-conventions',
  validate: async (project) => {
    if (!/^[a-z0-9-]+$/.test(project.projectId)) {
      throw new Error('Project ID must be lowercase alphanumeric with hyphens');
    }

    for (const asset of project.assets) {
      if (!/^[a-z0-9-]+$/.test(asset.assetId)) {
        throw new Error(`Invalid asset ID: ${asset.assetId}`);
      }
    }
  }
});

// Hook 2: Check for required metadata
validator.addHook({
  name: 'required-metadata',
  validate: async (project) => {
    if (!project.metadata?.title) {
      throw new Error('Project must have a title');
    }

    if (!project.metadata?.description) {
      throw new Error('Project must have a description');
    }

    if (!project.metadata?.tags || project.metadata.tags.length === 0) {
      throw new Error('Project must have at least one tag');
    }
  }
});

// Hook 3: Validate asset durations
validator.addHook({
  name: 'duration-check',
  validate: async (project) => {
    for (const segment of project.segments) {
      const asset = project.assets.find(a => a.assetId === segment.assetId);

      if (!asset) {
        throw new Error(`Segment references unknown asset: ${segment.assetId}`);
      }

      if (asset.duration && segment.endTime > asset.duration) {
        throw new Error(
          `Segment ${segment.segmentId} exceeds asset duration ` +
          `(${segment.endTime}s > ${asset.duration}s)`
        );
      }
    }
  }
});

// Hook 4: Business rule - max 5 segments for free tier
validator.addHook({
  name: 'tier-limits',
  validate: async (project) => {
    const userTier = getUserTier(project.createdBy); // Your function

    if (userTier === 'free' && project.segments.length > 5) {
      throw new Error('Free tier limited to 5 segments. Upgrade to Pro.');
    }
  }
});

// Usage
async function packWithValidation(
  project: any,
  assetHashes: Map<string, string>,
  privateKey: Buffer
): Promise<ArrayBuffer> {

  // Run all validation hooks
  await validator.validate(project);

  console.log('✅ All validation hooks passed');

  // Pack the project
  return await pack(project, assetHashes, {
    privateKey,
    keyId: 'validated-prod'
  });
}

// Example
try {
  const ecoBuffer = await packWithValidation(project, assetHashes, privateKey);
  console.log('✅ Packed successfully');
} catch (err) {
  console.error('❌ Validation failed:', err.message);
}
```

---

## 11. Content-Addressable Storage

**Goal**: Store manifests and assets separately using content hashes.

```typescript
import { pack, unpack, packEcoFromEcoX, sha256Hex } from '@temporaldynamics/eco-packer';
import fs from 'fs';
import path from 'path';

class ContentAddressableStore {
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    fs.mkdirSync(path.join(storageDir, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(storageDir, 'manifests'), { recursive: true });
  }

  // Store an asset by its hash
  async storeAsset(assetId: string, data: Buffer): Promise<string> {
    const hash = sha256Hex(data);
    const assetPath = path.join(this.storageDir, 'assets', hash);

    if (!fs.existsSync(assetPath)) {
      fs.writeFileSync(assetPath, data);
      console.log(`✅ Stored asset ${assetId}: ${hash}`);
    } else {
      console.log(`⏩ Asset ${assetId} already exists: ${hash}`);
    }

    return hash;
  }

  // Retrieve an asset by hash
  async getAsset(hash: string): Promise<Buffer | null> {
    const assetPath = path.join(this.storageDir, 'assets', hash);

    if (fs.existsSync(assetPath)) {
      return fs.readFileSync(assetPath);
    }

    return null;
  }

  // Store a manifest by its signature
  async storeManifest(manifest: any, signature: string): Promise<string> {
    const manifestHash = sha256Hex(JSON.stringify(manifest));
    const manifestPath = path.join(this.storageDir, 'manifests', manifestHash);

    const publicEco = packEcoFromEcoX(manifest, signature);
    fs.writeFileSync(manifestPath, Buffer.from(publicEco));

    console.log(`✅ Stored manifest: ${manifestHash}`);
    return manifestHash;
  }

  // Retrieve a manifest by hash
  async getManifest(hash: string, publicKey: Buffer): Promise<any | null> {
    const manifestPath = path.join(this.storageDir, 'manifests', hash);

    if (fs.existsSync(manifestPath)) {
      const ecoData = fs.readFileSync(manifestPath);
      return await unpack(ecoData, { publicKey });
    }

    return null;
  }

  // Pack and store a complete project
  async packAndStore(
    project: any,
    assetFiles: Map<string, Buffer>,
    privateKey: Buffer,
    publicKey: Buffer
  ): Promise<{ manifestHash: string; assetHashes: string[] }> {

    // Store all assets
    const assetHashes = new Map<string, string>();
    const storedHashes: string[] = [];

    for (const [assetId, data] of assetFiles.entries()) {
      const hash = await this.storeAsset(assetId, data);
      assetHashes.set(assetId, hash);
      storedHashes.push(hash);
    }

    // Pack the project
    const ecoBuffer = await pack(project, assetHashes, {
      privateKey,
      keyId: 'cas-store'
    });

    // Unpack to get manifest
    const manifest = await unpack(ecoBuffer, { publicKey });

    // Store manifest
    const manifestHash = await this.storeManifest(
      manifest,
      manifest.signatures[0].signature
    );

    return {
      manifestHash,
      assetHashes: storedHashes
    };
  }

  // Reconstruct a project from CAS
  async reconstructProject(
    manifestHash: string,
    publicKey: Buffer
  ): Promise<{ manifest: any; assets: Map<string, Buffer> }> {

    // Retrieve manifest
    const manifest = await this.getManifest(manifestHash, publicKey);
    if (!manifest) {
      throw new Error(`Manifest not found: ${manifestHash}`);
    }

    // Retrieve all assets
    const assets = new Map<string, Buffer>();
    for (const [assetId, hash] of manifest.assetHashes.entries()) {
      const assetData = await this.getAsset(hash);
      if (assetData) {
        assets.set(assetId, assetData);
      } else {
        console.warn(`⚠️  Asset not found: ${hash}`);
      }
    }

    return { manifest, assets };
  }
}

// Usage
const store = new ContentAddressableStore('./cas-storage');

// Store a project
const assetFiles = new Map<string, Buffer>();
assetFiles.set('video-1', fs.readFileSync('video.mp4'));
assetFiles.set('audio-1', fs.readFileSync('audio.mp3'));

const { manifestHash, assetHashes } = await store.packAndStore(
  project,
  assetFiles,
  privateKey,
  publicKey
);

console.log(`✅ Stored project:`);
console.log(`   Manifest: ${manifestHash}`);
console.log(`   Assets: ${assetHashes.join(', ')}`);

// Later: Reconstruct the project
const { manifest, assets } = await store.reconstructProject(manifestHash, publicKey);

console.log(`✅ Reconstructed project:`);
console.log(`   Project ID: ${manifest.projectId}`);
console.log(`   Assets: ${assets.size}`);
```

---

## 📚 Additional Resources

- **[API Reference](./API.md)** - Complete function documentation
- **[Security Guide](./SECURITY.md)** - Threat model and best practices
- **[Benchmarks](./BENCHMARKS.md)** - Performance comparisons
- **[FAQ](./FAQ.md)** - Frequently asked questions

---

**Last Updated**: November 10, 2025
**License**: MIT (Community) / Commercial (Professional/Enterprise)
**Author**: Temporal Dynamics LLC
