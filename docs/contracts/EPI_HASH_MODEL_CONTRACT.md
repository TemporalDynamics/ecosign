# EPI Hash Model Contract (v1)

Status: ACTIVE (Cryptographic Freeze)
Date: 2026-02-19
Scope: canonical hash semantics and immutability rules

## 1) Canonical hash roles
1. `source_hash` = absolute identity of source truth.
2. `witness_hash` = verifiable witness state hash.
3. `signed_hash` = signed witness state hash.
4. `hash_chain` = mandatory append-only chain (`source -> witness -> signed`).
5. `composite_hash` = optional deterministic commitment of canonical state.

## 2) Presence and ordering rules
1. `source_hash` MUST exist.
2. `witness_hash` MUST NOT exist without `source_hash`.
3. `signed_hash` MUST NOT exist without `witness_hash`.
4. `composite_hash` MAY exist only if derived deterministically from canonical inputs.

## 3) Immutability rules
1. Previous hash links MUST never be replaced.
2. Retroactive witness recalculation is forbidden.
3. Hash chain is append-only; no rewrites of prior links.

## 4) Determinism rules
1. Same canonical input produces same hash outputs.
2. `composite_hash` MUST be deterministic for the same canonical snapshot.
3. Hash generation must not depend on non-canonical mutable state.

## 5) Evidentiary consistency rules
1. External proofs (`tsa`, anchors) MUST reference the same canonical witness state.
2. Proof mismatch against canonical witness state invalidates that proof binding.
3. Missing strengthening proofs does not invalidate source identity or chain integrity.

## 6) Prohibitions
1. No hash substitution of earlier links.
2. No silent fallback that mutates canonical hash meaning.
3. No semantic reuse of hash fields for non-hash payloads.
