# Public Verifier Spec (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: independent verification of ECO artifacts without platform account

## 1) Purpose
Define a verifier that can validate ECO evidence independently from EcoSign private infrastructure.

## 2) Inputs
Minimum required inputs:
1. ECO payload (JSON)
2. Optional presented file bytes (for direct hash check)
3. Optional external proof material (TSA/rekor references if online verification is enabled)

Verifier MUST work in offline mode for baseline checks.

## 3) Verification phases

### Phase A — Envelope and schema
1. Validate ECO envelope (`format`, `format_version`, `version`, `issued_at`).
2. Validate mandatory core blocks (`document`, `signing_act`, `identity`, `proofs`).

Failure state:
- `invalid_schema`

### Phase B — Core cryptographic consistency
1. Validate `document.source_hash` format.
2. Validate `document.witness_hash` format.
3. Validate `proofs[*].witness_hash` consistency when present.
4. If presented file is provided, compute hash and compare against declared witness/source according to context.

Failure states:
- `invalid_hash_format`
- `invalid_witness_binding`
- `presented_file_hash_mismatch`

### Phase C — Event/lifecycle coherence
1. Resolve lifecycle from declared references (`extensions.finalization_reference.final_state` when present).
2. Enforce: `snapshot != final`.
3. Enforce: `SIGNATURE_FLOW` final only after terminal reference.
4. Enforce: anchors are strengthening (pending/failed anchors do not auto-invalidate final if policy says best-effort).

Failure states:
- `invalid_lifecycle_transition`
- `invalid_terminality`

### Phase D — Declarative layer coherence
When `extensions.*` exists:
1. Check `policy_declared` required fields.
2. Check `evidence_observed` status model.
3. Check `policy_basis` provenance fields.
4. Check `finalization_reference` required fields.
5. Check internal consistency across declarative blocks.

Failure states:
- `invalid_policy_declared`
- `invalid_evidence_observed`
- `invalid_policy_basis`
- `invalid_finalization_reference`
- `declarative_inconsistency`

### Phase E — Institutional attestation
When `extensions.ecosign_attestation` exists:
1. Resolve `attests_over` projection.
2. Canonicalize projection.
3. Compute SHA-256 and compare with `attestation_hash`.
4. Verify TSA proof over `attestation_hash`.
5. If profile is Ed25519, verify signature with `public_key_id`.

Failure states:
- `invalid_attestation_hash`
- `invalid_attestation_tsa`
- `invalid_attestation_signature`
- `invalid_attestation_key_reference`

## 4) Output model
Verifier MUST return structured output:

```json
{
  "status": "valid|valid_intermediate|invalid|incomplete",
  "checks": [
    { "id": "core.hash.binding", "ok": true, "code": "ok" }
  ],
  "final_state": "snapshot|intermediate|terminal|final|unknown",
  "policy_summary": {
    "required_evidence": ["tsa", "polygon", "bitcoin"],
    "observed": {
      "tsa": "confirmed",
      "polygon": "pending",
      "bitcoin": "failed"
    }
  }
}
```

## 5) Anti-false-negative model (mandatory)
The verifier MUST distinguish invalid tampering from valid intermediate progression.

Rule:
1. If core chain is consistent and terminal conditions for final are not met, output `valid_intermediate` (not `invalid`).
2. Never mark as invalid only because strengthening anchors are pending/failed under best-effort policy.

Failure to apply this rule is a verifier defect.

## 6) Independent operation requirements
1. Verifier MUST NOT require EcoSign login/account.
2. Verifier MUST NOT require private DB access.
3. Verifier SHOULD support fully offline baseline verification.
4. Verifier MAY provide extended online checks for external proofs.

## 7) Determinism requirements
1. Same ECO input MUST produce same verifier output.
2. Result codes MUST be machine-stable.
3. Human-readable messages MAY vary by locale, but codes must not.

## 8) Canonical result codes (minimum set)
1. `ok`
2. `invalid_schema`
3. `invalid_hash_format`
4. `invalid_witness_binding`
5. `presented_file_hash_mismatch`
6. `invalid_lifecycle_transition`
7. `invalid_terminality`
8. `declarative_inconsistency`
9. `invalid_attestation_hash`
10. `invalid_attestation_tsa`
11. `invalid_attestation_signature`
12. `valid_intermediate`

## 9) Compliance criteria
A verifier implementation is compliant when:
1. It passes all phases A-E deterministically.
2. It emits machine-stable result codes.
3. It supports independent verification without platform identity.
4. It implements anti-false-negative behavior.
