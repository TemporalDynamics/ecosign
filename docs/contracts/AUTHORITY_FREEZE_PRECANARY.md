# Authority Freeze Pre-Canary

Date: 2026-02-14

## Canonical Declarations
1. `document_entities.witness_current_storage_path` is the single source of truth for current preview/share/download artifact selection.
2. Any value in `witness_current_storage_path` must point to an immutable artifact path (`signed/...`).
3. No mutable fallback is allowed when setting canonical witness pointers.
4. Signature completion must fail hard if immutable witness upload fails.

## Storage and Access Contract
1. Signed artifacts are immutable and addressed by canonical `signed/...` path.
2. Access policy must be aligned with workflow ownership/participation for signed artifacts.
3. Bucket resolution is currently path-based; migration to explicit bucket+path columns is a planned hardening step.

## Idempotency Contract
1. Signature apply is idempotent by signer/workflow semantics.
2. Duplicate signer-signed events are prevented at DB level by unique partial index.
3. Idempotent repair is allowed only for canonical witness reconciliation, without duplicate terminal events.

## UI/Flow Contract
1. Signer completion surface must not navigate to owner documents.
2. Signer completion actions are constrained to evidence downloads (PDF/ECO).
3. Documents state rendering treats final protection/signature states as terminal (gray where defined by contract).

## Share OTP Contract
1. Resolution is canonical-first and hardened for legacy rows.
2. Share execution requires valid encryption context (`encrypted_path`, `wrapped_key`, `wrap_iv`) for OTP unwrap flow.
3. Resolver must not silently degrade to non-canonical mutable sources.

## Freeze Rule
After freeze tag, no feature work is permitted until canary observability window closes.
Only hotfixes that preserve these contracts may be accepted.
