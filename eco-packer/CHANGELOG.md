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
- **Multi-signature support** (up to 10 co-signers per manifest)
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

**Last Updated**: November 10, 2025
