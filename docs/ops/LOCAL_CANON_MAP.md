# Mapa de Verdad Canonica (Local)

Este documento fija el estado real del sistema y el orden de trabajo para evitar
confundir la verdad local con la remota.

## Estado real hoy
- Supabase LOCAL: sano y canonico.
  - Migraciones completas.
  - Triggers activos.
  - `document_entities` funcionando.
  - `events[]` append-only funcionando.
  - TSA canonica funcionando.
  - `witness_hash` garantizado para `hash_only`.
- Supabase REMOTO: no confiable como referencia.
  - Migraciones infra (cron.job) bloquean.
  - Mezcla de epocas.
  - No refleja lo que se prueba.

## Regla central
- LOCAL es la unica verdad mientras dure la fase de canonizacion.

## FASE 0 — Congelar (ahora)
- NO usar `db push`.
- NO tocar remoto.
- NO crear nuevas migraciones.
- Solo trabajar en LOCAL.

## FASE 1 — Canonizar LOCAL (completada)
- `document_entities` = ECOX canonico.
- `events[]` append-only con guards.
- TSA canonica escribiendo en `events[]`.
- `witness_hash` garantizado para `hash_only`.
- Hito documentado: `docs/ops/HITO_CORE_E2E_LOCAL.md`.

## FASE 2 — Clasificar (solo lectura, sin ejecutar)
- Clasificar migraciones en tres grupos:
  - CORE: invariantes, events, TSA rules.
  - INFRA: cron.job, workers, toggles operativos.
  - LEGACY: flujos antiguos y migraciones historicas.

## FASE 3 — Reconciliar REMOTO (despues, con calma)
- Solo si LOCAL esta 100% probado.
- Separar CORE de INFRA.
- Evitar que INFRA bloquee `db push`.
- Reconciliar remoto con un plan unico y controlado.
