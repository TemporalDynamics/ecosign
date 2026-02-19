# E2E Evidence Runs Log

Date: 2026-02-19
Scope: Day 2-3 real runs

## How to capture each run

Use one command per real run:

```bash
DATABASE_URL='postgresql://...' npm run epi:capture-run -- \
  --flow-type DIRECT_PROTECTION \
  --plan free \
  --entity-id <document_entity_uuid> \
  --verifier-status valid \
  --notes "real run #1"
```

For signature flow include `--workflow-id`:

```bash
DATABASE_URL='postgresql://...' npm run epi:capture-run -- \
  --flow-type SIGNATURE_FLOW \
  --plan pro \
  --entity-id <document_entity_uuid> \
  --workflow-id <workflow_uuid> \
  --verifier-status valid_intermediate \
  --notes "intermediate state"
```

Expected verifier statuses:
- direct protection (free): `valid`
- direct protection (pro): `valid`
- signature flow (intermediate): `valid_intermediate`
- signature flow (final): `valid`

## Aggregated (complete after runs)
- p95 event_to_job_gap_seconds:
- strengthening pending rate:
- strengthening failed rate:
- anchor confirmation latency (avg/p95):
- Go/No-Go recommendation:

## Run 20260219-144007
- captured_at: 2026-02-19T14:40:07Z
- flow_type: DIRECT_PROTECTION
- plan: free
- entity_id: 4dc2fa83-102e-4288-a868-7650be1df543
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: intermediate
- event_to_job_gap_seconds: -3.393
- verifier_status: valid
- notes: free direct protection real run #1
