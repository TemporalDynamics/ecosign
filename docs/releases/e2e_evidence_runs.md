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

## Run 20260219-152117
- captured_at: 2026-02-19T15:21:17Z
- flow_type: DIRECT_PROTECTION
- plan: free
- entity_id: 97eb881e-c882-4b1f-96c3-760b3949a261
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: intermediate
- event_to_job_gap_seconds: -2.064
- verifier_status: valid
- notes: free clean rerun to rule out timing

## Run 20260219-152221
- captured_at: 2026-02-19T15:22:21Z
- flow_type: DIRECT_PROTECTION
- plan: free
- entity_id: 97eb881e-c882-4b1f-96c3-760b3949a261
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: intermediate
- event_to_job_gap_seconds: -2.064
- verifier_status: valid
- notes: free clean rerun to rule out timing

## Run 20260219-153225
- captured_at: 2026-02-19T15:32:25Z
- flow_type: DIRECT_PROTECTION
- plan: free
- entity_id: 08fc6138-3b5b-4deb-a10f-7f29a4af3fb3
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: intermediate
- event_to_job_gap_seconds: -2.656
- verifier_status: valid
- notes: free clean rerun to rule out timing

## Run 20260219-170416
- captured_at: 2026-02-19T17:04:16Z
- flow_type: DIRECT_PROTECTION
- plan: free
- entity_id: 2c6b41de-213f-4673-a655-e3fd0185412f
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: final
- event_to_job_gap_seconds: -2.936
- verifier_status: valid
- notes: free clean rerun to rule out timing

## Run 20260219-171243
- captured_at: 2026-02-19T17:12:43Z
- flow_type: DIRECT_PROTECTION
- plan: pro
- entity_id: a768ebe2-7202-4c3a-9cba-0b2974faa335
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: final
- event_to_job_gap_seconds: -2.084
- verifier_status: valid
- notes: pro direct real run #2 (finalized after retry)

## Run 20260219-193639
- captured_at: 2026-02-19T19:36:39Z
- flow_type: DIRECT_PROTECTION
- plan: pro
- entity_id: deecf083-1fa6-4467-9dfa-60b05ca05d52
- workflow_id: n/a
- workflow.completed present: NO
- finalization_reference.final_state: final
- event_to_job_gap_seconds: -44.128
- verifier_status: valid
- notes: workflow signer pro direct real run #3

## Run 20260220-043136
- captured_at: 2026-02-20T04:31:36Z
- flow_type: SIGNATURE_FLOW
- plan: pro
- entity_id: 913ad837-f7f9-422f-be24-b034fe16d7e4
- workflow_id: c25d5e07-cf2e-482a-91da-fe13096a8837
- workflow.completed present: NO
- finalization_reference.final_state: intermediate
- event_to_job_gap_seconds: -24.975
- verifier_status: valid_intermediate
- notes: signature flow step 1 intermediate

## Run 20260220-053835
- captured_at: 2026-02-20T05:38:35Z
- flow_type: SIGNATURE_FLOW
- plan: pro
- entity_id: 644e8274-3e12-4617-b020-b2d39d4058ec
- workflow_id: a3929159-48d3-4a53-939b-62a2c47d63c7
- workflow.completed present: YES
- finalization_reference.final_state: final
- event_to_job_gap_seconds: -55.024
- verifier_status: valid
- notes: signature flow pro final real run #1

## Run 20260220-124615
- captured_at: 2026-02-20T12:46:15Z
- flow_type: SIGNATURE_FLOW
- plan: free
- entity_id: 995ab523-7b06-4a27-b2ba-99bd968ccd83
- workflow_id: d3e54a45-6c01-4aac-b21a-e2e0cc4ac061
- workflow.completed present: YES
- finalization_reference.final_state: final
- event_to_job_gap_seconds: -39.418
- verifier_status: valid
- notes: signature flow free final run (intermediate + final verified)
