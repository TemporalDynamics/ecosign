# ECO Core Baseline Contract (v1)

Status: ACTIVE (Core Freeze)
Date: 2026-02-19
Scope: immutable ECO core for cross-version verification

## 1) Goal
Freeze the ECO base structure so future versions improve by extension, not replacement.

## 2) Core principle
- Core is immutable across versions.
- New capabilities MUST be additive.
- Verification of hashes/proofs/signing act MUST work without reading extensions.

## 3) Mandatory root fields (core envelope)
1. `format`
2. `format_version`
3. `version`
4. `issued_at`
5. `document`
6. `signing_act`
7. `identity`
8. `proofs`

## 4) Mandatory core blocks

### 4.1 `document`
MUST include:
- `id`
- `name`
- `mime`
- `source_hash`
- `witness_hash`

Semantics:
- `source_hash`: absolute source identity.
- `witness_hash`: verifiable witness state bound to signing evidence.

### 4.2 `signing_act`
MUST include:
- `signer_id`
- `step_index`
- `step_total`
- `signed_at`

Semantics:
- Represents the legal act in sequence context.

### 4.3 `identity`
MUST include:
- `canonical_level`
- `operational_level`
- `identity_hash`

Semantics:
- Describes signer identity assurance bound to the act.

### 4.4 `proofs`
MUST be an array.
Each proof item MUST include:
- `kind`
- `status`
- `witness_hash` (when proof binds to witness)

Semantics:
- External verifiable evidence (e.g. TSA, Rekor).
- Multiple providers are allowed.

## 5) Core compatibility rules (hard)
1. MUST NOT remove core root fields.
2. MUST NOT rename core fields.
3. MUST NOT change core field semantics.
4. MAY add optional fields.
5. MAY add extension blocks under `extensions`.

## 6) Verification baseline
A verifier can validate core correctness using only:
1. `document.source_hash`
2. `document.witness_hash`
3. `signing_act.*`
4. `identity.identity_hash`
5. `proofs[*]` consistency vs witness hash

No extension block is required for baseline cryptographic verification.

## 7) Migration rule
- `eco.v2` remains valid.
- `eco.v3+` MUST preserve this core and extend additively.

## 8) Reference baseline (existing payload)
The current ECO payload structure with fields such as `evidence_declaration`, `trust_summary`, `fields`, `signature_capture`, and `system` remains supported. These are treated as optional/core-adjacent unless explicitly moved into `extensions` by versioned contract.
