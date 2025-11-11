# ❓ eco-packer FAQ

**Version**: 1.1.0
**Last Updated**: November 10, 2025

Frequently asked questions about `@temporaldynamics/eco-packer` - cryptographically signed asset packaging for VISTA NEO.

---

## 📋 Table of Contents

1. [General Questions](#general-questions)
2. [Technical Questions](#technical-questions)
3. [Security Questions](#security-questions)
4. [Licensing & Pricing](#licensing--pricing)
5. [Troubleshooting](#troubleshooting)
6. [Integration & Compatibility](#integration--compatibility)
7. [Performance & Scalability](#performance--scalability)

---

## General Questions

### What is eco-packer?

eco-packer is a **cryptographically signed asset packaging library** for VISTA NEO. It creates `.ecox` files that bundle project manifests with Ed25519 signatures for tamper-proof integrity verification.

**Key Features**:
- Ed25519 digital signatures
- SHA-256 asset hashing
- ZIP compression
- Multi-signature support
- TypeScript-first API

---

### What problem does it solve?

**Problem**: Video editing projects are vulnerable to tampering. Asset substitution, timeline manipulation, and metadata forgery can occur during storage, transmission, or collaboration.

**Solution**: eco-packer ensures:
1. **Integrity**: Detect any modification to assets or manifest
2. **Authenticity**: Verify the project creator
3. **Non-repudiation**: Cryptographic proof of authorship
4. **Auditability**: Immutable record of project state

---

### How is it different from regular ZIP files?

| Feature | ZIP | eco-packer |
|---------|-----|-----------|
| **Compression** | ✅ | ✅ |
| **Integrity** | ❌ (CRC32, weak) | ✅ (SHA-256) |
| **Signatures** | ❌ | ✅ (Ed25519) |
| **Tamper Detection** | ❌ | ✅ |
| **Multi-Signature** | ❌ | ✅ |
| **Manifest Validation** | ❌ | ✅ (JSON Schema) |

**Verdict**: eco-packer is a **secure ZIP alternative** for projects requiring cryptographic verification.

---

### Is it open source?

**Dual licensing**:
- ✅ **Community Edition**: MIT License (FREE, personal/open-source use)
- 💼 **Professional/Enterprise**: Commercial license (for commercial use)

See [LICENSE](./LICENSE) and [LICENSE-COMMERCIAL.md](./LICENSE-COMMERCIAL.md).

---

### Who maintains eco-packer?

**Temporal Dynamics LLC** - the company behind VISTA NEO.

- **Author**: Temporal Dynamics Engineering Team
- **Support**: support@temporaldynamics.com
- **Security**: security@temporaldynamics.com
- **GitHub**: https://github.com/temporal-dynamics/neo

---

## Technical Questions

### What cryptographic algorithms are used?

| Component | Algorithm | Key Size | Security Level |
|-----------|-----------|----------|----------------|
| **Signatures** | Ed25519 | 256-bit | 128-bit |
| **Hashing** | SHA-256 | N/A | 128-bit (collision resistance) |
| **Compression** | DEFLATE (ZIP) | N/A | Not cryptographic |

**Rationale**:
- **Ed25519**: Fast, small signatures (64 bytes), widely supported
- **SHA-256**: Industry standard, hardware-accelerated, collision-resistant

---

### How do I generate signing keys?

```typescript
import { generateEd25519KeyPair } from '@temporaldynamics/eco-packer';

const { privateKey, publicKey } = generateEd25519KeyPair();

// Save keys securely (see Security Best Practices)
fs.writeFileSync('private.key', privateKey, { mode: 0o600 });
fs.writeFileSync('public.key', publicKey);
```

**⚠️ Security**: Never commit private keys to Git. Use HSM/KMS for production.

---

### Can I use existing RSA keys?

**No**. eco-packer only supports Ed25519 for signatures.

**Migration Path**:
```typescript
// If you have RSA keys, generate new Ed25519 keys
const newKeys = generateEd25519KeyPair();

// Re-sign all projects with new keys
for (const project of projects) {
  await reSignProject(project, newKeys.privateKey);
}
```

---

### What is the `.ecox` file format?

`.ecox` is a **ZIP archive** with the following structure:

```
project.ecox (ZIP)
├── manifest.json        ← Signed project metadata
└── signature.json       ← Ed25519 signature + keyId
```

**manifest.json**:
```json
{
  "version": "1.1.0",
  "projectId": "proj-123",
  "assets": [...],
  "segments": [...],
  "metadata": { ... }
}
```

**signature.json**:
```json
{
  "keyId": "tenant-acme-prod",
  "signature": "MEUCIQDx7...",
  "signedAt": "2025-11-10T14:32:45.123Z",
  "algorithm": "Ed25519"
}
```

---

### What is the `.eco` file format?

`.eco` is a **public preview** format (manifest + signature only, no assets).

**Use Cases**:
- Public auditing
- Signature verification without downloading full `.ecox`
- Content-addressable storage (assets stored separately)

**Generate**:
```typescript
import { unpack, packEcoFromEcoX } from '@temporaldynamics/eco-packer';

const manifest = await unpack(ecoBuffer, { publicKey });
const ecoPreview = packEcoFromEcoX(manifest, manifest.signatures[0].signature);

fs.writeFileSync('project.eco', Buffer.from(ecoPreview));
```

---

### Can I add custom metadata?

**Yes!** The `metadata` field supports arbitrary JSON.

```typescript
const project = {
  version: '1.1.0',
  projectId: 'proj-123',
  assets: [...],
  segments: [...],
  metadata: {
    // Standard fields
    title: 'My Project',
    description: 'Demo project',

    // Custom fields
    customField1: 'value',
    customNested: {
      foo: 'bar'
    },
    tags: ['gaming', 'highlights']
  }
};
```

**Limits**:
- **Size**: <1MB (manifest size limit)
- **Structure**: Valid JSON (no circular references)

---

### How do I verify a signature?

```typescript
import { unpack } from '@temporaldynamics/eco-packer';

const manifest = await unpack(ecoBuffer, {
  publicKey: trustedPublicKey,
  expectedKeyId: 'tenant-prod-2025' // Optional: enforce specific key
});

if (manifest.signatures[0].valid) {
  console.log('✅ Signature valid!');
} else {
  console.error('❌ Invalid signature!');
  throw new Error('Tampered manifest detected');
}
```

**Security**: Always check `manifest.signatures[0].valid` before trusting the data.

---

### Can multiple people co-sign a project?

**Yes!** eco-packer supports **multi-signature workflows** (up to 10 co-signers).

```typescript
// Primary signer creates the .ecox
const ecoBuffer = await pack(project, assetHashes, {
  privateKey: alicePrivateKey,
  keyId: 'alice-author'
});

// Co-signer adds their signature
const manifest = await unpack(ecoBuffer, { publicKey: alicePublicKey });
const bobSignature = signManifestEd25519(
  canonicalizeJSON(manifest),
  bobPrivateKey
);

manifest.signatures.push({
  keyId: 'bob-reviewer',
  signature: bobSignature,
  signedAt: new Date().toISOString(),
  algorithm: 'Ed25519',
  valid: true
});

// Re-pack with both signatures
// (Custom implementation required)
```

---

### What Node.js versions are supported?

**Minimum**: Node.js 18.0 (for native Ed25519 support)

**Recommended**: Node.js 20.x LTS

**Not supported**: Node.js ≤16 (missing crypto APIs)

---

## Security Questions

### Is eco-packer quantum-safe?

**No**. Ed25519 is vulnerable to quantum attacks (Shor's algorithm).

**Timeline**:
- **2025-2027**: NIST post-quantum standards finalized
- **2026**: eco-packer v2.0 with hybrid signatures (Ed25519 + Dilithium3)
- **2030-2035**: Quantum computers may break Ed25519

**Migration Plan**: Hybrid mode will allow gradual transition without breaking changes.

---

### How do I protect my private keys?

**❌ NEVER**:
- Commit keys to Git
- Store keys in environment variables (production)
- Share keys via email/Slack
- Store keys unencrypted on disk

**✅ ALWAYS**:
- Use Hardware Security Modules (HSM)
- Use cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS)
- Use secrets managers (HashiCorp Vault, 1Password)
- Rotate keys annually

**Example (AWS KMS)**:
```typescript
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';

async function getPrivateKey(): Promise<Buffer> {
  const kms = new KMSClient({ region: 'us-east-1' });
  const response = await kms.send(new DecryptCommand({
    CiphertextBlob: encryptedKeyBlob,
    KeyId: 'arn:aws:kms:us-east-1:123456789012:key/abcd1234'
  }));
  return Buffer.from(response.Plaintext!);
}
```

---

### What if my private key is compromised?

**Immediate Actions** (within 1 hour):
1. **Revoke** key in KMS
2. **Disable** all API endpoints using that key
3. **Alert** security team + users
4. **Isolate** affected systems

**Short-term** (within 24 hours):
1. **Generate** new key pair
2. **Re-sign** all projects
3. **Notify** customers
4. **Forensics** - identify attack vector

**Long-term** (within 1 week):
1. **Publish** key revocation list
2. **Update** security documentation
3. **Post-mortem** analysis
4. **Implement** additional controls

See [SECURITY.md](./SECURITY.md) for full incident response playbook.

---

### Can I verify signatures offline?

**Yes!** eco-packer supports air-gapped verification.

**Requirements**:
- Pre-loaded public keys (from trusted source)
- `.ecox` file to verify
- No network access required

**Example**:
```typescript
// Load trusted public keys from local keystore
const publicKey = fs.readFileSync('./keystore/tenant-prod.pub');

// Verify offline
const manifest = await unpack(ecoFile, {
  publicKey,
  verifyHashes: false // Skip asset verification (no access to assets)
});

console.log(`Signature valid: ${manifest.signatures[0].valid}`);
```

---

### Are there known vulnerabilities?

**Current Status** (v1.1.0): ✅ **No known vulnerabilities**

**Past CVEs**:
- **CVE-2025-XXXX** (v1.0.x): Path traversal vulnerability
  - **Fixed**: v1.1.0
  - **Severity**: HIGH
  - **Action**: Upgrade to v1.1.0+

**Security Audits**:
- Last audit: November 2025
- Next audit: May 2026

**Report Vulnerabilities**: security@temporaldynamics.com

---

## Licensing & Pricing

### Do I need a license for personal projects?

**No!** The Community Edition (MIT License) is **FREE** for:
- Personal projects
- Open-source software
- Academic/research
- Non-commercial use

**Limits**:
- Max 100 assets per project
- 1 signature per manifest
- No commercial use
- No support

---

### When do I need a paid license?

You need a **Professional** or **Enterprise** license if:
- ✅ You're building a **commercial product** (SaaS, mobile app, etc.)
- ✅ You're selling or licensing your application
- ✅ Your company has >$1M annual revenue
- ✅ You need support or SLA guarantees

**Pricing**:
- **Professional**: $99/developer/year
- **Enterprise**: $499/organization/year

See [PRICING.md](./PRICING.md) for details.

---

### Can I try before I buy?

**Yes!** Professional licenses include:
- ✅ **30-day money-back guarantee**
- ✅ **No questions asked** refund policy

**How to Start**:
1. Purchase Professional license
2. Use for 30 days
3. If not satisfied, request full refund

---

### Do you offer discounts?

**Yes!** We offer:
- 🎓 **Academic**: 50% off (students, educators)
- 🌱 **Startup**: 40% off (companies <2 years old, <$1M revenue)
- 🔓 **Open Source**: FREE Professional license (projects with >100 GitHub stars)
- 🤝 **Non-Profit**: 60% off (501(c)(3) or equivalent)

**How to Apply**: Email sales@temporaldynamics.com with proof of eligibility.

---

### What happens if I exceed my license limits?

**Professional** (1,000 assets):
- **1,001-1,500**: Warning (soft limit)
- **1,501+**: Error (upgrade required)

**Solution**: Upgrade to Enterprise (prorated credit for remaining months).

**Example**:
```typescript
try {
  await pack(project, assetHashes, { privateKey, keyId });
} catch (err) {
  if (err.message.includes('asset limit exceeded')) {
    console.error('Please upgrade to Enterprise: https://temporaldynamics.com/pricing');
  }
}
```

---

## Troubleshooting

### Error: "Invalid signature"

**Causes**:
1. **Wrong public key** - Using different key than the one used for signing
2. **Tampered manifest** - File has been modified
3. **Key format mismatch** - DER vs. PEM format

**Solutions**:
```typescript
// 1. Verify you're using the correct public key
const publicKey = fs.readFileSync('correct-public.key');

// 2. Try different key formats
const publicKeyDER = Buffer.from('302a300506...', 'hex');
const publicKeyPEM = fs.readFileSync('public.pem', 'utf-8');

// 3. Check signature validity
const manifest = await unpack(ecoFile, { publicKey });
console.log('Signature valid:', manifest.signatures[0].valid);
```

---

### Error: "Hash validation failed"

**Causes**:
1. **Asset file modified** after hashing
2. **Wrong file** used for hash calculation
3. **Encoding issue** (binary vs. text)

**Solutions**:
```typescript
// 1. Recalculate hash from actual file
const assetData = fs.readFileSync('path/to/asset.mp4');
const actualHash = sha256Hex(assetData);
console.log('Expected:', manifest.assetHashes.get('video-1'));
console.log('Actual:', actualHash);

// 2. Ensure binary mode (not text mode)
const assetData = fs.readFileSync('asset.mp4'); // ✅ Correct
// NOT: fs.readFileSync('asset.mp4', 'utf-8') // ❌ Wrong

// 3. Verify file hasn't changed
const stats = fs.statSync('asset.mp4');
console.log('File size:', stats.size);
console.log('Modified:', stats.mtime);
```

---

### Error: "Manifest validation failed"

**Causes**:
1. **Missing required fields** (projectId, version, etc.)
2. **Invalid asset references** in segments
3. **Time range errors** (startTime > endTime)

**Solutions**:
```typescript
// 1. Validate project structure before packing
import { validateProject } from '@temporaldynamics/eco-packer';

try {
  validateProject(project);
  console.log('✅ Project valid');
} catch (err) {
  console.error('❌ Validation error:', err.message);
  console.error('Details:', err.details);
}

// 2. Check for common issues
if (!project.projectId) {
  throw new Error('Missing projectId');
}

if (project.segments.some(s => s.startTime >= s.endTime)) {
  throw new Error('Invalid time range in segment');
}
```

---

### Error: "Path traversal detected"

**Cause**: Asset source path contains dangerous patterns (`../`, absolute paths).

**Solution**:
```typescript
// ❌ BAD: Dangerous paths
project.assets = [
  { assetId: 'a1', source: '../../../etc/passwd' },  // Blocked
  { assetId: 'a2', source: '/etc/shadow' }            // Blocked
];

// ✅ GOOD: Relative paths within project
project.assets = [
  { assetId: 'a1', source: 'uploads/video.mp4' },
  { assetId: 'a2', source: 'assets/audio.mp3' }
];
```

---

### Performance is slow for large projects

**Optimization Strategies**:

1. **Cache asset hashes**:
```typescript
const hashCache = new Map();
const cacheKey = `${assetId}-${stats.size}-${stats.mtimeMs}`;
if (hashCache.has(cacheKey)) {
  return hashCache.get(cacheKey);
}
```

2. **Use compression level 6** (not 9):
```typescript
await pack(project, assetHashes, {
  privateKey,
  keyId,
  compressionLevel: 6 // Balanced (not 9)
});
```

3. **Batch process with parallelism**:
```typescript
import pLimit from 'p-limit';
const limit = pLimit(10);
const promises = projects.map(p => limit(() => pack(p, ...)));
await Promise.all(promises);
```

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed optimization guide.

---

## Integration & Compatibility

### Can I use eco-packer in the browser?

**Partially**. Core functions work in browsers with limitations:

**✅ Supported**:
- `unpack()` - Verify signatures
- `verifyManifestEd25519()` - Signature verification
- `sha256Hex()` - Hash calculation

**❌ Not Supported**:
- `pack()` - Requires Node.js `crypto` module
- `generateEd25519KeyPair()` - Requires Node.js crypto

**Workaround (Web Crypto API)**:
```typescript
// Browser-compatible verification (future v1.2)
import { verifySignature } from '@temporaldynamics/eco-packer/browser';

const isValid = await verifySignature(manifest, publicKeyJWK);
```

---

### Does it work with React/Vue/Angular?

**Yes!** eco-packer is framework-agnostic.

**Example (React)**:
```typescript
import { unpack } from '@temporaldynamics/eco-packer';
import { useState } from 'react';

function ProjectVerifier() {
  const [manifest, setManifest] = useState(null);

  const handleFileUpload = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const verified = await unpack(arrayBuffer, { publicKey });
    setManifest(verified);
  };

  return (
    <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} />
  );
}
```

---

### Can I use it with TypeScript?

**Yes!** eco-packer is **TypeScript-first**.

```typescript
import {
  pack,
  unpack,
  EcoProject,
  EcoManifest,
  PackOptions
} from '@temporaldynamics/eco-packer';

const project: EcoProject = { ... };
const options: PackOptions = { privateKey, keyId: 'prod' };

const ecoBuffer: ArrayBuffer = await pack(project, assetHashes, options);
const manifest: EcoManifest = await unpack(ecoBuffer, { publicKey });
```

**Type Definitions**: Included in package (`dist/index.d.ts`).

---

### Does it integrate with cloud storage?

**Yes!** eco-packer works with all cloud providers.

**AWS S3**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });
const ecoBuffer = await pack(project, assetHashes, { privateKey, keyId });

await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: `projects/${projectId}.ecox`,
  Body: Buffer.from(ecoBuffer)
}));
```

**Google Cloud Storage**:
```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('my-bucket');
const file = bucket.file(`projects/${projectId}.ecox`);

await file.save(Buffer.from(ecoBuffer));
```

---

## Performance & Scalability

### How fast is eco-packer?

**Benchmark Results** (v1.1.0):

| Project Size | Assets | Pack Time | Unpack Time |
|--------------|--------|-----------|-------------|
| Small | 10 | 28ms | 11ms |
| Medium | 100 | 81ms | 31ms |
| Large | 1,000 | 409ms | 204ms |
| XL | 10,000 | 4.8s | 2.3s |

**Throughput**: ~6-12 GB/s (depending on project size)

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed performance analysis.

---

### Can it handle large files (>1GB)?

**Current**: Loads entire file into memory (may cause OOM for very large files).

**Future** (v1.2): Streaming API for files >1GB.

**Workaround**:
```typescript
// Hash large files without loading into memory
import { createReadStream } from 'fs';
import { createHash } from 'crypto';

async function streamHash(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}
```

---

### How do I scale to millions of projects?

**Strategies**:

1. **Distributed Processing**:
```typescript
// Use message queue (RabbitMQ, AWS SQS)
await queue.publish('pack-project', { projectId, assets });
```

2. **Caching**:
```typescript
// Cache public keys and asset hashes
const keyCache = new Map<string, Buffer>();
const hashCache = new Map<string, string>();
```

3. **Database Indexing**:
```sql
CREATE INDEX idx_project_keyid ON projects(keyId);
CREATE INDEX idx_signature_valid ON signatures(valid);
```

4. **CDN Distribution**:
```typescript
// Serve .ecox files from CDN (CloudFront, CloudFlare)
const cdnUrl = `https://cdn.example.com/projects/${projectId}.ecox`;
```

---

## Still Have Questions?

### Community Support

- 💬 **GitHub Discussions**: https://github.com/temporal-dynamics/neo/discussions
- 📧 **Email**: support@temporaldynamics.com
- 📚 **Documentation**: [API.md](./API.md), [EXAMPLES.md](./EXAMPLES.md)

### Professional Support

Enterprise customers receive:
- ✅ **24-hour response SLA**
- ✅ **Dedicated support engineer**
- ✅ **Architecture review**
- ✅ **Priority bug fixes**

**Contact**: enterprise@temporaldynamics.com

---

**Last Updated**: November 10, 2025
**License**: MIT (Community) / Commercial (Professional/Enterprise)
**Author**: Temporal Dynamics LLC
