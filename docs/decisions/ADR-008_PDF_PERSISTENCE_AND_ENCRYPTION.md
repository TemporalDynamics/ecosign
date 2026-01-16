# ADR-008: PDF Persistence and Uniform Encryption

## Status
Implemented (core rules)

## Date
2026-01-15

## Context
PDF storage behavior is inconsistent across flows. Some documents are listed without a
canonical, persisted original PDF. Some probative actions create witness hashes without
persisted witness PDFs. Encryption is applied only in specific custody paths.

This breaks UI truthfulness, forensic integrity, and product expectations.

See `docs/contracts/PDF_STORAGE_CONTRACT.md` for the canonical rules.

## Decision
1) **Keep `hash_only`** but still **persist an encrypted original PDF** for all documents
   that appear in Documents.
2) **Enforce uniform encryption** for all PDFs containing user content:
   - Original PDFs must be encrypted at rest.
   - Witness PDFs must be encrypted at rest.
3) **Probative actions must always persist a witness PDF** (not just a hash).

## Consequences
- Existing flows that create documents without encrypted originals must be updated.
- Workflows that produce witness hashes without storage paths must be fixed.
- Storage paths and UI should be aligned to always show a valid PDF when a document is listed.
- Additional migration or backfill may be required for existing documents.

## Follow-ups
- Update document creation flows to always store encrypted originals.
- Update probative flows to always persist witness PDFs.
- Align UI derivation to the contract once persistence guarantees exist.

## Implementation Notes
- Core rules A/B/C implemented for canonical storage paths in custody.
- Pending: workflow operational PDFs still live in `user-documents` for signer UX.
  These are non-canonical and must be replaced by a secure signer access flow.
