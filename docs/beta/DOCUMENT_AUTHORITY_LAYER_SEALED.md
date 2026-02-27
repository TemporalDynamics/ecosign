# Document Authority Layer Sealed (Milestone)

Fecha de cierre: 2026-02-27

## Objetivo
Formalizar que la autoridad documental opera con una unica fuente de verdad:
`document_entities.events[]` (ledger append-only) y que toda proyeccion legacy
queda derivada y no autoritativa.

## Invariantes de cierre
1. Autoridad unica
- La historia autoritativa de un documento vive en `document_entities.events[]`.
- `document_entity_id` es la identidad canónica del documento.

2. Escritura canónica de eventos
- Los eventos se escriben via RPC `append_document_entity_event`.
- El envelope exige:
  - `id`, `kind`, `at`, `v`, `actor`, `entity_id`, `correlation_id`.
- Regla canónica:
  - `entity_id == document_entity_id`
  - `correlation_id == document_entity_id`

3. Append-only + dedupe atómico
- El RPC valida estructura mínima del evento.
- El RPC toma lock `FOR UPDATE` sobre la entidad antes de append.
- Dedupe atómico para eventos críticos de anchor.

4. Proyección legacy congelada
- `user_documents` no es fuente de verdad.
- Escrituras directas quedan bloqueadas por trigger de freeze.
- Solo se permiten paths explícitos de proyección/mantenimiento.

## Evidencia de cierre
1. Helper canónico de eventos:
- `supabase/functions/_shared/eventHelper.ts`

2. RPC SQL de append canónico:
- `supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql`

3. Freeze de proyección legacy:
- `supabase/migrations/20260301001000_freeze_user_documents_writes.sql`

4. Guards existentes que dependen de este contrato:
- `tests/authority/nonlegacy_user_documents_guard.test.ts`
- `tests/authority/share_runtime_canonical_guard.test.ts`
- `tests/authority/invites_access_canonical_guard.test.ts`

## Criterio de aceptación
El milestone se considera sellado si:
1. El append canónico por RPC sigue vigente con envelope estricto.
2. La proyección legacy sigue congelada para escritura directa.
3. El guard de milestone y el gate `prebeta_fire_drill` están en verde.

## Fuera de alcance
1. SLA comercial de colas/workers.
2. UX de estados probatorios.
3. Optimización de polling/retry de redes.
