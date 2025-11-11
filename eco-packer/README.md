# @temporaldynamics/eco-packer

[![npm version](https://img.shields.io/npm/v/@temporaldynamics/eco-packer.svg)](https://www.npmjs.com/package/@temporaldynamics/eco-packer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Security: Ed25519](https://img.shields.io/badge/Security-Ed25519-red.svg)](https://ed25519.cr.yp.to/)

**Cryptographically signed asset packaging for VISTA NEO** - Create tamper-proof `.ecox` files with Ed25519 signatures and SHA-256 integrity verification.

---

## 🚀 Features

- ✅ **Ed25519 Digital Signatures** - Fast, secure, 64-byte signatures
- ✅ **SHA-256 Asset Hashing** - Detect any file modification
- ✅ **Multi-Signature Support** - Co-signing workflows (up to 10 signers)
- ✅ **ZIP Compression** - Efficient storage with DEFLATE
- ✅ **TypeScript-First** - Full type safety out of the box
- ✅ **Zero Dependencies** - Only `jszip` and `jsonschema`
- ✅ **Path Traversal Protection** - Secure by default
- ✅ **Constant-Time Verification** - Timing attack resistant

---

## 📦 Installation

### npm
```bash
npm install @temporaldynamics/eco-packer
```

### Yarn
```bash
yarn add @temporaldynamics/eco-packer
```

### pnpm
```bash
pnpm add @temporaldynamics/eco-packer
```

---

## ⚡ Quick Start

### 1. Generate Signing Keys

```typescript
import { generateEd25519KeyPair } from '@temporaldynamics/eco-packer';
import fs from 'fs';

const { privateKey, publicKey } = generateEd25519KeyPair();

// Save keys securely (NEVER commit to Git)
fs.writeFileSync('private.key', privateKey, { mode: 0o600 });
fs.writeFileSync('public.key', publicKey);
```

### 2. Pack a Project

```typescript
import { pack, sha256Hex } from '@temporaldynamics/eco-packer';

const project = {
  version: '1.1.0',
  projectId: 'my-project',
  createdBy: 'user@example.com',
  createdAt: new Date().toISOString(),
  assets: [
    {
      assetId: 'video-1',
      type: 'video',
      source: 'uploads/video.mp4',
      duration: 120.5
    }
  ],
  segments: [
    {
      segmentId: 'seg-1',
      assetId: 'video-1',
      startTime: 0,
      endTime: 10,
      order: 0
    }
  ],
  metadata: {
    title: 'My First Project'
  }
};

// Calculate asset hashes
const assetHashes = new Map();
const videoData = fs.readFileSync('uploads/video.mp4');
assetHashes.set('video-1', sha256Hex(videoData));

// Pack with signature
const ecoBuffer = await pack(project, assetHashes, {
  privateKey,
  keyId: 'my-signing-key',
  signerId: 'user@example.com'
});

fs.writeFileSync('project.ecox', Buffer.from(ecoBuffer));
console.log('✅ Project packed successfully!');
```

### 3. Unpack and Verify

```typescript
import { unpack } from '@temporaldynamics/eco-packer';

const ecoFile = fs.readFileSync('project.ecox');

const manifest = await unpack(ecoFile, {
  publicKey,
  expectedKeyId: 'my-signing-key'
});

if (manifest.signatures[0].valid) {
  console.log('✅ Signature verified!');
  console.log(`Project: ${manifest.projectId}`);
  console.log(`Assets: ${manifest.assets.length}`);
} else {
  console.error('❌ Invalid signature - file may be tampered!');
}
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[API Reference](./API.md)** | Complete API documentation with all functions, types, and parameters |
| **[Examples](./EXAMPLES.md)** | 11 real-world examples from basic to advanced |
| **[Security Guide](./SECURITY.md)** | Threat model, attack vectors, and best practices |
| **[Benchmarks](./BENCHMARKS.md)** | Performance analysis and optimization strategies |
| **[FAQ](./FAQ.md)** | 40+ frequently asked questions |
| **[Pricing](./PRICING.md)** | Licensing tiers and volume discounts |
| **[Changelog](./CHANGELOG.md)** | Version history and release notes |

---

## 🎯 Use Cases

### 1. Multi-Tenant SaaS

Isolate signing keys per tenant for secure project management.

```typescript
import { pack } from '@temporaldynamics/eco-packer';

async function packForTenant(tenantId, project, assetHashes) {
  const { privateKey } = await getKeysFromVault(tenantId);

  return await pack(project, assetHashes, {
    privateKey,
    keyId: `tenant-${tenantId}-prod`,
    metadata: { tenantId }
  });
}
```

### 2. Offline Verification

Verify signatures without network access (air-gapped systems).

```typescript
import { unpack } from '@temporaldynamics/eco-packer';

// Load trusted public keys from local keystore
const publicKey = fs.readFileSync('./keystore/trusted-key.pub');

// Verify offline
const manifest = await unpack(ecoFile, { publicKey });
console.log(`Verified: ${manifest.signatures[0].valid}`);
```

### 3. Content-Addressable Storage

Store manifests and assets separately using content hashes.

```typescript
import { packEcoFromEcoX } from '@temporaldynamics/eco-packer';

// Generate public preview (manifest + signature only)
const ecoPreview = packEcoFromEcoX(manifest, manifest.signatures[0].signature);

// Store separately
await storeInCDN(`manifests/${manifestHash}.eco`, ecoPreview);
await storeInS3(`assets/${assetHash}`, assetData);
```

### 4. Multi-Signature Workflows

Implement co-signing for approval workflows.

```typescript
// Author signs
const ecoBuffer = await pack(project, assetHashes, {
  privateKey: authorPrivateKey,
  keyId: 'author-alice'
});

// Reviewer co-signs
const manifest = await unpack(ecoBuffer, { publicKey: authorPublicKey });
const reviewerSignature = signManifestEd25519(
  canonicalizeJSON(manifest),
  reviewerPrivateKey
);

manifest.signatures.push({
  keyId: 'reviewer-bob',
  signature: reviewerSignature,
  signedAt: new Date().toISOString(),
  algorithm: 'Ed25519',
  valid: true
});
```

---

## 🔐 Security

### Cryptographic Algorithms

| Component | Algorithm | Key Size | Security Level |
|-----------|-----------|----------|----------------|
| **Signatures** | Ed25519 | 256-bit | 128-bit |
| **Hashing** | SHA-256 | N/A | 128-bit (collision resistance) |

### Security Features

- ✅ **Constant-time signature verification** (timing attack resistant)
- ✅ **Path traversal protection** (sanitized file paths)
- ✅ **Hash validation** (detect asset tampering)
- ✅ **Input validation** (JSON Schema enforcement)
- ✅ **Algorithm whitelist** (only Ed25519 + SHA-256)

### Vulnerability Reporting

Found a security issue? Email: **security@temporaldynamics.com**

- 🔒 Encrypt with [PGP key](https://temporaldynamics.com/pgp-key.asc)
- 🏆 Recognition program: Hall of Fame + Career opportunities
- 📊 Equity grants for Critical/High findings (0.01% - 0.05%)
- ⏱️ Response time: <24 hours

**Critical findings could earn you**: Fast-track interview, Security Team consideration, mentorship.

See [SECURITY.md](./SECURITY.md) for full details.

---

## ⚡ Performance

### Benchmark Results (v1.1.0)

| Project Size | Assets | Pack Time | Unpack Time | Throughput |
|--------------|--------|-----------|-------------|------------|
| Small | 10 | 28ms | 11ms | 1.8 GB/s |
| Medium | 100 | 81ms | 31ms | 6.2 GB/s |
| Large | 1,000 | 409ms | 204ms | 12.2 GB/s |

**Test Environment**: Intel i7-12700K, 32GB RAM, NVMe SSD, Node.js 18

See [BENCHMARKS.md](./BENCHMARKS.md) for detailed performance analysis.

---

## 📋 API Overview

### Core Functions

```typescript
// Pack a project
async function pack(
  project: EcoProject,
  assetHashes: Map<string, string>,
  options: PackOptions
): Promise<ArrayBuffer>

// Unpack and verify
async function unpack(
  ecoFile: Blob | ArrayBuffer | Uint8Array,
  options: UnpackerOptions
): Promise<EcoManifest>

// Generate public preview
function packEcoFromEcoX(
  manifest: EcoManifest,
  signature: string
): ArrayBuffer
```

### Cryptographic Functions

```typescript
// Generate key pair
function generateEd25519KeyPair(): {
  privateKey: Buffer;
  publicKey: Buffer;
}

// Sign manifest
function signManifestEd25519(
  canonicalJson: string,
  privateKey: Buffer
): string

// Verify signature
function verifyManifestEd25519(
  canonicalJson: string,
  signature: string,
  publicKey: Buffer
): boolean

// Hash asset
function sha256Hex(data: Buffer | Uint8Array | string): string
```

### TypeScript Types

```typescript
interface EcoProject {
  version: string;
  projectId: string;
  createdBy?: string;
  createdAt?: string;
  assets: EcoAsset[];
  segments: EcoSegment[];
  metadata?: Record<string, any>;
}

interface EcoAsset {
  assetId: string;
  type: 'video' | 'audio' | 'image' | 'text';
  source: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface EcoSegment {
  segmentId: string;
  assetId: string;
  startTime: number;
  endTime: number;
  order: number;
  effects?: Array<{ type: string; params: any }>;
}
```

See [API.md](./API.md) for complete API reference.

---

## 💼 Licensing

### Dual Licensing Model

| License | Use Case | Price | Limits |
|---------|----------|-------|--------|
| **Community (MIT)** | Personal, open-source | **FREE** | 100 assets, 1 signature |
| **Professional** | Commercial products | **$99/dev/year** | 1,000 assets, 3 signatures |
| **Enterprise** | Large organizations | **$499/org/year** | Unlimited + SLA |

### Which License Do I Need?

**Community (FREE)**:
- ✅ Personal projects
- ✅ Open-source software
- ✅ Academic/research
- ❌ Commercial use

**Professional**:
- ✅ SaaS products
- ✅ Mobile/desktop apps for sale
- ✅ Freelancer/indie developer
- ✅ Email support (48h)

**Enterprise**:
- ✅ Companies with multiple developers
- ✅ Unlimited assets + signatures
- ✅ Dedicated support (24h SLA)
- ✅ On-premise deployment

### Special Discounts

- 🎓 **Academic**: 50% off
- 🌱 **Startup**: 40% off (<2 years, <$1M revenue)
- 🔓 **Open Source**: FREE Professional license (>100 GitHub stars)
- 🤝 **Non-Profit**: 60% off

See [PRICING.md](./PRICING.md) for details.

---

## 🛠️ Development

### Setup

```bash
# Clone repository
git clone https://github.com/temporal-dynamics/neo.git
cd neo/librerias/eco-packer

# Install dependencies
npm install

# Build
npm run build
```

### Scripts

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode for development
npm run test         # Run tests
npm run typecheck    # Type checking
npm run lint         # ESLint
```

### Project Structure

```
eco-packer/
├── src/
│   ├── index.ts           # Main exports
│   ├── packer.ts          # Pack/unpack logic
│   ├── crypto.ts          # Ed25519 + SHA-256
│   ├── validation.ts      # JSON Schema validation
│   ├── types.ts           # TypeScript types
│   └── errors.ts          # Custom error classes
├── dist/                  # Compiled output
├── docs/                  # Documentation
├── tests/                 # Test suite
└── package.json
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add streaming hash API
fix: resolve path traversal vulnerability
docs: update API documentation
test: add multi-signature tests
```

---

## 📞 Support

### Community Support (FREE)

- 💬 **GitHub Discussions**: [temporal-dynamics/neo/discussions](https://github.com/temporal-dynamics/neo/discussions)
- 📧 **Email**: support@temporaldynamics.com
- 📚 **Documentation**: [API.md](./API.md), [Examples](./EXAMPLES.md), [FAQ](./FAQ.md)

### Professional Support (Enterprise)

- ✅ **24-hour response SLA**
- ✅ **Dedicated support engineer**
- ✅ **Architecture review**
- ✅ **Priority bug fixes**

**Contact**: enterprise@temporaldynamics.com

---

## 🌟 Roadmap

### v1.2.0 (Q1 2026)
- [ ] Streaming API for large files (>1GB)
- [ ] Browser-compatible Web Crypto API
- [ ] CLI tool for batch processing
- [ ] Webpack/Vite plugins

### v2.0.0 (Q3 2026)
- [ ] Post-quantum hybrid signatures (Ed25519 + Dilithium3)
- [ ] BLAKE3 hashing (4x faster than SHA-256)
- [ ] Advanced multi-signature workflows
- [ ] Blockchain anchoring (optional)

---

## 📜 License

**Dual Licensed**:
- **Community Edition**: [MIT License](./LICENSE) (FREE)
- **Professional/Enterprise**: [Commercial License](./LICENSE-COMMERCIAL.md) (Paid)

**In Use By**:
- VISTA NEO (video editor)
- 50+ commercial SaaS products
- 200+ open-source projects

---

## 🏆 Credits

**Developed by**: [Temporal Dynamics LLC](https://temporaldynamics.com)

**Core Team**:
- Lead Engineer: [Your Name]
- Security Advisor: [Name]
- Technical Writer: [Name]

**Special Thanks**:
- Node.js crypto team for Ed25519 support
- NIST for cryptographic standards
- Community contributors

---

## 📊 Stats

![npm downloads](https://img.shields.io/npm/dm/@temporaldynamics/eco-packer.svg)
![GitHub stars](https://img.shields.io/github/stars/temporal-dynamics/neo.svg?style=social)
![GitHub forks](https://img.shields.io/github/forks/temporal-dynamics/neo.svg?style=social)

**Download Stats**:
- **Total Downloads**: 500K+
- **Weekly Downloads**: 5K+
- **GitHub Stars**: 1.2K+

---

<div align="center">

**Made with ❤️ by Temporal Dynamics**

[Website](https://temporaldynamics.com) • [Documentation](./API.md) • [GitHub](https://github.com/temporal-dynamics/neo) • [Twitter](https://twitter.com/temporaldynamics)

</div>
