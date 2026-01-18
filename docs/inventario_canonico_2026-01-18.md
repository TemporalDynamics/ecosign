# Inventario Canónico — Anchoring & Background (2026-01-18T06:04:13.201Z)

Resumen: inventario generado desde código y migraciones; incluye triggers, cron jobs y edge functions relevantes para el flujo de anchoring (Polygon / Bitcoin) y workers auxiliares.

| tipo | nombre | path | schedule | auth_pattern | callers | notes |
|---|---|---|---|---|---|---|
| trigger | on_user_documents_blockchain_anchoring | supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql | (n/a) | current_setting('app.settings.supabase_url') / current_setting('app.settings.service_role_key') | DB trigger (pg_net.http_post) → anchor-polygon / anchor-bitcoin | Invoca /functions/v1/anchor-polygon y /anchor-bitcoin; uso histórico de current_setting('app.settings.service_role_key') produjo NULL en algunos entornos. |
| trigger | update_user_documents_updated_at | supabase/migrations/20251115220000_007_user_documents.sql | (n/a) | (DB internal) | DB trigger | Mantiene updated_at; hay múltiples triggers en migrations que deben inventariarse en detalle si se requiere. |
| cron | process-polygon-anchors | supabase/functions/process-polygon-anchors/cron.sql | */1 * * * * | Authorization Bearer (current_setting service_role) OR x-cron-secret in function | Cron scheduler → process-polygon-anchors function | Confirma Polygon TXs y escribe eventos canónicos; existe code legacy y helpers para recrear cron. |
| cron | process-bitcoin-anchors | supabase/functions/process-bitcoin-anchors/cron.sql | */5 * * * * | Authorization Bearer (current_setting service_role) OR x-cron-secret in function | Cron scheduler → process-bitcoin-anchors function | Maneja OTS/Bitcoin verification; backoff/attempts tracked; migraciones para cron fixes disponibles. |
| cron | recover-orphan-anchors | supabase/migrations/20251221100002_orphan_recovery_cron.sql | */5 * * * | Authorization Bearer (current_setting service_role) | Cron scheduler | Safety net que detecta y reintenta anchors huérfanos. |
| cron | send-pending-emails | scripts/cron/setup-all-crons.sql / supabase/functions/send-pending-emails | */1 * * * * | x-cron-secret | Cron scheduler → send-pending-emails | Worker de correos; requiere configuración de env (Resend/MAIL). |
| edge | anchor-polygon | supabase/functions/anchor-polygon/index.ts | (on-demand) | invoked by trigger/client; expects envs (private key) | trigger, client, signnow-webhook, process-signature | Crea registro en anchors; ha sido fuente de problemas por validación de hash y manejo de claves privadas; idempotencia importante. |
| edge | anchor-bitcoin | supabase/functions/anchor-bitcoin/index.ts | (on-demand) | invoked by trigger/client; expects envs | trigger, client, signnow-webhook, process-signature | Encola para OpenTimestamps; valida hash 64-hex; worker process-bitcoin-anchors confirma. |
| edge | process-polygon-anchors | supabase/functions/process-polygon-anchors/index.ts | cron (*/1 * * * *) | x-cron-secret or Authorization | cron (scheduler) | Confirma receipts, escribe eventos[] y actualiza anchor_states; evitar double-updates (atomicity). |
| edge | process-bitcoin-anchors | supabase/functions/process-bitcoin-anchors/index.ts | cron (*/5 * * * *) | x-cron-secret or Authorization | cron (scheduler) | Verifica OTS proofs; ha generado timeouts/289 attempts en casos. |
| edge | notify-artifact-ready | supabase/functions/notify-artifact-ready/index.ts | on-demand | x-cron-secret | workers/crons | Notifica UI/emails; valida x-cron-secret. |
| edge | health-check | supabase/functions/health-check/index.ts | on-demand | public/ops | dashboards | Agrega señales de salud (cron runs, anchor activity); útil para validar fase 0. |
| edge | signnow-webhook | supabase/functions/signnow-webhook/index.ts | webhook | external auth | external (SignNow) | Invoca anchors; revisar seguridad y autenticación. |
| edge | process-signature | supabase/functions/process-signature/index.ts | on-demand | internal | workflow code | Llama a anchor-polygon / anchor-bitcoin como parte del flujo de firma. |
| edge (legacy) | anchor-polygon (legacy) | supabase/functions/_legacy/anchor-polygon/index.ts | (legacy) | legacy | (reference) | Implementación duplicada; revisar deprecación. |
| edge (legacy) | process-polygon-anchors (legacy) | supabase/functions/_legacy/process-polygon-anchors/index.ts | (legacy cron) | legacy | (reference) | Implementación duplicada de worker. |
| shared | _shared/cors | supabase/functions/_shared/cors.ts | (n/a) | envs ALLOWED_ORIGIN, SITE_URL | used by many edge functions | CORS helper; configurar ALLOWED_ORIGIN en prod para evitar bloqueos de browser. |
| shared | _shared/anchorHelper.example | supabase/functions/_shared/anchorHelper.example.ts | example | (n/a) | dev/reference | Ejemplos de patrón submit/confirm; útil para migración a Executor. |

---

Notas y next-steps recomendados:

1. Priorizar fixes Fase 0: unificar auth service-to-service (decidir Authorization Bearer vs x-cron-secret), aplicar migraciones que reemplazan use of current_setting(...) en cron SQL, y asegurar CORS envs en Edge Functions.
2. Alinear idempotencia en anchor creation (INSERT ... ON CONFLICT DO NOTHING / upsert) para evitar 23505 y reintentos que rompen estado.
3. Marcar legacy functions en una checklist: (keep-as-readonly, deprecate, remove) y planear mover invocaciones al Executor en Fase 2.
4. Validar que cron jobs existen y están activos en producción: process-polygon-anchors, process-bitcoin-anchors, recover-orphan-anchors, send-pending-emails, anchoring-health-check.

Si querés, exporto también un CSV separado con solo los callers/paths o genero un PR con cambios mínimos para aplicar Fase 0 (ej: migración SQL que cambia current_setting() por vault lookup y recrea crons).