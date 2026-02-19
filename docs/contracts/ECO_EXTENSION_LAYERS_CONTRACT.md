# ECO Extension Layers Contract (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: additive extension model for ECO evolution

## 1) Purpose
Define where new semantic/probative fields are added without breaking ECO core.

## 2) Extension namespace
New blocks SHOULD be added under:

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

## 3) Required behavior
1. Core verification MUST succeed even if `extensions` are absent.
2. If present, extension data MUST NOT contradict core hashes/act/proofs.
3. Extension changes require contract versioning, not implicit runtime drift.

## 4) Extension semantics

### 4.1 `policy_declared`
Declares expected policy at issuance time.

### 4.2 `evidence_observed`
Declares what evidence was confirmed at issuance time.

### 4.3 `policy_basis`
Declares why that policy applied.

### 4.4 `finalization_reference`
Declares finalization state and lookup references.

### 4.5 `ecosign_attestation`
Declares institutional attestation metadata.

## 5) Non-breaking evolution rules
1. Additive fields only.
2. No semantic overwrite of core fields.
3. Old ECO instances remain verifiable under same core rules.
