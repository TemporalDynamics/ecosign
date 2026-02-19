# ECO Lifecycle Contract (v1)

Status: ACTIVE
Date: 2026-02-19
Scope: lifecycle semantics for snapshot/intermediate/terminal/final

## 1) Lifecycle states
1. `snapshot`
2. `intermediate`
3. `terminal`
4. `final`

## 2) Definitions
- `snapshot`: per-step evidence instance generated during flow progress.
- `intermediate`: valid non-final operational state.
- `terminal`: closure event reached (workflow terminal).
- `final`: single final ECO artifact state.

## 3) Flow-specific gating

### 3.1 `DIRECT_PROTECTION`
1. `final` may be produced after `tsa.confirmed`.
2. Anchors are best-effort strengthening and MUST NOT hard-block finalization.

### 3.2 `SIGNATURE_FLOW`
1. `final` MUST NOT be produced before terminal event.
2. Terminal event authority: `workflow.completed` (or contract-equivalent terminal event).
3. Snapshots may be emitted before terminal and are valid non-final evidence.

## 4) Finalization requirements
`final` requires:
1. terminality condition satisfied for flow type.
2. policy version resolved.
3. canonical witness state bound.

## 5) Strengthening policy (anchors)
1. Anchors (`polygon`, `bitcoin`) are strengthening evidence.
2. Anchors may be `pending`/`failed` without invalidating final ECO.
3. Final ECO MUST reflect strengthening status explicitly.

## 6) Invariants
1. `snapshot != final` always.
2. No direct `snapshot -> final` transition in `SIGNATURE_FLOW`.
3. Lifecycle transitions are monotonic and auditable from events.
