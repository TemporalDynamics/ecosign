# EcoSign How It Works (Technical, Public Surface)

Status: public-safe  
Audience: engineering, security, audit, integration teams

This document defines what can be verified externally today.
Focus: observable behavior and public contracts.

## 1) Public technical guarantees

- File identity is deterministic for the same input bytes.
- Evidence progression is append-oriented and observable through states/events.
- Verification outputs are reproducible for the same artifact inputs.
- Access capabilities enforce expiration/revocation semantics.
- Evidence artifacts (`.eco` / `.ecox`) are designed for external validation workflows.

## 2) Observable contract surface

### 2.1 File identity handling

What is verifiable:
- Same file input -> same identity output.
- Modified file input -> different identity output.

Public contract level:
- Deterministic cryptographic fingerprinting is used.
- Identity output is consumed by evidence progression and verification layers.

### 2.2 Evidence progression

What is verifiable:
- Progression is represented through explicit states/events.
- Output artifacts preserve traceability for external review.

Public contract level:
- Evidence state transitions are externally observable at artifact/API level.
- Progression is consistency-oriented, not opaque best-effort logging.

### 2.3 Verification behavior

What is verifiable:
- Same `.eco` / `.ecox` + same reference input -> same verification result.
- Invalid/tampered evidence -> explicit negative result.

Public contract level:
- Verification behavior is deterministic at output level.
- Result schema is stable enough for audit automation.

### 2.4 Access control behavior

What is verifiable:
- Expired capability -> denied.
- Revoked capability -> denied.
- Active capability -> allowed according to policy.

Public contract level:
- Access checks are capability-based and time/policy constrained.
- Runtime responses can be audited through integration tests.

## 3) External validation checklist

A technical reviewer can validate all items below without private internals:

- Deterministic identity behavior.
- Evidence state consistency across generated artifacts.
- Verification result reproducibility.
- Access expiration/revocation enforcement.
- Artifact portability for independent review flows.

## 4) Public references

- `docs/public/README.md`
- `docs/public/EPI_PUBLIC_SPEC.md`
- `docs/public/EPI_HASH_MODEL_PUBLIC_CONTRACT.md`
- `docs/public/EPI_FALSE_NEGATIVE_PUBLIC_MODEL.md`
- `packages/eco-packer-public/README.md`

## 5) Scope boundaries

This public surface intentionally excludes:

- Internal heuristics and private decision parameters.
- Implementation-level composition details beyond public contracts.
- Security-sensitive internals that reduce operational safety if disclosed.

Note:
Some components are in process of intellectual-rights registration.
During this phase, EcoSign publishes the technical surface required for external audit and integration.
