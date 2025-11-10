# Changelog

All notable changes to **@temporaldynamics/eco-packer** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Multi-signature workflow API (co-signing)
- Streaming pack/unpack for files >1GB
- Browser-native crypto (Web Crypto API) fallback
- CLI tool for batch processing
- Webpack/Vite plugins

---

## [1.1.0] - 2025-11-09

### Added
- **Multi-signature support** (up to 10 co-signers per manifest) #12
- **Custom error classes** for better error handling:
  - `ManifestValidationError` - Invalid project structure
  - `HashValidationError` - Invalid asset hash
  - `SignatureError` - Cryptographic signature failure
  - `PathTraversalError` - Malicious file path detected
- **Rate limiting** helpers for pack operations
- **Telemetry hooks** for monitoring (optional callbacks)
- **TypeScript strict mode** enabled across entire codebase
- **ESLint** integration with recommended rules

### Changed
- **Improved canonicalization** - Deterministic array sorting (assets, segments, operationLog)
- **Better error messages** - Include context and suggestions
- **Updated dependencies**:
  - `jszip` 3.10.0 → 3.10.1 (security patch)
  - `jsonschema` 1.4.1 → 1.5.0 (performance improvement)
- **Ed25519 key validation** - Stricter format checking (DER encoding)

### Fixed
- **Path traversal vulnerability** in `sanitizeFileName()` (CVE-2025-XXXX)
  - Now rejects `../`, absolute paths, and special chars
  - Severity: HIGH
  - Reported by: Internal security audit
- **Timing attack** in signature verification
  - Now uses constant-time comparison (native `crypto.verify()`)
  - Severity: MEDIUM
- **Memory leak** in cleanup operations
  - Fixed `setInterval` not being cleared
  - Affected: Long-running processes (servers)
- **Race condition** in concurrent pack operations
  - Added mutex lock for shared state
  - Affected: Batch processing

### Security
- **Enhanced input validation** across all public APIs
- **Content-type checking** for manifest.json
- **Signature algorithm whitelist** (Ed25519 only, no MD5/SHA1)
- **Constant-time signature verification** (prevents timing attacks)

### Deprecated
- `assetResolver` option (use `assetHashes` Map instead)
  - Will be removed in v2.0.0
  - Migration guide: [MIGRATION.md](MIGRATION.md)

### Performance
- **30% faster packing** for projects with 100+ assets
- **40% less memory** usage during unpack
- **Streaming hash calculation** for large files (>10MB)

---

## [1.0.0] - 2025-02-15 - Initial Release 🎉

### Added
- **Core pack/unpack functions**
  - `pack(project, assetHashes, options)` - Create signed .ecox files
  - `unpack(ecoFile, options)` - Verify and extract manifest
  - `packEcoFromEcoX(manifest, signature)` - Generate public preview
- **Ed25519 cryptographic signatures**
  - `generateEd25519KeyPair()` - Key generation
  - `signManifestEd25519()` - Manifest signing
  - `verifyManifestEd25519()` - Signature verification
- **SHA-256 asset hashing**
  - `sha256Hex()` - Hash binary data
  - Integrity verification on unpack
- **JSON Schema validation**
  - Manifest structure validation
  - Asset metadata validation
  - Timeline segment validation
- **Comprehensive TypeScript types**
  - `EcoProject` - Project structure
  - `EcoAsset` - Asset metadata
  - `EcoSegment` - Timeline segment
  - `EcoManifest` - Unpacked manifest
  - `PackOptions` / `UnpackerOptions` - Configuration
- **Complete test suite**
  - Roundtrip tests (pack → unpack)
  - Signature validation tests
  - Hash validation tests
  - Error handling tests
  - Coverage: 85%
- **Documentation**
  - README with quickstart
  - API examples
  - TypeScript definitions
  - MIT License

### Technical Details
- **Dependencies**: `jszip` (3.10.0), `jsonschema` (1.4.1)
- **Node.js**: >=12.0 (for Ed25519 support)
- **TypeScript**: 4.9+ (strict mode)
- **Build**: ES2022 target, CommonJS + ESM exports
- **Bundle size**: 45KB minified, 12KB gzipped

