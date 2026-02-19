# EPI False Negative Model (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: formal model to prevent false negatives in multi-stage evidence verification

## 1) Purpose
Define how verification distinguishes true integrity failure from valid intermediate progression.

## 2) Core principle
A verifier MUST not mark a document invalid when evidence is consistent but process is not terminal yet.

## 3) Formal decision model
Let:
1. `Hc` = canonical content identity hash (source identity equivalence class)
2. `Hr` = process/state commitment hash (or equivalent root/state commitment)
3. `terminality` = whether lifecycle terminal condition is satisfied for the flow
4. `core_consistent` = core hash/proof bindings are consistent

Decision rules:
1. If `core_consistent = false` -> `invalid`
2. If `core_consistent = true` and `terminality = false` -> `valid_intermediate`
3. If `core_consistent = true` and `terminality = true` -> `valid` (subject to required final checks)

## 4) Mandatory anti-false-negative rules
1. `snapshot` and `intermediate` states MUST map to `valid_intermediate` when core consistency holds.
2. Pending/failed anchors under best-effort policy MUST NOT produce `invalid` by themselves.
3. Missing terminal event in `SIGNATURE_FLOW` MUST produce `valid_intermediate`, not `invalid`, if core is intact.
4. `invalid` is reserved for contract/integrity violations, not expected in-progress states.

## 5) Verifier output contract
Verifier MUST emit machine-stable result codes:
1. `valid`
2. `valid_intermediate`
3. `invalid`
4. `incomplete`

Minimum anti-false-negative codes:
1. `valid_intermediate`
2. `invalid_terminality` (only when terminality is claimed but inconsistent)
3. `declarative_inconsistency` (policy/evidence mismatch)

## 6) Examples

### Example A — valid intermediate
- Core hashes consistent
- TSA confirmed
- Signature flow not terminal
Result: `valid_intermediate`

### Example B — valid final with best-effort anchors
- Core hashes consistent
- Terminality reached
- Anchors pending/failed under best-effort
Result: `valid`

### Example C — invalid
- Proof witness hash mismatches document witness hash
Result: `invalid`

## 7) Compliance criteria
An implementation is compliant when:
1. It never labels consistent intermediate states as invalid.
2. It preserves deterministic outcomes for same input.
3. It aligns with lifecycle and policy contracts.
