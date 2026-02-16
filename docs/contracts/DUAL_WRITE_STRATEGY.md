# Dual Write Strategy - Production Contract

Date: 2026-02-16
Status: Active
Owner: Platform

## 1) Current Model

- Canonical authority: `document_entities.events[]`
- Operational projections: `anchors`, `user_documents`, caches/derived fields
- Decision path: events-only

## 2) Allowed vs Forbidden

Allowed (operational):
- Writing projection tables for query speed, reporting, compatibility, or operator workflows.
- Maintaining non-authoritative status fields as convenience projections.

Forbidden (authority leak):
- Any read from `anchors`, `user_documents`, or other legacy/projection tables that changes canonical next-step decisions.
- Any progression logic that bypasses canonical events.

## 3) Contractual Rules

1. Decisions must remain `F(events[]) -> jobs`.
2. Projections may lag or diverge transiently, but never define "what follows".
3. Canonical events are the only source for final pipeline truth.
4. If projection conflicts with events, events win.

## 4) Verification

- Decision path cleanliness:
  - `scripts/diagnostics/check-decision-path-clean.sh`
- Canonical readiness gate:
  - `bash scripts/diagnostics/check-canonical-readiness.sh`
- Canonical proof:
  - `scripts/test-canonical-only-proof.sh`

## 5) Future Cleanup (Post-Switch)

- Replace projection-dependent operational queries with event-derived views where cost-effective.
- Remove obsolete projection writes once equivalent event-derived reads are validated.
- Keep this as a phased optimization, not a blocker for canonical authority switch.
