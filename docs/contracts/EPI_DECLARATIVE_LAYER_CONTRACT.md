# EPI Declarative Layer Contract (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: declarative/probative layer for ECO, additive over frozen ECO Core

## 1) Purpose
Define the declarative evidence layer that makes ECO self-explanatory for external verification, without changing pipeline semantics.

This contract is additive and MUST NOT alter the ECO Core baseline.

## 2) Location in payload
Declarative layer SHOULD live under:

```json
{
  "extensions": {
    "policy_declared": {},
    "evidence_observed": {},
    "policy_basis": {},
    "finalization_reference": {},
    "ecosign_attestation": {}
  }
}
```

Flat top-level projection MAY be supported for backward compatibility, but canonical location is `extensions.*`.

## 3) Block definitions

### 3.1 `policy_declared`
Declares what policy was expected to apply.

MUST include:
1. `plan_key`
2. `policy_version`
3. `policy_source`
4. `required_evidence` (array)
5. `availability_model`

Semantics:
- `required_evidence` is contractual expectation, not guaranteed synchronous completion.
- `availability_model` describes blocking behavior (e.g. `tsa_required_anchors_best_effort`).

### 3.2 `evidence_observed`
Declares what was actually observed/confirmed at issuance time.

MUST include:
1. `tsa`
2. `polygon`
3. `bitcoin`

Each of `tsa|polygon|bitcoin` MUST include:
1. `status` (`confirmed` | `pending` | `failed` | `not_applicable`)
2. `confirmed_at` (timestamp or null)

Semantics:
- This block is factual observation at issuance time.
- `pending`/`failed` on anchors does not invalidate core artifact integrity.

### 3.3 `policy_basis`
Declares why that policy applied.

MUST include:
1. `policy_version`
2. `policy_source`

SHOULD include:
1. `workspace_id` and/or `org_id`
2. `plan_effective_at`

Semantics:
- Provides traceable policy provenance.
- Must be sufficient for independent review of policy selection basis.

### 3.4 `finalization_reference`
Declares finalization state and how to resolve final evidence pointers.

MUST include:
1. `final_state` (`snapshot` | `intermediate` | `terminal` | `final`)
2. `final_artifact_hash` (hash or null)
3. `final_eco_hash` (hash or null)
4. `lookup_hint`

Semantics:
- `final_state` aligns with frozen lifecycle contract.
- Enables independent lookup/reconciliation of final artifact references.

### 3.5 `ecosign_attestation`
Declares institutional attestation metadata.

MUST include:
1. `signed_by`
2. `attestation_hash`
3. `attests_over` (array)
4. `attestation_proofs` (array)

Semantics:
- This block states what EcoSign institutionally attests for the artifact.
- Cryptographic details are defined in `ECOSIGN_ATTESTATION_SPEC.md`.

## 4) Cross-block invariants
1. `policy_declared.required_evidence` MUST be consistent with `policy_basis`.
2. `evidence_observed.*.status` MUST NOT contradict core proofs/events.
3. `finalization_reference.final_state` MUST be consistent with lifecycle rules.
4. `ecosign_attestation.attests_over` MUST reference existing payload paths.
5. Declarative fields MUST NOT rewrite or reinterpret ECO Core cryptographic identity.

## 5) Non-breaking rules
1. Declarative layer is additive only.
2. Core verification MUST succeed even when declarative layer is absent.
3. New declarative fields require versioned contract evolution, not silent semantic drift.

## 6) Minimal example

```json
{
  "extensions": {
    "policy_declared": {
      "plan_key": "pro",
      "policy_version": "policy.v1",
      "policy_source": "workspace_plan",
      "required_evidence": ["tsa", "polygon", "bitcoin"],
      "availability_model": "tsa_required_anchors_best_effort"
    },
    "evidence_observed": {
      "tsa": { "status": "confirmed", "confirmed_at": "2026-02-19T08:00:00Z" },
      "polygon": { "status": "pending", "confirmed_at": null },
      "bitcoin": { "status": "failed", "confirmed_at": null }
    },
    "policy_basis": {
      "workspace_id": "ws_123",
      "plan_effective_at": "2026-02-01T00:00:00Z",
      "policy_version": "policy.v1",
      "policy_source": "workspace_plan"
    },
    "finalization_reference": {
      "final_state": "final",
      "final_artifact_hash": "abc123...",
      "final_eco_hash": "def456...",
      "lookup_hint": "document_entity_id:dfd1e545-6a54-404e-bd25-7c9b943718f4"
    },
    "ecosign_attestation": {
      "signed_by": "ecosign-attestation@v1",
      "attestation_hash": "7890ab...",
      "attests_over": [
        "document.source_hash",
        "document.witness_hash",
        "signing_act",
        "proofs",
        "extensions.policy_declared",
        "extensions.evidence_observed",
        "extensions.finalization_reference"
      ],
      "attestation_proofs": [
        { "kind": "tsa", "status": "confirmed" }
      ]
    }
  }
}
```
