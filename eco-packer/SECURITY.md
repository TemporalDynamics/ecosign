# 🔐 eco-packer Security Overview

**Version**: 1.1.0
**Last Updated**: November 10, 2025

Comprehensive security analysis, threat model, and best practices for `@temporaldynamics/eco-packer`.

---

## 📋 Table of Contents

1. [Security Model](#security-model)
2. [Threat Model](#threat-model)
3. [Attack Vectors & Mitigations](#attack-vectors--mitigations)
4. [Cryptographic Security](#cryptographic-security)
5. [Key Management](#key-management)
6. [Secure Deployment](#secure-deployment)
7. [Security Auditing](#security-auditing)
8. [Incident Response](#incident-response)
9. [Compliance & Certifications](#compliance--certifications)
10. [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Security Model

### Core Security Principles

eco-packer follows **defense-in-depth** with multiple layers of protection:

```
┌─────────────────────────────────────────┐
│  1. Input Validation                    │  ← Reject malicious data early
├─────────────────────────────────────────┤
│  2. Cryptographic Integrity             │  ← Ed25519 signatures + SHA-256
├─────────────────────────────────────────┤
│  3. Path Traversal Protection           │  ← Sanitize all file paths
├─────────────────────────────────────────┤
│  4. Constant-Time Operations            │  ← Prevent timing attacks
├─────────────────────────────────────────┤
│  5. Secure Key Storage                  │  ← HSM/KMS integration
└─────────────────────────────────────────┘
```

### Trust Boundaries

```
┌────────────────┐
│  Untrusted     │  ← User uploads, external data
│  Input         │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Validation    │  ← Schema validation, sanitization
│  Layer         │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Signing       │  ← Ed25519 signature (trusted zone)
│  Authority     │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│  Trusted       │  ← Signed .ecox files
│  Output        │
└────────────────┘
```

---

## Threat Model

### Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|------------|
| **External Attacker** | Tamper with assets, steal content | Network access, malware |
| **Malicious User** | Bypass licensing, inject malicious files | API access, social engineering |
| **Insider Threat** | Exfiltrate signing keys, forge signatures | Direct system access |
| **Supply Chain Attack** | Compromise dependencies, inject backdoors | npm ecosystem access |

### Attack Surface

```
┌─────────────────────────────────────────────────┐
│  Attack Surface Analysis                        │
├─────────────────────────────────────────────────┤
│  1. Input Files (.ecox, assets)          HIGH   │
│  2. API Parameters (pack/unpack)         MEDIUM │
│  3. Private Key Storage                  CRITICAL│
│  4. Network Communication (optional)     MEDIUM │
│  5. Dependencies (jszip, jsonschema)     LOW    │
└─────────────────────────────────────────────────┘
```

---

## Attack Vectors & Mitigations

### 1. Manifest Tampering

**Attack**: Attacker modifies manifest.json to alter project metadata, segments, or asset references.

**Impact**:
- Data integrity loss
- Unauthorized content injection
- Timeline manipulation

**Mitigation**:
```typescript
// ✅ PROTECTED: Ed25519 signature verification
const manifest = await unpack(ecoFile, {
  publicKey: trustedPublicKey,
  expectedKeyId: 'tenant-prod-2025'
});

// Any tampering will fail signature verification
if (!manifest.signatures[0].valid) {
  throw new SignatureError('Manifest has been tampered!');
}
```

**Status**: ✅ **MITIGATED** (since v1.0.0)

---

### 2. Asset Hash Collision

**Attack**: Replace asset with malicious file that produces same SHA-256 hash (hash collision).

**Impact**:
- Malicious content injection
- Copyright violation
- Privacy breach

**Mitigation**:
```typescript
// ✅ PROTECTED: SHA-256 is collision-resistant
// Probability of collision: 2^-256 (astronomically low)

const actualHash = sha256Hex(assetData);
const expectedHash = manifest.assetHashes.get(assetId);

if (actualHash !== expectedHash) {
  throw new HashValidationError(
    `Hash mismatch for asset ${assetId}`,
    { expected: expectedHash, actual: actualHash }
  );
}
```

**Additional Protection**:
- Asset size validation
- MIME type checking
- Content fingerprinting

**Status**: ✅ **MITIGATED** (cryptographic strength of SHA-256)

---

### 3. Path Traversal Attack

**Attack**: Inject malicious paths (e.g., `../../../etc/passwd`) to access files outside project directory.

**Impact**:
- Arbitrary file read
- System compromise
- Data exfiltration

**Mitigation**:
```typescript
// ✅ PROTECTED: Strict path sanitization
function sanitizeFileName(fileName: string): string {
  // Block parent directory traversal
  if (fileName.includes('..') || fileName.includes('..\\')) {
    throw new PathTraversalError(`Path traversal detected: ${fileName}`);
  }

  // Block absolute paths
  if (path.isAbsolute(fileName)) {
    throw new PathTraversalError(`Absolute path not allowed: ${fileName}`);
  }

  // Block null bytes
  if (fileName.includes('\0')) {
    throw new PathTraversalError(`Null byte detected: ${fileName}`);
  }

  // Block control characters
  if (/[\x00-\x1F]/.test(fileName)) {
    throw new PathTraversalError(`Control characters detected: ${fileName}`);
  }

  return fileName;
}
```

**CVE**: Fixed in v1.1.0 (CVE-2025-XXXX)

**Status**: ✅ **MITIGATED** (since v1.1.0)

---

### 4. Timing Attack on Signature Verification

**Attack**: Measure signature verification time to infer private key bits.

**Impact**:
- Private key extraction (over millions of attempts)
- Signature forgery

**Mitigation**:
```typescript
// ✅ PROTECTED: Constant-time signature verification
function verifyManifestEd25519(
  canonicalJson: string,
  signature: string,
  publicKey: Buffer
): boolean {

  // Node.js crypto.verify() uses constant-time comparison
  const verifier = crypto.createVerify('SHA256');
  verifier.update(canonicalJson);
  verifier.end();

  // Timing is independent of key material
  return verifier.verify(
    {
      key: publicKey,
      format: 'der',
      type: 'spki'
    },
    Buffer.from(signature, 'base64')
  );
}
```

**Status**: ✅ **MITIGATED** (since v1.1.0)

---

### 5. Replay Attack

**Attack**: Reuse old signed manifests to revert to previous project state.

**Impact**:
- Version confusion
- Audit trail bypass
- Unauthorized rollback

**Mitigation**:
```typescript
// ✅ PROTECTED: Timestamp validation
const manifest = await unpack(ecoFile, { publicKey });

const signedAt = new Date(manifest.signatures[0].signedAt);
const now = new Date();
const ageInHours = (now.getTime() - signedAt.getTime()) / (1000 * 60 * 60);

if (ageInHours > 24) {
  throw new Error('Manifest expired (>24 hours old)');
}
```

**Additional Protection**:
- Nonce/counter in metadata
- Blockchain anchoring (for auditing)

**Status**: ⚠️ **PARTIALLY MITIGATED** (application-level enforcement recommended)

---

### 6. Key Compromise

**Attack**: Attacker gains access to private signing key.

**Impact**:
- Forge signatures for any manifest
- Complete system compromise

**Mitigation**:

**Prevention**:
```typescript
// ✅ Use Hardware Security Modules (HSM)
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({ region: 'us-east-1' });

async function signWithKMS(data: Buffer, keyId: string): Promise<string> {
  const response = await kms.send(new SignCommand({
    KeyId: keyId,
    Message: data,
    SigningAlgorithm: 'ECDSA_SHA_256' // Or compatible
  }));

  return Buffer.from(response.Signature!).toString('base64');
}
```

**Detection**:
```typescript
// Monitor for suspicious signing activity
function auditSigningEvent(keyId: string, projectId: string) {
  logToSIEM({
    event: 'signature_created',
    keyId,
    projectId,
    timestamp: new Date().toISOString(),
    sourceIP: getClientIP()
  });
}
```

**Recovery**:
1. **Immediate**: Revoke compromised key
2. **Short-term**: Re-sign all projects with new key
3. **Long-term**: Publish key revocation list (KRL)

**Status**: ⚠️ **OPERATIONAL** (requires HSM/KMS + monitoring)

---

### 7. Denial of Service (DoS)

**Attack**: Submit extremely large files or deeply nested manifests to exhaust resources.

**Impact**:
- Service unavailability
- Resource exhaustion
- Increased costs

**Mitigation**:
```typescript
// ✅ PROTECTED: Size limits + rate limiting
const MAX_MANIFEST_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ASSETS = 10000;
const MAX_NESTING_DEPTH = 100;

function validateManifestSize(manifest: any) {
  const size = JSON.stringify(manifest).length;

  if (size > MAX_MANIFEST_SIZE) {
    throw new Error(`Manifest too large: ${size} bytes (max: ${MAX_MANIFEST_SIZE})`);
  }

  if (manifest.assets.length > MAX_ASSETS) {
    throw new Error(`Too many assets: ${manifest.assets.length} (max: ${MAX_ASSETS})`);
  }
}

// Rate limiting (example with express-rate-limit)
import rateLimit from 'express-rate-limit';

const packLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many pack requests, try again later'
});

app.post('/api/pack', packLimiter, async (req, res) => {
  // Handle pack request
});
```

**Status**: ✅ **MITIGATED** (with application-level limits)

---

### 8. Dependency Vulnerabilities

**Attack**: Exploit vulnerabilities in third-party dependencies (jszip, jsonschema).

**Impact**:
- Arbitrary code execution
- Data exfiltration
- Supply chain compromise

**Mitigation**:
```bash
# ✅ PROTECTED: Regular dependency audits
npm audit

# Lock dependencies
npm ci  # Use package-lock.json

# Automated scanning
npm install -g snyk
snyk test
```

**Dependency Policy**:
- **Critical updates**: Within 24 hours
- **High severity**: Within 7 days
- **Medium/Low**: Next release cycle

**Current Status** (v1.1.0):
```
Audited 3 packages in 0.5s
0 vulnerabilities found
```

**Status**: ✅ **MONITORED** (continuous scanning)

---

### 9. Algorithm Downgrade Attack

**Attack**: Force use of weak cryptographic algorithms (e.g., MD5, SHA1).

**Impact**:
- Collision attacks
- Signature forgery

**Mitigation**:
```typescript
// ✅ PROTECTED: Algorithm whitelist
const ALLOWED_ALGORITHMS = ['Ed25519'];
const ALLOWED_HASH_FUNCTIONS = ['SHA-256'];

function validateSignatureAlgorithm(algorithm: string) {
  if (!ALLOWED_ALGORITHMS.includes(algorithm)) {
    throw new SignatureError(
      `Unsupported algorithm: ${algorithm}. Only Ed25519 allowed.`
    );
  }
}

// Reject weak algorithms
if (manifest.signatures[0].algorithm === 'RSA-MD5') {
  throw new SignatureError('MD5 is deprecated and insecure');
}
```

**Status**: ✅ **MITIGATED** (since v1.0.0)

---

### 10. Side-Channel Attacks

**Attack**: Extract secrets via power analysis, electromagnetic radiation, or cache timing.

**Impact**:
- Private key extraction
- Signature forgery

**Mitigation**:

**Hardware Level**:
- Use HSMs with tamper-resistant hardware
- Run in secure enclaves (Intel SGX, AWS Nitro)

**Software Level**:
```typescript
// ✅ Use constant-time primitives
// Node.js crypto module uses OpenSSL (constant-time by default)

// Avoid conditional branches based on secrets
// ❌ BAD:
if (privateKey[0] === 0x42) { ... }

// ✅ GOOD:
crypto.timingSafeEqual(buffer1, buffer2);
```

**Status**: ⚠️ **OPERATIONAL** (requires HSM for full protection)

---

## Cryptographic Security

### Algorithm Selection

| Component | Algorithm | Key Size | Security Level |
|-----------|-----------|----------|----------------|
| **Signatures** | Ed25519 | 256-bit | 128-bit (post-quantum: ❌) |
| **Hashing** | SHA-256 | N/A | 128-bit (collision resistance) |
| **Compression** | DEFLATE (ZIP) | N/A | Not cryptographic |

### Post-Quantum Readiness

**Current Status**: ❌ **NOT POST-QUANTUM SAFE**

Ed25519 is vulnerable to quantum attacks (Shor's algorithm). Estimated timeline:
- **2030-2035**: Quantum computers may break Ed25519
- **2025-2027**: NIST post-quantum standards finalized

**Migration Plan**:
```typescript
// Future: Hybrid signatures (classical + post-quantum)
interface FutureSignature {
  ed25519: string;          // Classical signature
  dilithium: string;        // Post-quantum signature (NIST candidate)
  algorithm: 'Ed25519+Dilithium3';
}
```

**Status**: 📅 **PLANNED** (v2.0.0, 2026)

---

## Key Management

### Key Lifecycle

```
┌─────────────┐
│  Generate   │  ← HSM/KMS (not on application server)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Store     │  ← Encrypted at rest (AES-256)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Use      │  ← Sign manifests (audit all usage)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Rotate    │  ← Annual rotation (or after compromise)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Revoke    │  ← Publish to key revocation list
└─────────────┘
```

### Key Storage Best Practices

**❌ NEVER**:
```typescript
// DON'T store keys in code
const privateKey = Buffer.from('302e020100300506...', 'hex');

// DON'T commit keys to Git
// private.key

// DON'T store keys in environment variables (prod)
process.env.PRIVATE_KEY
```

**✅ ALWAYS**:
```typescript
// Use AWS KMS
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';

async function getPrivateKey(): Promise<Buffer> {
  const kms = new KMSClient({ region: 'us-east-1' });

  const response = await kms.send(new DecryptCommand({
    CiphertextBlob: encryptedKeyBlob,
    KeyId: 'arn:aws:kms:us-east-1:123456789012:key/abcd1234'
  }));

  return Buffer.from(response.Plaintext!);
}

// Or HashiCorp Vault
import vault from 'node-vault';

const vaultClient = vault({
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN
});

const { data } = await vaultClient.read('secret/eco-packer/signing-key');
const privateKey = Buffer.from(data.privateKey, 'hex');
```

### Key Rotation

```typescript
// Rotate keys annually
async function rotateSigningKey(tenantId: string) {
  // 1. Generate new key pair
  const newKeys = generateEd25519KeyPair();

  // 2. Store new key
  await storeKey(tenantId, 'v2', newKeys);

  // 3. Re-sign all active projects
  const projects = await getAllProjects(tenantId);
  for (const project of projects) {
    await reSignProject(project, newKeys.privateKey);
  }

  // 4. Mark old key as deprecated (keep for verification)
  await deprecateKey(tenantId, 'v1');

  // 5. Publish key rotation event
  await publishEvent('key_rotated', { tenantId, newKeyId: 'v2' });
}
```

---

## Secure Deployment

### Production Checklist

- [ ] **Keys stored in HSM/KMS** (not on app server)
- [ ] **TLS 1.3** for all network communication
- [ ] **Rate limiting** on pack/unpack endpoints
- [ ] **Input validation** on all API parameters
- [ ] **Dependency scanning** (npm audit, Snyk)
- [ ] **Security headers** (CSP, HSTS, X-Frame-Options)
- [ ] **Logging & monitoring** (audit all signing events)
- [ ] **Incident response plan** documented
- [ ] **Regular backups** of public keys (for verification)
- [ ] **Penetration testing** annually

### Environment Separation

```
┌─────────────────────────────────────────┐
│  Development                            │
│  - Generate test keys locally           │
│  - No real data                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Staging                                │
│  - Keys in KMS (non-prod)               │
│  - Synthetic data only                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Production                             │
│  - Keys in HSM/KMS (strict access)      │
│  - Full monitoring + alerting           │
│  - Incident response 24/7               │
└─────────────────────────────────────────┘
```

---

## Security Auditing

### Audit Logging

```typescript
interface SigningAuditLog {
  timestamp: string;
  event: 'pack' | 'unpack' | 'sign' | 'verify';
  keyId: string;
  projectId: string;
  userId: string;
  sourceIP: string;
  userAgent: string;
  result: 'success' | 'failure';
  errorCode?: string;
}

// Log every signing operation
function auditLog(log: SigningAuditLog) {
  // Send to SIEM (Splunk, Datadog, etc.)
  logger.info('SECURITY_AUDIT', log);

  // Also store in database for forensics
  db.auditLogs.insert(log);
}
```

### Monitoring & Alerts

```typescript
// Alert on suspicious patterns
if (failedSignatureAttempts > 10) {
  alert('CRITICAL', 'Signature verification failures spike', {
    keyId,
    count: failedSignatureAttempts,
    timeWindow: '5 minutes'
  });
}

// Monitor key usage
if (signingRate > 1000 per minute) {
  alert('WARNING', 'Unusual signing rate', {
    keyId,
    rate: signingRate
  });
}
```

---

## Incident Response

### Security Incident Playbook

#### 1. Key Compromise Detected

**Immediate Actions** (within 1 hour):
1. **Revoke** compromised key in KMS
2. **Disable** all API endpoints using that key
3. **Alert** security team + management
4. **Isolate** affected systems

**Short-term** (within 24 hours):
1. **Generate** new key pair
2. **Re-sign** all affected manifests
3. **Notify** customers (if external impact)
4. **Forensics** - identify attack vector

**Long-term** (within 1 week):
1. **Publish** key revocation list
2. **Update** security documentation
3. **Conduct** post-mortem
4. **Implement** additional controls

#### 2. Manifest Tampering Detected

**Actions**:
1. **Quarantine** affected .ecox files
2. **Identify** source (user upload, internal system)
3. **Check** signature verification logs
4. **Alert** asset owners
5. **Restore** from backup (if available)

#### 3. DoS Attack

**Actions**:
1. **Enable** rate limiting (if not already)
2. **Block** offending IPs at firewall
3. **Scale** infrastructure (if legitimate traffic)
4. **Monitor** for further attacks

---

## Compliance & Certifications

### Supported Standards

| Standard | Status | Notes |
|----------|--------|-------|
| **SOC 2 Type II** | 🟢 Enterprise only | Annual audit |
| **GDPR** | 🟢 Compliant | Data minimization, no PII in manifests |
| **HIPAA** | 🟡 Configurable | Requires customer-managed keys |
| **ISO 27001** | 📅 Planned 2026 | Information security management |

### Data Residency

eco-packer does **not store** any customer data. All processing is **client-side** or **in-memory**.

For cloud deployments:
- **US**: AWS us-east-1
- **EU**: AWS eu-west-1 (GDPR compliant)
- **APAC**: AWS ap-southeast-1

---

## Reporting Vulnerabilities

### Responsible Disclosure Policy

We take security seriously. If you discover a vulnerability:

**🔒 DO**:
- Email: **security@temporaldynamics.com**
- Encrypt with PGP key: [Download](https://temporaldynamics.com/pgp-key.asc)
- Include:
  - Description of vulnerability
  - Steps to reproduce
  - Impact assessment
  - Your contact info

**❌ DON'T**:
- Publicly disclose before patch is released
- Exploit vulnerabilities maliciously
- Test on production systems without permission

### Vulnerability Disclosure Timeline

```
Day 0:  Report received → Acknowledge within 24h
Day 1:  Triage + severity assessment
Day 7:  Patch development + testing
Day 14: Patch released + CVE assigned
Day 30: Public disclosure (if requested)
```

### 🏆 Security Recognition Program

**We believe in recognizing security researchers who help make eco-packer safer.**

#### What You Could Win

Find a **Critical** or **High** severity vulnerability and you could receive:

- 🌟 **Public recognition** in our Hall of Fame (if desired)
- 📝 **CVE co-authorship** credit
- 🎯 **Direct consideration** for our Security Team
- 💼 **Interview fast-track** (skip initial screening)
- 📊 **Equity opportunity** (0.01% - 0.05% based on severity)*
- 🎓 **Mentorship** from our security advisors
- 🔐 **Early access** to new security features

*Equity grant subject to company approval and vesting schedule. Only available for Critical/High severity findings that materially improve product security.

#### Severity Levels

| Severity | Recognition | Example |
|----------|-------------|---------|
| **Critical** | Hall of Fame + Fast-track interview + Equity consideration | Private key extraction, RCE, signature forgery |
| **High** | Hall of Fame + Interview opportunity | Auth bypass, timing attacks, path traversal (pre-patch) |
| **Medium** | Public acknowledgment | DoS vectors, information disclosure |
| **Low** | Contributor credit | Documentation issues, minor info leaks |

#### 💡 Why This Matters

We're a **startup building security-critical infrastructure**. Every vulnerability you find:
- Makes our users safer
- Strengthens our product
- Builds your security portfolio
- **Opens doors** to join our team

**If you're passionate about cryptography and security, we want to meet you.**

#### Current Openings

We're actively hiring for:
- 🔐 **Security Engineer** (Remote, Full-time)
- 🛡️ **Cryptography Consultant** (Contract)
- 🔍 **Security Auditor** (Part-time)

**Discovered a critical vulnerability?** → Your report is your portfolio piece.

#### Terms & Conditions

- Recognition and equity opportunities require:
  - **Unique, original** vulnerability (not previously reported)
  - **Responsible disclosure** (no public disclosure before patch)
  - **Proof-of-concept** code demonstrating the issue
  - **Good faith** testing (no data destruction or exfiltration)
- Equity grants:
  - Subject to board approval
  - Require signing standard equity agreement
  - 4-year vesting schedule (1-year cliff)
  - Only for vulnerabilities rated Critical or High
- Employment consideration:
  - Does NOT guarantee job offer
  - Standard interview process applies
  - Must meet all hiring requirements
- We reserve the right to:
  - Adjust severity ratings based on internal assessment
  - Decline recognition if disclosure was irresponsible
  - Revoke recognition if terms are violated

**Note**: Enterprise customers have dedicated security support (24h SLA).

---

## Security Contact

- **Email**: security@temporaldynamics.com
- **PGP Key**: [Download](https://temporaldynamics.com/pgp-key.asc)
- **Fingerprint**: `0x1234 5678 90AB CDEF 1234 5678 90AB CDEF 1234 5678`
- **Emergency Hotline**: +1-555-SECURE-0 (24/7, Enterprise only)

---

**Last Updated**: November 10, 2025
**License**: MIT (Community) / Commercial (Professional/Enterprise)
**Author**: Temporal Dynamics LLC
