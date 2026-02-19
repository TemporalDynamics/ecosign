# Probative Independence Model (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: independent evidentiary verification without platform dependency

## 1) Purpose
Define the model that allows third parties (including experts/peritos) to verify evidence without requiring EcoSign account access.

## 2) Independence requirements (MUST)
1. Verification MUST be possible without platform login.
2. Verification MUST NOT require private database access.
3. Verification MUST work from ECO payload + public verification material.
4. Core integrity checks MUST be reproducible offline.

## 3) Evidence components for independent verification
Minimum set:
1. Core ECO fields (`document`, `signing_act`, `identity`, `proofs`)
2. Declarative layer (`extensions.*`) when present
3. Attestation metadata (`extensions.ecosign_attestation`) when present

Optional online augmentation:
1. External TSA proof fetch/verification
2. Rekor transparency lookup

## 4) Identity and hash principle
1. Hash identity is cryptographic, not account-based.
2. `source_hash` anchors source identity.
3. `witness_hash` anchors witnessed signed state.
4. Proofs must bind to witness identity where applicable.

## 5) Platform-independence guarantees
1. EcoSign service outage MUST NOT prevent baseline verification.
2. Verifier implementations by third parties MUST be possible from public specs.
3. Institutional attestation verification MUST rely on published key references and proofs.

## 6) Legal/probative posture
The model is considered probatively independent when an external verifier can answer:
1. What was signed (hash identity)?
2. Who signed (identity assurance declaration)?
3. When it was evidenced (timestamps/proofs)?
4. Whether state is final or intermediate (lifecycle consistency)?
5. Whether institutional attestation is valid (when present)?

## 7) Failure classification
1. `independence_blocked` -> required data not available in artifact/spec
2. `independence_partial` -> baseline checks pass offline, external proof checks unavailable
3. `independence_verified` -> baseline + declared external checks pass

## 8) Compliance criteria
A system satisfies probative independence when:
1. It exposes stable contracts for verifier behavior.
2. It allows deterministic third-party verification from artifact data.
3. It does not require hidden platform context for baseline validity judgment.
