# Anchor Layer Sealed (Milestone)

Fecha de cierre: 2026-02-27  
Tag de cierre: `v1.6.8-anchor-liveness-isolation`

## Objetivo
Declarar formalmente que la capa de anchoring opera con invariantes
deterministas de concurrencia, idempotencia y liveness, sin depender de
timing probabilistico.

## Invariantes de cierre
1. Concurrencia determinista
- Claim de anchors por lote via RPC `claim_anchor_batch`.
- Uso de `FOR UPDATE SKIP LOCKED`.
- Reclaim de anchors stale en `processing`.

2. Idempotencia determinista
- Dedupe transaccional de eventos en `append_document_entity_event`.
- Outbox de notificaciones con unicidad por
  `(workflow_id, recipient_email, notification_type)`.
- Enqueue por `upsert(... onConflict ...)`.

3. Liveness determinista
- Worker Bitcoin procesa anchors por unidad (`try/catch/finally` por anchor)
  en fases `queued` y `pending`.
- Un anchor defectuoso no aborta el lote completo.
- `processed` avanza por anchor para evitar starvation por excepcion de lote.

4. State machine de anchors
- Retry policy explicita por red.
- Timeout determinista por edad y/o max attempts.
- Estados terminales canónicos: `anchor.confirmed`, `anchor.timeout`,
  `anchor.failed`.

## Evidencia de cierre
1. Migracion de hardening SQL:
- `supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql`

2. Workers canónicos:
- `supabase/functions/process-bitcoin-anchors/index.ts`
- `supabase/functions/process-polygon-anchors/index.ts`

3. Guardrails:
- `tests/authority/anchor_timeout_state_machine_guard.test.ts`
- `tests/authority/anchors_canonical_guard.test.ts`

4. Verificacion:
- `npm run test -- tests/authority`
- `npm run typecheck`

## Criterio de aceptacion
El milestone se considera sellado si:
1. Los guards de autoridad anteriores estan en verde.
2. No hay regresiones de claim/dedupe/outbox/liveness por anchor.
3. El tag de cierre apunta a un commit en `main` con estas garantias.

## Fuera de alcance del milestone
1. Politicas comerciales de SLA por red.
2. Optimizacion de retries por plan.
3. Ajustes de copy/UI comercial.