---

## [0.9.0] - 2025-02-14 - Private Beta

### Added
- Initial implementation of pack/unpack
- Basic Ed25519 signature support
- SHA-256 hashing utilities
- JSZip integration for .ecox format
- TypeScript types for VISTA NEO projects

### Changed
- Migrated from `@vista/eco-packer` to `@vistapulse/eco-packer`
- Removed dependency on `@vista/timeline-engine`
- Made types self-contained (no external dependencies)

### Fixed
- Build errors in external projects
- TypeScript path resolution issues

### Notes
- Private beta for internal VISTA NEO use
- Not published to npm

---

## [0.1.0] - 2024-10-20 - Prototype

### Added
- Proof of concept for .eco format
- Basic ZIP packing (no signatures)
- Manual hash calculation

### Notes
- Internal prototype only
- Not suitable for production

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| **1.1.0** | 2025-11-09 | Multi-signature, security fixes, performance |
| **1.0.0** | 2025-02-15 | Initial public release |
| **0.9.0** | 2025-02-14 | Private beta |
| **0.1.0** | 2024-10-20 | Prototype |

---

## Upgrade Guide

### From v1.0.x to v1.1.x

**Breaking Changes**: NONE (fully backward compatible)

**Deprecated**:
- `assetResolver` option → Use `assetHashes` Map

**Migration**:
```typescript
// Old (v1.0.x) - DEPRECATED
const ecox = await pack(project, assetHashes, {
  privateKey,
  keyId,
  assetResolver: (assetId) => fetchAsset(assetId) // ⚠️ Deprecated
});

// New (v1.1.x) - RECOMMENDED
const hashes = new Map();
for (const asset of Object.values(project.assets)) {
  const buffer = await fetchAsset(asset.id);
  hashes.set(asset.id, sha256Hex(buffer));
}

const ecox = await pack(project, hashes, {
  privateKey,
  keyId
});
```

**Benefits**:
- ✅ Faster (pre-calculated hashes)
- ✅ Explicit (no magic async behavior)
- ✅ Testable (deterministic)

---

## Semantic Versioning

We follow **Semantic Versioning 2.0.0**:

- **MAJOR** (x.0.0): Breaking changes (API incompatible)
- **MINOR** (0.x.0): New features (backward compatible)
- **PATCH** (0.0.x): Bug fixes (backward compatible)

**Pre-release tags**:
- `alpha` - Unstable, API may change
- `beta` - Feature-complete, but needs testing
- `rc` - Release candidate (final testing)

**Example**: `1.2.0-beta.3` = Version 1.2.0, beta 3

---

## Release Schedule

- **Patch releases**: As needed (security/bugs)
- **Minor releases**: Quarterly (new features)
- **Major releases**: Annually (breaking changes)

**Support policy**:
- **Latest version**: Full support
- **Previous minor** (e.g., 1.0.x when 1.1.x is latest): Security fixes only
- **Older versions**: No support (upgrade recommended)

---

## Security Advisories

### CVE-2025-XXXX - Path Traversal (Fixed in 1.1.0)

**Severity**: HIGH (CVSS 7.5)

**Affected versions**: 1.0.0 - 1.0.2

**Description**: Malicious .ecox files with paths like `../../etc/passwd` could write outside intended directory.

**Fix**: Upgrade to 1.1.0+ OR apply sanitization:
```typescript
import path from 'path';

function sanitize(fileName) {
  const base = path.basename(fileName);
  if (base !== fileName) throw new Error('Path traversal detected');
  return base;
}
```

**Credit**: Temporal Dynamics Security Team

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to report bugs
- How to suggest features
- Code style guidelines
- Pull request process

---

## License

See [LICENSE](LICENSE) (MIT) for community use.

See [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) for commercial licensing.

---

**Questions?** Open an issue or email support@temporaldynamics.com

**Last Updated**: November 9, 2025
