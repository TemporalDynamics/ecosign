# Test protect_document_v2 Locally

Goal: verify `document.protected.requested` + `protect_document_v2` job.

## Step 1: Enable v2 flag
Create or edit `client/.env.local`:
```env
VITE_USE_PROTECT_V2=true
```

Restart the Vite dev server after changing envs.

## Step 2: Create/protect a document in UI
Use the normal flow in the app to protect a document.

## Step 3: Verify the v2 request event
```sql
SELECT
  id,
  jsonb_path_query_array(events, '$[*] ? (@.kind == "document.protected.requested")') AS v2_request
FROM document_entities
ORDER BY created_at DESC
LIMIT 1;
```

Expected: `v2_request` is not empty.

## Step 4: Verify the v2 job
```sql
SELECT id, type, status
FROM executor_jobs
ORDER BY created_at DESC
LIMIT 1;
```

Expected:
- `type = protect_document_v2`
- `status = queued` (or `succeeded` if executor ran)

## Optional: Run executor locally
See `docs/ops/run-executor-local.md`.
