# REPORT_SUPABASE_RESOURCES

Fecha: 2026-01-16T11:19:44.299Z

Resumen
-------
Informe automatizado/manual (inventario) de recursos Supabase encontrados en el repo en el momento actual. Contiene: Edge Functions (HTTP / Deno functions), workers (long-running / cron-like), migraciones SQL relevantes, triggers y RPCs / SQL functions detectadas.

Extension (Executor):
- Mapea recursos actuales con la linea canónica ECO/ECOX y el rol del executor.
- Identifica duplicidades estructurales que el executor debe resolver.

Nota: este es un inventario de código, no una validación de despliegue. Hay evidencias en los logs (migrations / deploy) de conflictos y errores que deben revisarse en el entorno remoto.

1) Edge Functions / Serverless Functions (supabase/functions)
----------------------------------------------------------
Listado (tal como aparecen en filesystem):

- _legacy
- _shared
- _workers
- accept-invite-nda
- accept-nda
- accept-share-nda
- accept-workflow-nda
- anchoring-health-check
- append-tsa-event
- apply-signer-signature
- build-final-artifact
- cancel-workflow
- confirm-signer-identity
- create-custody-upload-url
- create-invite
- create-signer-link
- deno.json
- generate-link
- get-signed-url
- health-check
- legal-timestamp
- load-draft
- log-ecox-event
- log-event
- log-workflow-event
- notify-artifact-ready
- notify-document-certified
- notify-document-signed
- process-bitcoin-anchors
- process-polygon-anchors
- process-signature
- process-signer-signed
- record-protection-event
- record-signer-receipt
- register-custody-upload
- reissue-signer-token
- reject-signature
- repair-missing-anchor-events
- request-document-changes
- respond-to-changes
- save-draft
- send-pending-emails
- send-share-otp
- send-signer-otp
- send-signer-package
- send-welcome-email
- signer-access
- signnow
- signnow-webhook
- stamp-pdf
- start-signature-workflow
- store-encrypted-custody
- store-signer-signature
- test-email
- test-insert-notification
- tests
- verify-access
- verify-ecox
- verify-invite-access
- verify-signer-otp
- verify-workflow-hash
- workflow-fields

