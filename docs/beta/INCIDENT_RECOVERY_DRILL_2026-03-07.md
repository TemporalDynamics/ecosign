# Incident Recovery Drill

- Generated at (UTC): 2026-03-07T03:21:52Z
- Drill type: projection/evidence recovery + post-incident verification
- DB target: postgresql://postgres:postgres@127.0.0.1:54322/postgres

## Result Summary

- Projection rebuild transactional drill: PASSED
- Runtime canonical post-check: PASS
- Invariant observability post-check: PASS
- Schema drift post-check: PASS

## Projection Drill Excerpt

```text
=== Final verdict ===
 ✅ INCIDENT PROJECTION DRILL PASSED
```

## Runtime Verification Excerpt

```text
=== Baseline runtime canonical smoke ===
✅ Runtime baseline snapshot written to docs/baselines/runtime_baseline_2026-03-07.md
```

## Invariant Observability Excerpt

```text

> ecosign@1.0.0 diag:invariant-observability
> bash scripts/diagnostics/check-invariant-observability.sh

=== Runtime invariant scan ===
scan={"high_attempt_jobs": 0, "stale_queued_jobs": 18, "stuck_running_jobs": 0}

=== Invariant violations (last 24h) ===
             code             |                source                | severity | total_occurrences |         last_seen_at          
------------------------------+--------------------------------------+----------+-------------------+-------------------------------
 executor.jobs.queue_stale    | db.scan_runtime_invariant_violations | warning  |                 7 | 2026-03-07 03:21:51.570181+00
 internal.auth.out_of_channel | process-signer-signed                | warning  |                 2 | 2026-03-07 03:21:50.547067+00
(2 rows)


critical_last_24h=0
✅ Invariant observability check completed.
```

## Schema Drift Excerpt

```text

> ecosign@1.0.0 diag:schema-drift
> bash scripts/diagnostics/check-schema-drift.sh

[schema-drift] OK schema=public hash=81cf768cf6f82d62dee32be75f0b2e48e7c52a949e92d64425adbc344ead6447
```
