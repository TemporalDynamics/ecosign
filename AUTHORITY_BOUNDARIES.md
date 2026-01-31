# Authority Boundaries

This repo intentionally separates **operational authority** (when/where work runs) from **semantic authority** (what is true).

If these roles blur, the system becomes non-auditable and fragile (races, double-writes, undefined ownership).

## Orchestrator (Operational Authority)

Owns: time, scheduling, liveness, retries.

Allowed:
- Claim/reclaim jobs (locking, TTL, dead-lettering)
- Transition executor job states (`queued`, `running`, `failed`, `dead`, ...)
- Invoke workers / edge functions to execute work

Forbidden:
- Writing canonical/probative facts (document evidence events)
- Making domain decisions (what should happen)

## Executor (Semantic Authority)

Owns: domain meaning, canonical/probative facts.

Allowed:
- Evaluate domain state and decide next jobs (decision step)
- Execute domain actions (TSA, anchors, artifact generation)
- Append canonical events to `document_entities.events[]` via `append_document_entity_event()`

Forbidden:
- Global scheduling policy (TTLs, reclaim, kill/rewire other workers)
- Competing with Orchestrator for lock ownership or job orchestration

## Database (Final Arbiter)

Owns: invariants.

The DB must reject histories that violate canonical rules (append-only, uniqueness, ordering prerequisites).

Examples:
- `document_entities.events[]` is append-only
- TSA evidence is unique per document entity
- TSA evidence requires an explicit request event beforehand