Comentarios rápidos:
- Funciones críticas relacionadas con el flujo de firma: apply-signer-signature, process-signer-signed, process-signature, start-signature-workflow, store-signer-signature.
- Funciones de anchoring/chain: process-bitcoin-anchors, process-polygon-anchors, anchoring-health-check.
- Notificaciones/artefactos: notify-artifact-ready, notify-document-certified, notify-document-signed, send-pending-emails.
- Worker/long tasks (build-final-artifact) está en functions (y también hay carpeta _workers).
- Observación detectada durante deploy: apply-signer-signature falló al empaquetar por import relativo de '@supabase/supabase-js' (import path issue). Revisar imports en supabase/functions/_shared/*.ts (error report previo).

2) Workers / Cron / Background (supabase/functions/_workers + functions named as workers)
---------------------------------------------------------------------------------------
Carpeta _workers y funciones orientadas a background/cron:

- _workers (folder)
- build-final-artifact (worker function)
- notify-artifact-ready (can be worker-triggered by event)
- process-bitcoin-anchors
- process-polygon-anchors
- send-pending-emails
- orphan_recovery cron migrations exist (see migrations list)

Observaciones:
- Hay migraciones que crean cron jobs (orphan_recovery_cron etc.).
- build-final-artifact worker implementa la materialización del artefacto final (FASE C).

3) Migrations SQL (supabase/migrations)
---------------------------------------
Se detectaron numerosos ficheros de migración. Se listan los más relevantes para el dominio de firma/protección/artifact:

- 20251117010000_009_signature_workflows.sql
- 20251118120000_012_signer_links_and_events.sql
- 20251127100000_create_documents_storage_bucket.sql
- 20251208090000_anchor_atomic_tx.sql
- 20251213000000_polygon_atomic_tx.sql
- 20251218140000_add_protection_level_and_polygon_status.sql
- 20260106090000_document_entities.sql
- 20260106090001_document_entities_triggers.sql
- 20260106140000_validate_anchor_witness_hash.sql
- 20260115030000_create_batches_table.sql
- 20260115030100_add_batch_id_to_fields.sql
- 20260115140000_create_workflow_artifacts.sql
- 20260115150000_create_signature_instances.sql
- 20260115150100_create_signature_application_events.sql
- 20260115193518_add_artifact_ready_notification_type.sql

Además hay migraciones relacionadas con cron jobs, RLS, anchors, and performance.

Comentarios:
- Las migraciones muestran que el modelo para batches, signature_instances y signature_application_events está presente.
- Se han aplicado (parcialmente) migraciones relacionadas con workflow_artifacts, pero hubo conflictos/alarmes durante push; verificar el estado remoto y si algunas migrations están duplicadas en la tabla de migraciones.

4) Triggers SQL / RPCs / Functions definidas en SQL
--------------------------------------------------
Migraciones que crean SQL functions / triggers (ejemplos detectados):

- 20251121090000_create_product_events.sql (events)
- 20251208110000_document_folder_functions.sql
- 20251221100000_blockchain_anchoring_trigger.sql
- 20251221100002_orphan_recovery_cron.sql
- 20251208090100_anchor_atomic_tx_grants.sql
- 20260106140000_validate_anchor_witness_hash.sql
- 20260106090001_document_entities_triggers.sql
- 20251203160000_signnow_embed_timestamp.sql
- 20251221044721_create_product_events.sql
- 20251224000000_fix_profiles_rls_upsert.sql
- create_insert_signer_function.sql (20251201190000_create_insert_signer_function.sql)
- 20251115220000_007_user_documents.sql (defines some stored logic)

Comentarios:
- Existe un trigger/worker para anchoring en blockchain (blockchain_anchoring_trigger). Debe revisarse si está activo y si los jobs se encolan y procesan correctamente.
- Hay SQL functions para insert/append events (append_event) y para calcular/update protection level.

5) RPCs / API SQL functions detectadas
--------------------------------------
- create_insert_signer_function (migration)
- create_append_event_sql_function (migration)
- verify-workflow-hash (edge function exists too)
- other helpers: verify-access / verify-ecox (edge functions) but there are also SQL-level helpers in migrations

6) Observaciones operativas / issues detectados
------------------------------------------------
- Migraciones: durante `supabase db push` se detectaron conflictos (duplicate migration key) y columnas que ya existen. Es necesario inspeccionar la tabla `supabase_migrations.schema_migrations` en remoto y reconciliar local/remote migration state.

- Deploy of Functions: `supabase functions deploy` failed for apply-signer-signature due to an import line in `supabase/functions/_shared/signatureCapture.ts` using bare import '@supabase/supabase-js' that Deno bundler rejected; adjust to relative import or map via import_map.json/deno.json. (Error shown earlier: "Relative import path '@supabase/supabase-js' not prefixed with / or ./ or ../ and not in import map").

- Witness / viewer mismatch: frontend hook usePDFfromCID prioritizes witness_current_storage_path but workers historically didn't update that field progressively; need to ensure process-signer-signed updates witness_current_storage_path after generating witness PDF materialization (we implemented build-final-artifact worker earlier but ensure worker updates document_entities.witness_current_storage_path on each signature or event as per P2.3 decision).

- Local runtime errors: logs show 409 conflict on REST call to document_entities (possible duplicate insert or constraint), and session initialization issues. These require runtime debugging: inspect network calls and server logs.

7) Alineacion con executor (estado actual vs objetivo)
------------------------------------------------------
Estado actual (pre-executor):
- Multiples caminos de mutacion: triggers + workers + UI + service_role.
- ECO tratado como artefacto unico y vivo (pendings), sin snapshots versionados.
- ECOX existe como log tecnico (log-ecox-event) pero sin lifecycle formal.

Objetivo con executor (post-linea canónica):
- ECOX es ledger vivo append-only.
- ECO es snapshot firmado (eco.snapshot.issued) y ECO_FINAL (eco.finalized).
- Executor mantiene ECOX y emite snapshots ECO.

Duplicidades a resolver con executor:
- Anchoring: trigger user_documents + cron workers + RLS insert anchors.
- Workflow completion: edge/worker + trigger notify_workflow_completed.
- Notificaciones: triggers + workers notify-*.
- document_entities: UI update + service_role update.

8) Recomendaciones y próximos pasos (priorizados)
------------------------------------------------
A — Short-term (high priority)
  1. Fix function bundling error: change bare imports in supabase/functions/_shared to relative imports or configure import_map in deno.json. Deploy apply-signer-signature and other failed functions.
  2. Reconcile migrations: check `supabase_migrations.schema_migrations` remote table and remove duplicate entry (or rebase local migrations) so `supabase db push --include-all` succeeds.
  3. Verify build-final-artifact worker run once for a completed workflow and that it updates workflow_artifacts and emits workflow.artifact_finalized.

B — Medium-term
  1. Ensure process-signer-signed updates document_entities.witness_current_storage_path (or ensure mapping) so viewer sees progressive witness.
  2. Verify anchoring workers (process-polygon-anchors / process-bitcoin-anchors) are enqueuing and updating protection state.
  3. Add monitoring/metrics for anchor attempts, worker failures, and artifact build time.

C — Low-term / future
  1. Harden import patterns and centralize shared helpers in supabase/functions/_shared with proper deno import_map.
  2. Add E2E tests for the artifact generation flow (complete workflow -> worker -> artifact ready).

9) Artifacts in repo to review next (files & locations)
-----------------------------------------------------
- supabase/functions/apply-signer-signature (integration point for P2.2)
- supabase/functions/process-signer-signed (workflow step publisher)
- supabase/functions/build-final-artifact (C1 worker)
- supabase/functions/_shared/signatureCapture.ts (fix bundling/import)
- supabase/migrations/* (see list above; focus on create_workflow_artifacts and signature instances migrations)

10) Conclusión
--------------
El repositorio contiene una implementación madura y bien estructurada de las piezas críticas (workers, functions, SQL migrations). Los problemas detectados son mayoritariamente de orquestación y despliegue (migrations/packaging) y de la desconexión entre la verdad canónica (backend events / witness) y lo que la UI muestra.

Corregir los puntos listados en "Short-term" dejará al sistema en buen estado operativo para la demo y para el cierre de P2/P3.

---

Generado por inspección del árbol de proyecto en /home/manu/dev/ecosign.
Si querés que lo extienda con checks en vivo (supabase CLI queries list/functions), lo puedo hacer, pero necesito que me des permiso para ejecutar comandos remotos en tu perfil supabase o pasarme credenciales de CI (recomendado: hacerlo desde tu terminal local con mi guía).


• Acá va el reporte solicitado, siguiendo tu estrategia en 4 capas y sin
  entrar en lógica interna. Todo es inventario y clasificación por naming.

  CAPA 1 — Inventario canónico (sin análisis)

  1.1 Tablas (clasificadas por rol)
  Ledger / append‑only (eventos y auditoría)

  - access_events, access_logs, audit_logs, ecox_audit_trail, events,
    operations_events, product_events, conversion_events,
    signature_application_events, workflow_events, nda_events

  Estado operativo (núcleo transaccional)

  - documents, document_entities, user_documents, document_folders,
    document_shares
  - anchors, anchor_states, bitcoin_ots_files
  - signature_workflows, workflow_versions, workflow_signers,
    workflow_signatures, workflow_fields, workflow_artifacts
  - signer_links, signer_otps, signer_receipts
  - operations, operation_documents, batches
  - nda_templates, nda_acceptances, nda_signatures
  - invites, links, recipients
  - system_emails, welcome_email_queue
  - profiles

  Soporte / cache / derivados

  - certificate_regeneration_requests, eco_records, founder_badges,
    rate_limits, rate_limit_blocks, contact_leads

  Internas Supabase (por schema)

  - auth.*, storage.*, realtime.*, _realtime.*, cron.*, net.*, vault.*,
    supabase_functions.*, supabase_migrations.*

  ———

  1.2 Triggers (inventario plano)
  auth.users

  - AFTER INSERT → handle_new_user()
  - AFTER UPDATE → queue_system_welcome_email()

  public

  - anchor_states BEFORE UPDATE → update_anchor_states_updated_at()
  - anchors BEFORE UPDATE → update_anchors_updated_at()
  - batches BEFORE UPDATE → update_updated_at_column()
  - bitcoin_ots_files BEFORE UPDATE → update_bitcoin_ots_files_updated_at()
  - certificate_regeneration_requests BEFORE UPDATE →
    update_certificate_regen_updated_at()
  - contact_leads BEFORE UPDATE → update_contact_leads_updated_at()
  - document_entities BEFORE UPDATE → enforce_document_entities_append_only()
  - document_entities BEFORE UPDATE → enforce_events_append_only()
  - document_entities BEFORE UPDATE →
    enforce_document_entities_immutability()
  - document_entities BEFORE INSERT/UPDATE → update_tsa_latest()
  - document_entities BEFORE INSERT/UPDATE → validate_anchor_uniqueness()
  - document_entities BEFORE UPDATE → update_updated_at_column()
  - document_folders BEFORE UPDATE → update_document_folders_updated_at()
  - documents BEFORE UPDATE → update_updated_at_column()
  - eco_records BEFORE UPDATE → update_updated_at_column()
  - invites BEFORE UPDATE → update_invites_updated_at()
  - links BEFORE INSERT → check_document_not_revoked()
  - nda_templates BEFORE UPDATE → update_nda_templates_updated_at()
  - operation_documents BEFORE INSERT → set_operation_document_added_by()
  - operation_documents BEFORE UPDATE → cleanup_draft_on_protect()
  - operations BEFORE UPDATE → validate_draft_transition()
  - operations BEFORE UPDATE → update_operations_updated_at()
  - signature_workflows AFTER UPDATE → notify_workflow_completed()
  - signer_links BEFORE UPDATE → update_updated_at_column()
  - user_documents AFTER INSERT → trigger_blockchain_anchoring()
  - user_documents BEFORE UPDATE → update_updated_at_column()
  - workflow_fields BEFORE UPDATE → update_workflow_fields_updated_at()
  - workflow_signers AFTER UPDATE → notify_signature_completed()
  - workflow_signers AFTER UPDATE → notify_creator_on_signature()
  - workflow_signers AFTER INSERT → notify_signer_link()
  - workflow_signers BEFORE INSERT/UPDATE → validate_signer_security()

  storage/realtime

  - Varios triggers de mantenimiento (prefixes, update timestamps,
    subscription filters).

  ———

  1.3 SQL Functions / RPC (clasificación por intención, naming-only)
  Mutan estado

  - advance_workflow, anchor_atomic_tx, anchor_polygon_atomic_tx
  - create_document_folder, create_workflow_version, delete_document_folder,
    insert_workflow_signer, move_documents_to_folder
  - request_certificate_regeneration, expire_signer_links,
    detect_and_recover_orphan_anchors
  - upgrade_protection_level

  Generan/registran eventos

  - append_event_to_workflow_events, log_ecox_event

  Lecturas / helpers

  - count_documents_in_operation, count_user_drafts,
    get_anchor_inconsistency_summary, get_next_signer, is_draft_operation
  - validate_anchor_event, validate_tsa_event, generate_invite_token,
    generate_ecox_certificate

  Triggers (no invocables directos)

  - update_*, notify_*, validate_*, enforce_*, trigger_blockchain_anchoring,
    handle_new_user, queue_*

  Lista completa de funciones public con firma y retorno quedó capturada (57
  total).

  ———

  1.4 Edge Functions / Workers (inventario por carpeta)
  HTTP user‑facing (interacción directa)

  - accept-nda, accept-invite-nda, accept-share-nda, accept-workflow-nda
  - signer-access, verify-access, verify-ecox, verify-invite-access, verify-
    signer-otp
  - create-invite, create-signer-link, generate-link, get-signed-url, load-
    draft, save-draft
  - start-signature-workflow, apply-signer-signature, store-signer-signature,
    process-signature

  Workers / cron / async

  - process-polygon-anchors, process-bitcoin-anchors
  - send-pending-emails, process-signer-signed
  - build-final-artifact, notify-artifact-ready
  - notify-document-signed, notify-document-certified
  - repair-missing-anchor-events, anchoring-health-check

  Internal‑only / executor targets

  - append-tsa-event, record-protection-event
  - log-event, log-workflow-event, log-ecox-event
  - legal-timestamp, store-encrypted-custody, stamp-pdf, verify-workflow-hash

  ———

  Estado actual del entorno (relevante al diagnóstico previo)

  - Cron local: activos (process-polygon-anchors cada 1m, process-bitcoin-
    anchors cada 5m).
  - Edge runtime local: levantado y responde con auth.
  - Frontend: corregido para apuntar a Supabase local en .env.

  ———

  Si querés, el siguiente paso es la CAPA 2 (probes operativos): para cada
  step del D1 definir input observable → side effect DB → output observable.
  Esto se arma sin tocar lógica interna y nos deja listo el camino para el
  Executor real.



› 🧠 CAPA 2 — Autoridad y ownership (CLAVE con el executor)

  Ahora viene lo importante.

  Para cada cosa que muta estado, preguntamos solo esto:

  ❓ ¿Quién tiene autoridad para ejecutar esto?

  Opciones válidas:

  Usuario (con RLS)

  Backend API

  Worker

  Executor (orquestador)

  Trigger automático

  ⚠️ Si una misma mutación puede ocurrir por dos caminos distintos, ahí hay
  riesgo real.

  Ejemplo típico de bug grave:

  trigger que cambia estado

  worker que hace lo mismo

  executor que lo reintenta

  👉 Eso es lo que hay que detectar, no bugs de código.

  🔁 CAPA 3 — Flujo real vs flujo imaginado

  Acá se cruza todo en una tabla simple:

  Acción        Quién la inicia Quién la ejecuta        Efectos
  document.protect      user    edge fn insert + event
  anchor.attempt        cron    worker  update + event
  workflow.complete     executor        rpc     state change

  Si una acción aparece duplicada con caminos distintos → alarma.  es
  importante que no toques nada es todo auditoria quiero ver el estado
  actual


• I'm outlining SQL queries to list functions with volatility, triggers, RLS
  policies, and ownership by entry points like users, backend, workers, and
  cron jobs to produce a report identifying overlaps and mapping real versus
  expected action flows.

✔ You approved codex to run docker exec -i supabase_db_ecosign psql -U
  postgres -d postgres -c "SELECT sc... and applied the execpolicy amendment

• Ran docker exec -i supabase_db_ecosign psql -U postgres -d postgres -c
  │ "SELECT schemaname, tablename, policyname, cmd, roles FROM pg_policies
  │ WHERE schemaname='public' ORDER BY tablename, policyname;"
  └  schemaname |             tablename             |
    policyname                     |  cmd   |        roles
    … +119 lines
    (111 rows)


─ Worked for 11s ────────────────────────────────────────────────────────────

• Entendido: auditoría pura, sin tocar nada. Acá va CAPA 2 y CAPA 3 en
  formato de reporte, con foco en autoridad/ownership y duplicidad potencial.
  Todo es “estado actual observado” a partir de inventario y políticas RLS,
  sin revisar lógica interna.

  CAPA 2 — Autoridad y ownership (estado actual)

  Autoridad por tipo (fuente: RLS + triggers + cron + workers)

  Usuario (RLS permite mutar)
  Tablas con mutaciones por authenticated (o public) directamente desde
  cliente:

  - documents (INSERT/UPDATE/DELETE)
  - document_entities (INSERT/UPDATE)
  - user_documents (INSERT/UPDATE/DELETE)
  - operations, operation_documents, operations_events
  - nda_templates, nda_acceptances
  - invites, signer_links
  - workflow_fields (UPDATE asignado)
  - signature_workflows (INSERT/UPDATE/DELETE)
  - batches, document_folders
  - contact_leads, conversion_events, product_events,
    signature_application_events, signature_instances

  Backend API / Edge Functions (service_role o internal)
  Mutaciones que esperan service_role o worker interno:

  - anchors (INSERT/UPDATE via service_role)
  - document_shares (ALL via service_role)
  - eco_records (ALL via service_role)
  - nda_signatures (INSERT via service_role)
  - workflow_events (INSERT via service_role)
  - system_emails (worker)
  - workflow_artifacts (worker)
  - workflow_signatures (normalmente worker/edge)

  Workers / Cron (autónomos)

  - process-polygon-anchors, process-bitcoin-anchors (cron)
  - send-pending-emails, build-final-artifact, notify-* (async/worker)

  Triggers automáticos (estado implícito)

  - user_documents → trigger_blockchain_anchoring()
  - signature_workflows → notify_workflow_completed()
  - workflow_signers → notify_signature_completed(),
    notify_creator_on_signature(), notify_signer_link()
  - document_entities → append-only guards, update_tsa_latest, anchor
    uniqueness

  Riesgos de autoridad duplicada (por naming, sin analizar lógica)

  - Anchoring: puede iniciar por user_documents (trigger) + cron workers +
    edge functions.
    → riesgo de doble avance si trigger y worker hacen lo mismo.
  - Workflow completions: signature_workflows trigger + worker/edge podrían
    marcar estado.
  - Events: document_entities tiene guards append-only, pero varias entradas
    pueden escribir eventos (log-event, append-tsa-event, record-protection-
    event, log-workflow-event).

  ———

  CAPA 3 — Flujo real vs flujo imaginado (tabla simple)
  (Estas filas son “observables” por naming + RLS + triggers. No hay
  inferencia de lógica interna.)

  Proteger documento (D1)

  - Acción: document.protect
      - Inicia: Usuario (RLS insert/update en documents / user_documents)
      - Ejecuta: Edge (store-encrypted-custody, append-tsa-event, record-
        protection-event)
      - Efectos: inserts/updates + eventos en document_entities
      - Riesgo: si document_entities es actualizado por user + edge (doble
        autoridad)

  Anchoring

  - Acción: anchor.attempt
      - Inicia: Trigger user_documents → trigger_blockchain_anchoring()
      - Ejecuta: Worker cron (process-polygon-anchors, process-bitcoin-
        anchors)
      - Efectos: updates en anchors, user_documents, eventos
      - Riesgo: trigger vs worker pueden superponerse

  Workflow completion

  - Acción: workflow.complete
      - Inicia: Worker/edge (process-signature / process-signer-signed)
      - Ejecuta: Trigger signature_workflows → notify_workflow_completed()
      - Efectos: workflow_artifacts, workflow_notifications, eventos
      - Riesgo: triggers + workers con doble responsibility

  Notificaciones

  - Acción: notify.*
      - Inicia: Trigger (workflow_signers/signature_workflows) + worker
        notify-*
      - Ejecuta: worker send-pending-emails
      - Efectos: system_emails, workflow_notifications
      - Riesgo: múltiples fuentes encolando mismo notify

  ———

  Conclusión CAPA 2+3 (estado actual)

  - Hay múltiples caminos de mutación para anchoring, workflow completion y
    notificaciones.
  - El riesgo principal está en trigger + worker + edge actuando sobre los
    mismos estados y eventos sin un árbitro único.

  Si querés, el siguiente paso es CAPA 2.5: matriz de mutaciones por tabla
  (tabla → “quién puede escribir” → “cómo se activa”), y CAPA 3.5: duplicidad
  confirmada con timestamps/event logs (sin tocar lógica).


› dale sigamos


• Planning to build a concise matrix of tables showing insert/update/delete
  permissions by role using SQL queries on policies, cross-referencing with
  triggers and Edge functions to provide a detailed write capability report.
  Next, I'll run aggregated queries in Docker for deeper analysis.

✔ You approved codex to run docker exec -i supabase_db_ecosign psql -U
  postgres -d postgres -c "SELECT ta... and applied the execpolicy amendment

• Ran docker exec -i supabase_db_ecosign psql -U postgres -d postgres -c
  │ "SELECT tablename, cmd, array_agg(DISTINCT roles) AS roles FROM
  │ pg_policies WHERE schemaname='public' GROUP BY tablename, cmd ORDER BY
  │ … +1 lines
  └              tablename             |  cmd   |              roles
    -----------------------------------+--------+----------------------------
    … +94 lines
    (93 rows)


• I'm mapping tables writable by both authenticated users and service role,
  highlighting duplicates where triggers and direct writes overlap, such as
  anchors and document_entities; this includes instances where RLS allows
  user updates but edge functions with service role bypass RLS, creating dual
  update paths. I'll prepare a report summarizing these duplicate write paths
  and trigger involvements without code changes.

  Planning audit summary with duplicates and data sources

  I'm preparing a concise, sectioned audit report in Spanish that includes
  tables, highlights duplicate write paths, and cites data sourced from the
  local database without code changes.

─ Worked for 17s ────────────────────────────────────────────────────────────

• Perfecto. Seguimos con CAPA 2.5 (matriz de autoridad por tabla) y CAPA 3.5
  (duplicidad observada), sin tocar lógica ni código.

  CAPA 2.5 — Matriz de autoridad por tabla (solo escritura)
  Fuente: RLS public (local). “service_role” implica backend/worker/edge;
  “authenticated/public” implica cliente.

  Escritura por Usuario (RLS)

  - INSERT/UPDATE/DELETE: documents, user_documents, operations,
    operation_documents, signature_workflows, workflow_fields, batches,
    document_folders, nda_templates, invites, signer_links
  - INSERT: document_entities, operations_events,
    signature_application_events, signature_instances, product_events,
    conversion_events, contact_leads, document_shares, eco_records
  - UPDATE: document_entities, invites, signer_links, contact_leads
  - DELETE: documents, user_documents, signature_workflows,
    operation_documents

  Escritura por Backend/Workers (service_role o public)

  - INSERT/UPDATE: anchors (INSERT por authenticated + service_role, UPDATE
    solo service_role)
  - ALL: eco_records (service_role), rate_limits, rate_limit_blocks
  - INSERT: nda_signatures, workflow_events, ecox_audit_trail, nda_events,
    workflow_notifications
  - UPDATE: audit_logs, certificate_regeneration_requests, user_documents
  - ALL (public): signer_otps, signer_receipts, bitcoin_ots_files

  Tablas con escritura doble (usuario + backend)

  - documents (INSERT/UPDATE/DELETE usuario + service_role)
  - user_documents (INSERT/UPDATE usuario + service_role)
  - anchors (INSERT usuario + service_role; UPDATE solo service_role)
  - document_entities (UPDATE usuario; backend puede saltar RLS)
  - signature_workflows (UPDATE por public/authenticated; backend también
    puede mutar)
  - workflow_notifications (INSERT usuario + service)

  CAPA 2.6 — Triggers que mutan estado (autonomía implícita)

  - user_documents → trigger_blockchain_anchoring() (AFTER INSERT)
  - signature_workflows → notify_workflow_completed() (AFTER UPDATE)
  - workflow_signers → notify_signature_completed(),
    notify_creator_on_signature(), notify_signer_link()
  - document_entities → guards + update_tsa_latest() +
    validate_anchor_uniqueness()

  CAPA 3.5 — Duplicidad de caminos (riesgos reales, sin analizar lógica)
  Estas son duplicidades estructurales (no bugs confirmados, pero vías
  múltiples):

  1. Anchoring

  - Camino A: user_documents INSERT (usuario) → trigger
    trigger_blockchain_anchoring()
  - Camino B: usuario puede INSERT directo en anchors (RLS lo permite)
  - Camino C: workers cron actualizan anchors
    → Riesgo: creación/estado de anchor por múltiples vías.

  2. Document lifecycle

  - Camino A: usuario UPDATE en document_entities (RLS)
  - Camino B: edge/worker también puede UPDATE (service_role bypass)
    → Riesgo: eventos o estado escritos por dos autoridades.

  3. Workflow completion

  - Camino A: edge/worker actualiza signature_workflows
  - Camino B: trigger notify_workflow_completed() reacciona y muta/enfila
    → Riesgo: doble notificación o doble avance.

  4. Notificaciones

  - Camino A: triggers (workflow_signers, signature_workflows)
  - Camino B: workers notify-* + send-pending-emails
    → Riesgo: notificaciones duplicadas si ambas rutas escriben
    workflow_notifications / system_emails.

  ———

  Si querés, el siguiente paso es CAPA 3.6:
  Para cada acción (protect / anchor / finalize / notify), armo tabla Acción
  → Inicia → Ejecuta → Escribe → Evento, y marco duplicidad confirmable por
  tabla. Esto deja listo el mapa para que el Executor sea la única autoridad.


› dale hagamoslo


• Preparing a concise table for CAPA 3.6 using existing edges, workers,
  triggers, and tables, entirely in Spanish without code changes.

─ Worked for 4s ─────────────────────────────────────────────────────────────

• Listo. Acá va CAPA 3.6 en formato “Acción → Inicia → Ejecuta → Escribe →
  Evento/Estado”, marcando duplicidad donde se ve por inventario (sin lógica
  interna).

  CAPA 3.6 — Flujo real vs imaginado (tabla de acciones)

  document.protect

  - Inicia: Usuario (UI)
  - Ejecuta: Edge store-encrypted-custody, record-protection-event, append-
    tsa-event
  - Escribe: documents, user_documents, document_entities, events
  - Evento/Estado: source.encrypted, witness.created, tsa.appended
  - Riesgo duplicidad: document_entities puede mutar por usuario + edge (dos
    autoridades).

  document.entity.update

  - Inicia: Usuario (RLS) o Worker/Edge (service_role)
  - Ejecuta: Trigger update_tsa_latest, enforce_*
  - Escribe: document_entities
  - Evento/Estado: eventos append-only
  - Riesgo duplicidad: múltiples caminos de update.

  anchor.request

  - Inicia: Trigger user_documents (AFTER INSERT) o Usuario (RLS permite
    INSERT en anchors)
  - Ejecuta: Trigger trigger_blockchain_anchoring()
  - Escribe: anchors
  - Evento/Estado: anchor.pending
  - Riesgo duplicidad: trigger + usuario + worker.

  anchor.attempt

  - Inicia: Cron (process-polygon-anchors, process-bitcoin-anchors)
  - Ejecuta: Worker
  - Escribe: anchors, user_documents
  - Evento/Estado: anchor.processing

  anchor.confirmed

  - Inicia: Worker cron
  - Ejecuta: Worker
  - Escribe: anchors, user_documents
  - Evento/Estado: anchor.confirmed
  - Riesgo duplicidad: si hay otro writer externo a cron.

  workflow.start

  - Inicia: Usuario (UI)
  - Ejecuta: Edge start-signature-workflow
  - Escribe: signature_workflows, workflow_signers, workflow_versions
  - Evento/Estado: workflow_created

  workflow.signer.invite

  - Inicia: Trigger workflow_signers AFTER INSERT
  - Ejecuta: notify_signer_link()
  - Escribe: workflow_notifications, system_emails (indirecto)
  - Evento/Estado: signer_invited
  - Riesgo duplicidad: también puede ser emitido por workers notify-*.

  workflow.signer.sign

  - Inicia: Usuario (signer)
  - Ejecuta: Edge process-signature / apply-signer-signature
  - Escribe: workflow_signatures, workflow_signers
  - Evento/Estado: signature_applied, tsa.appended
  - Riesgo duplicidad: workflow_signers también disparan triggers.

  workflow.complete

  - Inicia: Edge/worker (cuando último signer completa)
  - Ejecuta: Trigger notify_workflow_completed()
  - Escribe: workflow_events, workflow_notifications
  - Evento/Estado: workflow.completed
  - Riesgo duplicidad: edge/worker + trigger.

  artifact.build

  - Inicia: Worker build-final-artifact
  - Ejecuta: Worker
  - Escribe: workflow_artifacts
  - Evento/Estado: artifact.finalized

  artifact.notify

  - Inicia: Worker notify-artifact-ready o trigger workflow completion
  - Ejecuta: Worker
  - Escribe: workflow_notifications, system_emails
  - Evento/Estado: artifact.finalized → notificaciones

  email.dispatch

  - Inicia: Worker send-pending-emails
  - Ejecuta: Worker
  - Escribe: system_emails
  - Evento/Estado: email.sent / email.failed

  ———

  Conclusión CAPA 3.6

  - Puntos con duplicidad estructural: anchors, document_entities,
    workflow_notifications, workflow_signers, signature_workflows.
  - Puntos con autoridad única clara: workflow_artifacts (solo worker),
    system_emails (solo worker).
