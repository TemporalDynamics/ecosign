# EPI Contract Freeze Checklist (v1)

Status: ACTIVE
Date: 2026-02-19
Tag target: `epi-contract-freeze-v1`
Scope: protocol-level contractual freeze before non-breaking runtime implementation

## 1) Freeze artifacts (must exist)
1. `docs/contracts/EPI_EVENT_MODEL_FREEZE.md`
2. `docs/contracts/EPI_HASH_MODEL_CONTRACT.md`
3. `docs/contracts/ECO_LIFECYCLE_CONTRACT.md`
4. `docs/contracts/ECO_CORE_BASELINE_CONTRACT.md`
5. `docs/contracts/ECO_EXTENSION_LAYERS_CONTRACT.md`
6. `docs/contracts/EPI_DECLARATIVE_LAYER_CONTRACT.md`
7. `docs/contracts/ECOSIGN_ATTESTATION_SPEC.md`
8. `docs/contracts/PUBLIC_VERIFIER_SPEC.md`
9. `docs/contracts/EPI_INVARIANTS_FINAL.md`
10. `docs/contracts/EPI_FALSE_NEGATIVE_MODEL.md`
11. `docs/contracts/PROBATIVE_INDEPENDENCE_MODEL.md`

## 2) Compliance checks (contract)
Run and store outputs:

```bash
rg -n 'document\.protected\.requested|tsa\.confirmed|anchor\.submitted|anchor\.confirmed|artifact\.finalized|eco\.snapshot|workflow\.completed' docs/contracts/EPI_EVENT_MODEL_FREEZE.md -S

rg -n 'source_hash|witness_hash|signed_hash|hash_chain|composite_hash|append-only' docs/contracts/EPI_HASH_MODEL_CONTRACT.md -S

rg -n 'snapshot|intermediate|terminal|final|DIRECT_PROTECTION|SIGNATURE_FLOW|snapshot != final' docs/contracts/ECO_LIFECYCLE_CONTRACT.md -S

rg -n 'policy_declared|evidence_observed|policy_basis|finalization_reference|ecosign_attestation|plan_key|policy_version|policy_source|required_evidence|availability_model|final_state|final_artifact_hash|final_eco_hash|lookup_hint|signed_by|attestation_hash|attests_over|attestation_proofs' docs/contracts/EPI_DECLARATIVE_LAYER_CONTRACT.md -S

rg -n 'canonicalization|attestation_hash|attests_over|attestation\.mvp\.v1|attestation\.ed25519\.v1|signature_ed25519|public_key_id|TSA|Verification procedure|invalid_hash_mismatch|invalid_signature|fail-hard|final_state = final' docs/contracts/ECOSIGN_ATTESTATION_SPEC.md -S

rg -n 'Phase A|Phase B|Phase C|Phase D|Phase E|valid_intermediate|snapshot != final|SIGNATURE_FLOW|best-effort|attests_over|attestation_hash|invalid_attestation_signature|independent|offline|result codes' docs/contracts/PUBLIC_VERIFIER_SPEC.md -S

rg -n 'EPI-FINAL-001|EPI-FINAL-002|EPI-FINAL-003|EPI-FINAL-004|EPI-FINAL-005|EPI-FINAL-006|EPI-FINAL-007|valid_intermediate|phase1:gate|verify-runtime-crons\.sh|verify_epi_invariants\.sh|Go/No-Go' docs/contracts/EPI_INVARIANTS_FINAL.md -S

rg -n 'Hc|Hr|valid_intermediate|pending/failed anchors|terminality|invalid is reserved|without platform login|without platform dependency|private database|offline|third parties|hash identity|independence_verified' docs/contracts/EPI_FALSE_NEGATIVE_MODEL.md docs/contracts/PROBATIVE_INDEPENDENCE_MODEL.md -S
```

## 3) Compliance checks (runtime gates)
Required before canary/prod cut:

```bash
npm run phase1:gate
DATABASE_URL='...' bash scripts/verify-runtime-crons.sh
DATABASE_URL='...' bash verify_epi_invariants.sh
```

Expected:
1. `phase1:gate` -> `READY: 14/14 checks passed`
2. runtime cron verification -> `RESULT: PASS`
3. EPI invariants script -> `EPI invariant check PASSED.`

## 4) Non-breaking implementation policy
1. Additive-only payload evolution under `extensions.*`.
2. No rename/remove of ECO Core fields.
3. No breaking semantic changes without v2 contract and compatibility note.

## 4.1) Traceability row (mandatory)
Cross-contract traceability:
- `PUBLIC_VERIFIER_SPEC` <-> `EPI_FALSE_NEGATIVE_MODEL` <-> `PROBATIVE_INDEPENDENCE_MODEL`

Assertions (must hold exactly):
1. `core_consistent && !terminality => valid_intermediate`
2. `no platform login/private DB required`
3. `offline baseline reproducible`

## 5) Freeze declaration
If all sections above are green, protocol status is:
- Semantic freeze: LOCKED
- Cryptographic freeze: LOCKED
- Lifecycle freeze: LOCKED
- Verifier contract: LOCKED
- Attestation contract: LOCKED

Tag reference:
- `epi-contract-freeze-v1`
