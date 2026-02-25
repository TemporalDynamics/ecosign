# EPI False Negative Public Model

Status: public-safe
Updated: 2026-02-24

## Goal
Avoid classifying consistent in-progress evidence as definitive integrity failure.

## Public policy
1. `invalid` is reserved for integrity or contract violations.
2. `incomplete` means pending evidence and is not a positive verification result.
3. Missing best-effort strengthening evidence must not be treated as tampering.

## Requirement
The verifier must distinguish integrity violation, pending evidence, and unknown format.
