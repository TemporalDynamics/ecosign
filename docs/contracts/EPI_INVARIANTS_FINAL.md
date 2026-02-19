# EPI Invariants Final (v1)

Status: ACTIVE (Final Invariants Freeze)
Date: 2026-02-19
Scope: fail-hard invariants for ECO, lifecycle, attestation, and verifier alignment

## 1) Purpose
Define the final non-negotiable invariants that govern evidentiary validity.
Any violation in fail-hard set invalidates final evidentiary state.

## 2) Fail-hard invariants (mandatory)

### EPI-FINAL-001 — `artifact.finalized` requires `tsa.confirmed`
Rule:
- A final artifact MUST NOT be emitted without TSA confirmation in canonical events.

Failure effect:
- Finalization is invalid.

### EPI-FINAL-002 — Snapshot never produces final in `SIGNATURE_FLOW`
Rule:
- `snapshot` and `intermediate` states MUST NOT emit final ECO in signature flow.
- Final is allowed only after terminal reference (`workflow.completed` or contract-equivalent).

Failure effect:
- Lifecycle invalidity (`invalid_terminality`).

### EPI-FINAL-003 — `witness_hash` immutability per act
Rule:
- Per emitted ECO act, witness binding MUST be immutable.
- Retroactive witness rewrite is forbidden.

Failure effect:
- Hash-chain integrity violation.

### EPI-FINAL-004 — Anchors never hard-block final under best-effort policy
Rule:
- If policy declares anchors as best-effort strengthening, `pending/failed` anchors MUST NOT invalidate final by themselves.

Failure effect:
- Verifier false-negative defect.

### EPI-FINAL-005 — `events[]` append-only
Rule:
- Canonical event ledger must be append-only.
- Historical event mutation/shrink is forbidden.

Failure effect:
- Canonical authority corruption.

### EPI-FINAL-006 — `policy_version` mandatory
Rule:
- Declarative policy block MUST include policy version.
- Final ECO MUST expose policy provenance.

Failure effect:
- Policy unverifiable.

### EPI-FINAL-007 — `attestation_hash` mandatory in final ECO
Rule:
- For `final_state = final`, attestation hash MUST exist and be verifiable against declared projection.

Failure effect:
- Institutional attestation invalid/incomplete.

## 3) Strong consistency invariants

### EPI-FINAL-008 — Proof witness binding
Rule:
- When proofs include `witness_hash`, it MUST match `document.witness_hash`.

### EPI-FINAL-009 — `attests_over` path integrity
Rule:
- `attests_over` MUST reference valid payload paths and must not include volatile transport metadata.

### EPI-FINAL-010 — Deterministic verification
Rule:
- Same ECO input MUST produce same verifier status/codes.

## 4) Verifier outcome invariants
1. `valid_intermediate` MUST be used when chain is consistent but final terminality is not reached.
2. `invalid` MUST be reserved for integrity/contract violations, not expected in-progress states.
3. Result codes MUST be machine-stable.

## 5) Execution mapping (how to enforce)

### 5.1 Scripts / checks
- `npm run phase1:gate`
  - Covers core architecture invariants and single-entrypoint drift checks.
- `bash scripts/verify-runtime-crons.sh`
  - Ensures legacy execution crons do not reintroduce dual authority.
- `bash verify_epi_invariants.sh`
  - Verifies immutable witness invariants in runtime DB.

### 5.2 Contract-level checks
- `PUBLIC_VERIFIER_SPEC.md`
  - Enforces lifecycle, anti-false-negative, and attestation outcomes.
- `ECOSIGN_ATTESTATION_SPEC.md`
  - Enforces attestation hash/signature/TSA conditions.

### 5.3 SQL check examples (minimum)
```sql
-- artifact.finalized without TSA confirmation (must be 0)
SELECT de.id
FROM document_entities de
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(de.events) e
  WHERE e->>'kind' = 'artifact.finalized'
)
AND NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(de.events) e
  WHERE e->>'kind' = 'tsa.confirmed'
);

-- final ECO missing attestation hash (must be 0)
-- (for projected table/materialization where final ECO is stored)
SELECT eco_id
FROM eco_artifacts
WHERE final_state = 'final'
  AND (attestation_hash IS NULL OR attestation_hash = '');
```

## 6) Go/No-Go gate
Go only if all are true:
1. Fail-hard invariants EPI-FINAL-001..007 satisfied.
2. Verifier supports `valid_intermediate` and anti-false-negative behavior.
3. Final ECO carries policy provenance + attestation metadata.
4. Canonical event model, hash model, and lifecycle model remain frozen.

No-Go if any fail-hard invariant is violated.

## 7) Versioning rule
Any breaking change to these invariants requires:
1. New contract version.
2. Migration note.
3. Explicit verifier compatibility statement.
