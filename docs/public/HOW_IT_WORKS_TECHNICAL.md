# EcoSign How It Works (Technical, Public Surface)

Status: public-safe  
Audience: engineers, security teams, auditors, integrators

This document describes the public technical behavior of EcoSign.
It is intentionally focused on externally verifiable guarantees and public contracts.

## 1) What can be independently validated today

- File identity is handled through deterministic hashing.
- Evidence progression is represented as observable states and events.
- Verification is reproducible from public outputs (`.eco` / `.ecox` + verifier).
- Signature validation uses explicit cryptographic verification.
- Access links and expiry/revocation logic are verifiable at runtime behavior level.
- Anchoring requests enforce strict input-shape validation before queueing.

## 2) File Identity Handling

The platform computes a deterministic identifier for each file.
This identifier is used for evidence tracking without requiring content interpretation.

Technical note:
- Implementation uses industry-standard cryptographic primitives.
- Specific algorithm choices are implementation details and may evolve.

## 3) Verifiability Model

Verification is designed to be reproducible for the same evidence inputs.
Given the same artifact and public metadata, verifier outputs are deterministic.

Technical note:
- Public verification behavior is stable at contract level.
- Internal optimization and assembly details are not part of the public contract.

## 4) Access and Control Surface

Access capabilities are validated through deterministic token handling,
with explicit checks for expiration, revocation and availability.

Technical note:
- Public behavior can be tested through API/runtime responses.
- Internal secret handling and hardening controls are intentionally excluded.

## 5) Anchoring and Evidence Progression

Anchoring is treated as part of evidence progression with explicit state transitions.
Input constraints and progression outcomes are observable in public-facing outputs.

Technical note:
- Network/provider integration details are not required to validate public guarantees.
- Public guarantees focus on consistency, traceability and verifiable outputs.

## 6) Public references

- `docs/public/README.md`
- `docs/public/EPI_PUBLIC_SPEC.md`
- `docs/public/EPI_HASH_MODEL_PUBLIC_CONTRACT.md`
- `docs/public/EPI_FALSE_NEGATIVE_PUBLIC_MODEL.md`
- `packages/eco-packer-public/README.md`

## 7) Scope boundaries

This public technical surface does not disclose:

- Internal heuristics and private decision parameters.
- Internal composition strategies beyond public contracts.
- Security-sensitive implementation details that could reduce operational safety.

Note:
Some components are currently under intellectual-rights registration.
During this phase, EcoSign publishes the technical surface required for external audit and integration.
