# EPI Event Model Freeze (v1)

Status: ACTIVE (Semantic Freeze)
Date: 2026-02-19
Scope: canonical events, required fields, valid states, transition rules

## 1) Canonical events (required)
The protocol recognizes these canonical events as the minimum closed set for evidentiary progression:
1. `document.protected.requested`
2. `tsa.confirmed`
3. `anchor.submitted`
4. `anchor.confirmed`
5. `artifact.finalized`
6. `eco.snapshot`
7. `workflow.completed`

No event outside this set may redefine lifecycle semantics without a contract version bump.

## 2) Required fields by event

### 2.1 `document.protected.requested`
MUST include:
- `kind`
- `at` (ISO 8601)
- `payload.document_entity_id`
- `payload.flow_type` (`DIRECT_PROTECTION` | `SIGNATURE_FLOW`)
- `payload.required_evidence` (array)
- `payload.anchor_stage` (`initial` | `intermediate` | `final`)
- `payload.policy_version`

### 2.2 `tsa.confirmed`
MUST include:
- `kind`
- `at`
- `payload.witness_hash`
- `payload.token_b64`

### 2.3 `anchor.submitted`
MUST include:
- `kind`
- `at`
- `payload.network` (`polygon` | `bitcoin`)
- `payload.witness_hash`

### 2.4 `anchor.confirmed`
MUST include:
- `kind`
- `at`
- `payload.network` (`polygon` | `bitcoin`)
- `payload.witness_hash`
- `payload.confirmed_at`

### 2.5 `artifact.finalized`
MUST include:
- `kind`
- `at`
- `payload.document_entity_id`
- `payload.witness_hash`
- `payload.policy_version`
- `payload.finalization_reference`

### 2.6 `eco.snapshot`
MUST include:
- `kind`
- `at`
- `payload.document_entity_id`
- `payload.snapshot_seq`
- `payload.witness_hash`

### 2.7 `workflow.completed`
MUST include:
- `kind`
- `at`
- `payload.workflow_id`
- `payload.completed_at`

## 3) Valid states
Lifecycle state model:
1. `snapshot`
2. `intermediate`
3. `terminal`
4. `final`

State meanings:
- `snapshot`: signer-step evidence instance.
- `intermediate`: valid in-progress process state.
- `terminal`: workflow closure reached.
- `final`: final ECO artifact state.

## 4) Transition rules (MUST)
1. `snapshot -> intermediate` allowed.
2. `intermediate -> terminal` allowed only on `workflow.completed` for `SIGNATURE_FLOW`.
3. `terminal -> final` allowed when finalization preconditions are satisfied.
4. `DIRECT_PROTECTION`: `intermediate -> final` allowed after `tsa.confirmed`.
5. `SIGNATURE_FLOW`: `final` MUST NOT occur before terminal event.
6. `anchor.submitted` and `anchor.confirmed` do not create or replace terminality by themselves.

## 5) Non-negotiable semantic invariants
1. `events[]` is append-only.
2. `snapshot` is never equivalent to `final`.
3. Anchor events are strengthening evidence, not terminality authority.
4. Any breaking semantic change requires a new freeze version.
