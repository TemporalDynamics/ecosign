# Polygon Flow Code Audit

Date: 2026-01-17
Scope: Code-only audit (no production data)
Goal: Map real code paths, identify duplicates/dead paths, and define the canonical flow.

## Canonical Path (target)

trigger -> anchor-polygon -> process-polygon-anchors

- Trigger: register intent only (no execution, no retry).
- anchor-polygon: submit TX + create anchor record (idempotent).
- process-polygon-anchors: confirm chain + append canonical event.

## Actual Call Sites (code)

### Calls to `anchor-polygon`

- DB trigger (canonical):
  - `supabase/migrations/20260116120000_fix_blockchain_trigger_no_app_settings.sql`
  - Calls `pg_net.http_post` -> `/functions/v1/anchor-polygon` on INSERT when `user_documents.polygon_status = 'pending'`.

- Server-side (non-canonical / duplicate path):
  - `supabase/functions/process-signature/index.ts` invokes `anchor-polygon` directly.
  - `supabase/functions/signnow-webhook/index.ts` invokes `anchor-polygon` directly.

- Client-side (dead path / duplicate intent):
  - `client/src/lib/polygonAnchor.ts` invokes `anchor-polygon` directly.
  - No in-repo usage found for `anchorToPolygon` (likely unused/dead).

- Legacy path:
  - `supabase/functions/_legacy/anchor-polygon/index.ts` exists (duplicate implementation).

### Calls to `process-polygon-anchors`

- Cron job only (canonical):
  - `supabase/functions/process-polygon-anchors/cron.sql`
  - `supabase/migrations/20260111060100_fix_cron_jobs.sql`

- Legacy path:
  - `supabase/functions/_legacy/process-polygon-anchors/index.ts`

## Component Responsibilities (current code)

### Trigger (DB)
- File: `supabase/migrations/20260116120000_fix_blockchain_trigger_no_app_settings.sql`
- Condition: on `user_documents` INSERT where `polygon_status = 'pending'`.
- Action: `http_post` -> `anchor-polygon`.
- Writes: none directly.
- Notes: no canonical event emitted here (requested/submitted).

### `anchor-polygon` (edge)
- File: `supabase/functions/anchor-polygon/index.ts`
- Writes:
  - `anchors`: insert pending record, `polygon_tx_hash`, `polygon_status= pending`.
  - `user_documents`: updates `overall_status='pending_anchor'`, `polygon_anchor_id`.
  - `anchor_states`: upsert `anchor_requested_at` (project tracking).
- Does NOT write canonical events to `document_entities.events[]`.
- Logging: `logger.info/error` only.

### `process-polygon-anchors` (cron)
- File: `supabase/functions/process-polygon-anchors/index.ts`
- Reads:
  - `anchors` where `anchor_type='polygon'` and status pending/processing.
- Writes:
  - `anchors`: status -> processing/confirmed/failed, attempts, error.
  - `user_documents`: via `anchor_polygon_atomic_tx` (confirmed, download_enabled, etc.).
  - `document_entities.events[]`: canonical anchor event appended.
  - `anchor_states`: `polygon_confirmed_at` for project tracking.
  - `workflow_notifications`: inserts `polygon_confirmed` notification.
  - `audit_logs`: via `anchor_polygon_atomic_tx`.
- Observability:
  - `logAnchorAttempt` and `logAnchorFailed` write to legacy `events` table.

### `anchor_polygon_atomic_tx` (SQL)
- File: `supabase/migrations/20251213000000_polygon_atomic_tx.sql`
- Atomic update of `anchors` + `user_documents` + `audit_logs`.

## Duplications / Dead Paths

1) **Direct calls to `anchor-polygon` from server code**
   - `process-signature` and `signnow-webhook` bypass trigger.
   - Duplicates canonical path and makes origin ambiguous.

2) **Client-side `anchorToPolygon`**
   - `client/src/lib/polygonAnchor.ts` calls edge function directly.
   - No usage found. Likely dead; should be removed or marked legacy.

3) **Legacy edge functions**
   - `_legacy/anchor-polygon` and `_legacy/process-polygon-anchors` exist.
   - Duplicate logic; should be disabled or archived.

4) **Dual logs**
   - Canonical events go to `document_entities.events[]`.
   - `logAnchorAttempt`/`logAnchorFailed` write to legacy `events` table.
   - This is operational telemetry, not canonical truth.

## Gaps vs Canonical Contract

- **Missing canonical events** at intent/submission time.
  - No `polygon.anchor.requested` or `polygon.anchor.submitted` in `document_entities.events[]`.
  - Only confirmation event is canonical.

- **Multiple initiators** (trigger + server functions + client).
  - Violates “single authority” design.

## Recommendation (no refactor yet)

- Declare canonical path: trigger -> anchor-polygon -> process-polygon-anchors.
- Deprecate non-canonical initiators:
  - `process-signature` and `signnow-webhook` direct calls.
  - Client `anchorToPolygon` usage.
  - `_legacy/*` edge functions.
- Keep `anchors` as operational telemetry only.
- Keep `document_entities.events[]` as sole canonical truth.

## Production Appendix (snapshot)

Date: 2026-01-17  
Source: Direct SQL queries (production)

### Results

- Anchors pending > 24h: 3 (all legacy with `user_document_id = NULL`, created 2025-11/12, attempts = 0).
- Anchors confirmed without canonical event: 0.
- Documents with TSA but no Polygon anchor: 0.
- Polygon anchor counts:
  - `failed/failed`: 11 (historical)
  - `pending/pending`: 3 (legacy)
- Polygon anchors created last 7 days: 0.

### Interpretation

- Canonical path is clean (no confirmed anchors missing events, no TSA-only documents).
- Pending anchors are legacy with missing linkage; worker cannot process without context.
- Failures are historical; no recent activity to re-evaluate.

## Files of Interest

- Trigger: `supabase/migrations/20260116120000_fix_blockchain_trigger_no_app_settings.sql`
- Edge submitter: `supabase/functions/anchor-polygon/index.ts`
- Cron confirmer: `supabase/functions/process-polygon-anchors/index.ts`
- Atomic update: `supabase/migrations/20251213000000_polygon_atomic_tx.sql`
- Legacy submitter: `supabase/functions/_legacy/anchor-polygon/index.ts`
- Legacy cron: `supabase/functions/_legacy/process-polygon-anchors/index.ts`
- Client legacy: `client/src/lib/polygonAnchor.ts`
