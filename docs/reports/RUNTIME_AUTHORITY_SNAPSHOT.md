RUNTIME_AUTHORITY_SNAPSHOT
=========================

Fecha: 2026-01-26T21:52:21.976Z
Autor: generado automáticamente (desde repo)

Resumen
-------
Este documento es un "snapshot" operativo inferido desde el código y las migraciones del repositorio. No contiene el estado de PRODUCCIÓN real (no tengo acceso) — incluye: lista de funciones, flags referenciados en código, crons y triggers creados por migraciones y los comandos exactos que el equipo de Ops debe ejecutar (o pegar) para devolver el estado real en PROD.

Instrucciones importantes para Ops
---------------------------------
Por favor ejecutar los comandos listados en la sección "Comandos para Ops" y pegar los resultados en un comentario o PR; sin esos outputs no se puede afirmar qué autoridad está activa en producción.

A. Deploy Snapshot (inferred from code)
--------------------------------------
1) Edge Functions presentes (carpeta: supabase/functions)
- fase1-executor (supabase/functions/fase1-executor/index.ts)
- legal-timestamp (supabase/functions/legal-timestamp/index.ts)
- build-artifact (supabase/functions/build-artifact/index.ts)
- submit-anchor-polygon (supabase/functions/submit-anchor-polygon/index.ts)
- submit-anchor-bitcoin (supabase/functions/submit-anchor-bitcoin/index.ts)
- run-tsa / auto-tsa (supabase/functions/run-tsa, supabase/functions/auto-tsa)
- send-pending-emails (supabase/functions/send-pending-emails/index.ts)
- notify-artifact-ready (supabase/functions/notify-artifact-ready/index.ts)
- process-polygon-anchors (supabase/functions/process-polygon-anchors/index.ts)
- process-bitcoin-anchors (supabase/functions/process-bitcoin-anchors/index.ts)
- start-signature-workflow, apply-signer-signature, request-document-changes, respond-to-changes, cancel-workflow, reject-signature, confirm-signer-identity, accept-nda, accept-workflow-nda, accept-invite-nda, accept-share-nda, notify-document-signed, notify-* (varios)
- health-check, anchoring-health-check, others en supabase/functions/*

Nota: la lista anterior está inferida desde el árbol de funciones; puede haber funciones NO desplegadas en PROD o con nombres distintos.

2) Flags / env vars referenciadas en el código (keys y dónde se usan)
- FASE — uso general para gating de ejecución (ej.: many functions check if Deno.env.get('FASE') !== '1') — archivos que verifican: supabase/functions/* (ej. verify-invite-access, apply-signer-signature, process-polygon-anchors, build-final-artifact, send-pending-emails, etc.)
- V2_AUTHORITY_ONLY — gating flag en auto-tsa, anchor handlers, process-signature, etc.
- SIMULATE — (referencias parciales en tests/scripts). Buscar en runtime si expuesta.
- SHADOW / PASO_* / phases — logs y migrations use 'PASO_1_SHADOW_MODE' etc. (supabase/functions/fase1-executor logs and many shadow migrations)
- SHADOW_WRITE / SHADOW_MODE — used across migrations and edge functions in shadow logging (see packages/authority migrations and supabase/functions/* shadow log sections)
- CRON_SECRET — referenced by send-pending-emails, notify-artifact-ready, send-signer-otp, etc. (functions check Deno.env.get('CRON_SECRET') and warn if missing)
- DISABLE_* flags observed: DISABLE_AUTO_TSA, DISABLE_DB_ANCHOR_TRIGGERS, DISABLE_SIGNNOW_EXECUTION, DISABLE_PROCESS_SIGNATURE_EXECUTION, DISABLE_* email related flags (see tests/authority/authority_causality_guard.test.ts and various functions)
- Other sensitive keys referenced: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, POLYGON_RPC_URL / ALCHEMY_RPC_URL, POLYGON_PRIVATE_KEY, SPONSOR_PRIVATE_KEY, RESEND_API_KEY, DEFAULT_FROM, EXECUTOR_WORKER_ID, etc.

For each flag above the value in PROD must be obtained from the hosting platform (Supabase Dashboard or secrets store). The repo only shows where they are used.

B. Schedulers Snapshot (inferred from migrations)
------------------------------------------------
Migrations create pg_cron entries that invoke Edge Functions via net.http_post. Key migrations & cron jobs found:

- invoke-fase1-executor
  - migration: supabase/migrations/20260118070000_add_fase1_executor_cron.sql
  - target endpoint: ${SUPABASE_URL}/functions/v1/fase1-executor
  - expected secret header: uses vault.decrypted_secrets SUPABASE_SERVICE_ROLE_KEY (migration references x-cron-secret in other migrations)
  - schedule: migration uses cron.schedule(...) — intended cadence: every 1 minute (see TSA_ROUTE_INVENTORY.md)

- process-polygon-anchors / process-bitcoin-anchors
  - migrations: supabase/migrations/20260111060100_fix_cron_jobs.sql and 20260118060000_fix_anchor_cron_auth.sql
  - target endpoints: functions process-polygon-anchors, process-bitcoin-anchors
  - schedule: defined by migration (typical: every 5 minutes / configurable)
  - expected headers: Authorization Bearer <SERVICE_ROLE_KEY> and x-cron-secret

- orphan recovery cron (recover orphan anchors)
  - migrations: supabase/migrations/20251221100002_orphan_recovery_cron.sql and 20251221100003_orphan_recovery_cron_fixed.sql
  - target endpoints: /functions/v1/anchor-polygon and /functions/v1/anchor-bitcoin (net.http_post)
  - schedule: every 5 minutes (migration comment)

- send-pending-emails-job
  - migration: supabase/migrations/20260125101506_create_send_pending_emails_cron.sql
  - target endpoint: /functions/v1/send-pending-emails
  - expected header: x-cron-secret (CRON_SECRET) and Authorization Bearer <SERVICE_ROLE_KEY>
  - note: migration comments say the cron must be created via Dashboard SQL editor and depends on CRON_SECRET being set in project secrets.

- welcome-email / rate-limiting / other cron jobs
  - migrations: supabase/migrations/20251219000000_welcome_email_system.sql, 20251115090000_005_rate_limiting.sql, etc.

C. Triggers Snapshot (inferred from migrations)
-----------------------------------------------
Select notable triggers and high-level actions (file: supabase/migrations/*):

- on_signer_created (supabase/migrations/20251126000000_guest_signature_workflow_automation.sql)
  - tabla: workflow_signers
  - acción: legacy trigger inserts workflow_notifications (notify signer link) and may call shadow logging migrations

- on_signature_completed (supabase/migrations/20251126000000_guest_signature_workflow_automation.sql)
  - tabla: workflow_signers
  - acción: legacy trigger inserts workflow_notifications (owner + signer), may emit events

- on_workflow_completed (supabase/migrations/20251126000000_guest_signature_workflow_automation.sql)
  - tabla: signature_workflows
  - acción: 