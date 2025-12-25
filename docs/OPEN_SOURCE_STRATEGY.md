# Open Source Strategy

Goal: open the ecosystem without exposing sensitive implementation details.

## Principles

- Public by default for interfaces, schemas, and verification behavior.
- Private for proprietary packing, optimization, and internal crypto flows.
- Deterministic verification remains auditable from public artifacts.

## Repo Boundary Plan

1) Move `eco-packer/` to a private repository.
2) Publish a thin public SDK with:
   - Type definitions
   - JSON schema contracts
   - Safe stubs for pack/verify/unpack
3) Keep this repo referencing only the public SDK surface.
4) Document a clear interface for integrations and tests using fixtures only.

## Public SDK Shape (example)

```
export type EcoManifest = { ... }
export type EcoSignature = { ... }
export type EcoPackage = { ... }

export function pack(manifest, signatures, metadata): EcoPackage
export function verify(pkg): VerificationResult
export function unpack(bytes): EcoPackage
```

## Disclosure Policy

We publish what developers need to integrate and verify.
We withhold what would expose internal optimizations or protected methods.
