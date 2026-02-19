# EcoSign Attestation Spec (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: institutional attestation generation and verification for ECO

## 1) Purpose
Define how EcoSign issues and verifies institutional attestation over an ECO artifact.

This spec is additive to ECO Core and Declarative Layer contracts.

## 2) Attestation model
Two supported profiles:
1. `attestation.mvp.v1` -> `attestation_hash + TSA`
2. `attestation.ed25519.v1` -> `Ed25519 signature + attestation_hash + TSA`

Both profiles MUST state the same `attests_over` payload paths.

## 3) Canonicalization (MUST)
Before hashing/signing, payload MUST be canonicalized.

### 3.1 Canonicalization rules
1. JSON object keys sorted lexicographically.
2. UTF-8 encoding.
3. No insignificant whitespace.
4. Stable number/string/null/boolean representation.
5. Arrays keep semantic order.

### 3.2 Canonicalization target
Canonicalization input is the projection defined by `attests_over` paths.

## 4) What is attested (`attests_over`)
`attests_over` MUST be explicit and versioned.

Minimum required set:
1. `document.source_hash`
2. `document.witness_hash`
3. `signing_act`
4. `identity.identity_hash`
5. `proofs`
6. `extensions.policy_declared`
7. `extensions.evidence_observed`
8. `extensions.finalization_reference`

`attests_over` MUST NOT include volatile transport metadata.

## 5) Hashing and signature

### 5.1 `attestation_hash` (MUST)
`attestation_hash = SHA-256(canonicalized_attestation_payload)`

### 5.2 MVP profile (`attestation.mvp.v1`)
MUST include:
1. `attestation_hash`
2. TSA proof over `attestation_hash`

### 5.3 Ed25519 profile (`attestation.ed25519.v1`)
MUST include:
1. `attestation_hash`
2. `signature_ed25519` over `attestation_hash`
3. `public_key_id` (or resolvable key reference)
4. TSA proof over `attestation_hash`

## 6) Payload location
Attestation metadata SHOULD be emitted in:

```json
{
  "extensions": {
    "ecosign_attestation": {
      "profile": "attestation.ed25519.v1",
      "signed_by": "ecosign-attestation@v1",
      "attestation_hash": "...",
      "attests_over": ["..."],
      "signature_ed25519": "...",
      "public_key_id": "ecosign-attestation-key-2026-01",
      "attestation_proofs": [
        { "kind": "tsa", "status": "confirmed", "ref": "..." }
      ],
      "issued_at": "2026-02-19T00:00:00Z"
    }
  }
}
```

For MVP profile, `signature_ed25519` and `public_key_id` MAY be absent.

## 7) Verification procedure (independent verifier)
Given ECO payload:
1. Read `extensions.ecosign_attestation`.
2. Resolve `attests_over` paths and reconstruct canonical projection.
3. Canonicalize projection using Section 3 rules.
4. Compute SHA-256 and compare with `attestation_hash`.
5. Verify TSA proof over `attestation_hash`.
6. If profile is `attestation.ed25519.v1`, verify Ed25519 signature with referenced public key.

Result states:
1. `valid`
2. `invalid_hash_mismatch`
3. `invalid_tsa`
4. `invalid_signature`
5. `incomplete_attestation`

## 8) Invariants (fail-hard for final ECO)
For `final_state = final`:
1. `attestation_hash` MUST exist.
2. `attests_over` MUST exist and be non-empty.
3. TSA proof for attestation MUST exist (at least status `confirmed` or explicit auditable fallback status per policy).
4. If profile is `attestation.ed25519.v1`, signature MUST verify.

If any invariant fails, final attestation status is invalid.

## 9) Key management (normative minimum)
1. Attestation keys MUST be versioned.
2. Public key material MUST be published for verifier resolution.
3. Key rotation MUST NOT invalidate past attestations.
4. `public_key_id` MUST map to immutable public key record.

## 10) Backward compatibility
1. Existing ECO without attestation remains readable but not institutionally attested.
2. Attestation introduction is additive and MUST NOT break core verification.
3. Future profiles MUST preserve `attestation_hash` interoperability.
