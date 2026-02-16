# Backfill Decision - Canonical Migration

Effective Date: 2026-02-16
Status: Approved
Decision Type: Partial backfill

## 1) Scope

Included:
- Active/operational documents that still participate in current canonical flows.
- Rows required to guarantee decision consistency for ongoing pipeline executions.

Excluded:
- Fully historical/archived legacy records not used by current canonical decisioning.
- Low-value historical data where backfill cost exceeds operational value.

## 2) Rationale

- Decision path is already canonical (`events[]`), so full historical backfill is not a hard runtime dependency.
- Partial backfill captures high operational value with lower migration risk and shorter execution window.

## 3) Implementation Contract

1. Backfill process must be idempotent.
2. Backfill must append canonical events, never mutate existing event history.
3. Each backfilled batch must emit an auditable report (counts, failures, skipped rows).
4. Backfill must not introduce alternative authority paths.

## 4) Validation

Required checks after each backfill run:
- `bash scripts/diagnostics/check-canonical-readiness.sh`
- `scripts/diagnostics/check-decision-path-clean.sh`
- Consistency query: no new documents in active scope without required canonical evidence fields.

## 5) Rollback Plan

- Pre-run snapshot of impacted rows and IDs.
- If validation fails:
  - stop subsequent batches,
  - restore from snapshot or replay append-only corrective events,
  - re-run validation gate before resuming.

## 6) Accepted Consequences

- Mixed historical state is acceptable for excluded legacy records.
- Canonical authority remains intact because decisions do not depend on excluded legacy projections.
