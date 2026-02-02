# Pre‑Mortem Técnico (Macro Mapa) — Antes de Fase 3 (Canary)

**Fecha**: 2026-02-02  
**Objetivo**: congelar contratos + mapear el sistema completo (DB/cron/edge/UI) para anticipar puntos de ruptura antes de Canary.  
**Regla de oro**: *en Canary no “parcheamos micro”; primero cerramos contratos, naming y happy paths medibles*.

---

## Cómo leer este documento (marco mental correcto)

Esto **no** es una lista de bugs ni tareas sueltas. Es un **pre‑mortem de sistema**.

**Objetivo**: cerrar contratos y eliminar ambigüedades **antes** de Canary.

### Tres reglas (no negociables)

1) **No se arregla nada fuera de happy paths** (solo flujos verdes).  
2) **No se parchea comportamiento sin cerrar contrato** (sin contrato no hay fix).  
3) **Nada entra a Canary si no puede explicarse solo con este documento**.

Si no se acepta este marco, el sistema deriva a:
- “arreglo lo roto que veo”
- `if` defensivos
- excepciones

Eso es exactamente lo que este pre‑mortem evita.

---

## Orden recomendado de trabajo (por capas, no por features)

### Fase A — Contratos canónicos (bloqueante)

Nada de código todavía.

Checklist que debe validarse en frío:
- Naming de eventos: `.` vs `_` (kinds canónicos)
- Quién puede escribir `document_entities.events[]` (writer único)
- Qué significa exactamente `correlation_id`
- Qué promete `custody_mode`
- Qué es **evidencia** y qué es **UX**

**Output esperado (A):** un mini‑doc (1–2 páginas) que diga:
"Estos son los contratos que asumimos como verdad antes de Canary".

### Fase B — Happy paths explícitos (solo verdes)

Usar la Flow Matrix como autoridad.

Para cada flujo A–E:
- entrada
- eventos canónicos esperados
- jobs que deberían dispararse
- estado UI esperado
- qué cosa **NO** debería pasar

**Output esperado (B):** una tabla por flujo con:
- ✔️ esto ya pasa
- ⚠️ esto pasa pero con drift
- ❌ esto no pasa

Sin proponer soluciones todavía.

### Fase C — Mapa de autoridad real (no el teórico)

Para cada actor:
- triggers
- crons
- edge functions
- executor / orchestrator

Responder:
"¿Esto decide o solo ejecuta?"

Y marcar los que hoy:
- deciden y ejecutan (mezcla peligrosa)
- ejecutan sin guard
- escriben evidencia sin pasar por el writer canónico

**Output esperado (C):** lista corta (máx 10):
"estos puntos rompen el modelo de autoridad".

---

## Cómo convertir esto en tareas (sin micro‑patching)

Regla: las tareas se formulan como **cierres de contrato**, no como “fixes”.

Template obligatorio:

Título: Cerrar contrato de X

Contrato esperado:
- ...
- ...
- ...

Estado actual:
- ...
- ...

Riesgo si no se corrige:
- ...

Criterio de Done:
- ...

Si una tarea no puede escribirse así → **no entra**.

---

## NO TOCAR ahora (para ahorrar semanas)

- No optimizar performance
- No refactorizar UI por estética
- No mover lógica “porque queda más lindo”
- No agregar features
- No “ya que estamos...”

Canary no es para mejorar el sistema.
Canary es para verificar que el sistema que decimos tener realmente existe.

> Nota: algunas tablas (“Edge functions → auth → tablas tocadas”) se derivan **heurísticamente** de código (`.from(...)`, `.rpc(...)`, `SUPABASE_SERVICE_ROLE_KEY`, etc.). Sirve para pre‑mortem y revisión humana; el source‑of‑truth final es el schema en prod.

---

## Inventario de autoridad y ejecución

### Autoridad (decisión / guardrails)
- **DB** (canónico):
  - `document_entities.events[]` es *append-only* y tiene guardrails de inmutabilidad y consistencia.
  - `append_document_entity_event(...)` es el **único writer canónico** hacia `document_entities.events[]` (vía RPC).
  - `runtime_tick()` es el **tick único** (reclaim + decision + execution) invocado por `pg_cron`.
  - `reclaim_stale_jobs()` + `update_job_heartbeat()` sostienen el invariante “jobs no se quedan zombies”.
- **Feature flags / autoridad híbrida**:
  - Hay infraestructura de feature flags y “canonical authority vs shadow mode” (decisiones D*). Esto impacta triggers/automatizaciones.

### Ejecución (workers / jobs)
- **Queue**: `executor_jobs` (lock + retries + dedupe_key + heartbeat).
- **Decision executor**: `fase1-executor` (decide y encola jobs downstream).
- **Execution worker**: `orchestrator` (consume jobs y llama a workers específicos por tipo).
- **Workers canónicos del pipeline**:
  - `run-tsa` (escritura de `tsa.confirmed` / `tsa.failed`)
  - `submit-anchor-polygon`, `submit-anchor-bitcoin` (escritura de `anchor.pending` / `anchor.failed`)
  - `build-artifact` (escritura de `artifact.finalized` / `artifact.failed`)

### Observabilidad / diagnóstico
- `health`, `dead-jobs`, `monitoring-dashboard` (diagnóstico operativo; no “arreglan”, *acusan*).

---

## Triggers (tabla → trigger → función)

Tabla generada desde `supabase/migrations/*.sql` (parsing de `CREATE TRIGGER ... ON ... EXECUTE FUNCTION ...`).

| table | trigger | function | migration |
|---|---|---|---|
| `documents` | `update_documents_updated_at` | `update_updated_at_column` | `001_core_schema.sql` |
| `links` | `validate_document_not_revoked` | `check_document_not_revoked` | `001_core_schema.sql` |
| `eco_records` | `update_eco_records_updated_at` | `update_updated_at_column` | `20251107050603_001_create_verifysign_schema.sql` |
| `contact_leads` | `update_contact_leads_updated_at` | `update_contact_leads_updated_at` | `20251107074810_003_create_contact_leads_table.sql` |
| `anchors` | `anchors_updated_at` | `update_anchors_updated_at` | `20251115140000_006_fix_anchors_table.sql` |
| `user_documents` | `update_user_documents_updated_at` | `update_updated_at_column` | `20251115220000_007_user_documents.sql` |
| `workflow_signers` | `trigger_validate_signer_security` | `validate_signer_security` | `20251118010000_011_workflow_security_defaults.sql` |
| `public.signer_links` | `update_signer_links_updated_at` | `update_updated_at_column` | `20251118120000_012_signer_links_and_events.sql` |
| `public.invites` | `trigger_update_invites_updated_at` | `public.update_invites_updated_at` | `20251124000000_015_bitcoin_pending_and_invites.sql` |
| `workflow_signers` | `on_signer_created` | `notify_signer_link` | `20251126000000_guest_signature_workflow_automation.sql` |
| `signature_workflows` | `on_workflow_completed` | `notify_workflow_completed` | `20251126000000_guest_signature_workflow_automation.sql` |
| `workflow_signers` | `on_signature_completed` | `notify_signature_completed` | `20251126000000_guest_signature_workflow_automation.sql` |
| `workflow_signers` | `on_signature_notify_creator` | `notify_creator_on_signature` | `20251127000000_ecox_audit_trail_and_creator_notifications.sql` |
| `public.workflow_notifications` | `trg_prevent_status_regression` | `prevent_status_regression` | `20251128000004_cleanup_and_optimize_notifications.sql` |
| `public.bitcoin_ots_files` | `set_public_bitcoin_ots_files_updated_at` | `public.update_bitcoin_ots_files_updated_at` | `20251208100000_create_bitcoin_ots_files.sql` |
| `public.document_folders` | `trg_document_folders_updated_at` | `public.update_document_folders_updated_at` | `20251208110000_document_folders_and_privacy.sql` |
| `public.nda_templates` | `trg_nda_templates_updated_at` | `public.update_nda_templates_updated_at` | `20251208110001_nda_templates_events.sql` |
| `public.certificate_regeneration_requests` | `trg_certificate_regen_updated_at` | `public.update_certificate_regen_updated_at` | `20251208113000_document_folder_functions.sql` |
| `auth.users` | `trigger_queue_welcome_email` | `public.queue_welcome_email` | `20251219000000_welcome_email_system.sql` |
| `auth.users` | `trigger_queue_welcome_email` | `public.queue_system_welcome_email` | `20251219160000_fix_system_emails.sql` |
| `auth.users` | `trigger_queue_welcome_email` | `public.queue_system_welcome_email` | `20251220110000_founder_badges.sql` |
| `user_documents` | `on_user_documents_blockchain_anchoring` | `trigger_blockchain_anchoring` | `20251221100000_blockchain_anchoring_trigger.sql` |
| `public.anchor_states` | `anchor_states_updated_at` | `public.update_anchor_states_updated_at` | `20251224170000_add_anchor_states.sql` |
| `auth.users` | `on_auth_user_created` | `public.handle_new_user` | `20260105000000_auto_create_profile_trigger.sql` |
| `document_entities` | `update_document_entities_updated_at` | `update_updated_at_column` | `20260106090001_document_entities_triggers.sql` |
| `document_entities` | `document_entities_immutability_guard` | `enforce_document_entities_immutability` | `20260106090001_document_entities_triggers.sql` |
| `document_entities` | `document_entities_append_only_guard` | `enforce_document_entities_append_only` | `20260106090001_document_entities_triggers.sql` |
| `document_entities` | `document_entities_events_append_only_guard` | `enforce_events_append_only` | `20260106090005_document_entities_events.sql` |
| `document_entities` | `document_entities_update_tsa_latest` | `update_tsa_latest` | `20260106090005_document_entities_events.sql` |
| `document_entities` | `trg_events_append_only` | `enforce_events_append_only` | `20260106130000_harden_events_canonical_invariants.sql` |
| `document_entities` | `trg_anchor_network_unique` | `validate_anchor_uniqueness` | `20260106130000_harden_events_canonical_invariants.sql` |
| `operations` | `trigger_operations_updated_at` | `update_operations_updated_at` | `20260109100000_create_operations.sql` |
| `operation_documents` | `trg_set_operation_document_added_by` | `set_operation_document_added_by` | `20260109100001_fix_operation_documents_rls.sql` |
| `operations` | `enforce_draft_transition` | `validate_draft_transition` | `20260109110000_add_draft_support.sql` |
| `operation_documents` | `trigger_cleanup_draft_on_protect` | `cleanup_draft_on_protect` | `20260110000000_add_draft_support.sql` |
| `workflow_fields` | `trigger_workflow_fields_updated_at` | `update_workflow_fields_updated_at` | `20260110120000_create_workflow_fields.sql` |
| `public.batches` | `set_batches_updated_at` | `public.update_updated_at_column` | `20260115030000_create_batches_table.sql` |
| `public.executor_jobs` | `executor_jobs_updated_at` | `public.update_updated_at_column` | `20260116090000_executor_jobs_and_outbox.sql` |
| `public.domain_outbox` | `domain_outbox_updated_at` | `public.update_updated_at_column` | `20260116090000_executor_jobs_and_outbox.sql` |
| `public.document_entities` | `trg_events_write_guard` | `public.enforce_events_write_guard` | `20260117140000_guard_document_entity_events.sql` |
| `public.document_entities` | `document_entities_hash_only_witness_hash` | `public.set_hash_only_witness_hash` | `20260118193000_hash_only_witness_hash.sql` |
| `public.feature_flags` | `update_feature_flags_updated_at` | `update_feature_flags_updated_at_column` | `20260126200000_feature_flags_persistent_table.sql` |
| `document_entities` | `on_document_entity_events_change` | `process_document_entity_events` | `20260127181058_document_entities_events_listener.sql` |
| `public.feature_flags` | `update_feature_flags_updated_at` | `update_feature_flags_updated_at_column` | `20260127185705_create_feature_flags_table.sql` |
| `public.feature_flags` | `update_feature_flags_updated_at` | `update_feature_flags_updated_at_column` | `20260127190053_safe_create_feature_flags_table.sql` |
| `document_entities` | `on_document_entity_events_change` | `process_document_entity_events` | `20260127233000_document_entities_events_listener.sql` |
| `public.feature_flags` | `update_feature_flags_updated_at` | `update_feature_flags_updated_at_column` | `20260127235500_create_feature_flags_table.sql` |
| `public.feature_flags` | `update_feature_flags_updated_at` | `update_feature_flags_updated_at_column` | `20260127235800_safe_create_feature_flags_table.sql` |
| `public.feature_flags` | `update_feature_flags_updated_at` | `update_feature_flags_updated_at_column` | `20260129120000_final_feature_flags.sql` |
| `public.user_documents` | `trg_user_documents_active_requires_proof` | `public.enforce_active_requires_proof_events` | `20260131000700_guard_active_requires_proof_events.sql` |

**Observación pre‑mortem (importante)**: el trigger `trigger_queue_welcome_email` aparece definido en múltiples migraciones sobre `auth.users`. En prod solo puede existir una definición activa con ese nombre; esto es candidato a drift (qué función quedó realmente instalada).

---

## Crons (jobname → schedule → command)

### Snapshot prod (pg_cron)
Snapshot aportado por operación (Feb 2026):
- `process-polygon-anchors` → `*/1 * * * *` → `SELECT public.invoke_process_polygon_anchors();`
- `process-bitcoin-anchors` → `*/5 * * * *` → `SELECT public.invoke_process_bitcoin_anchors();`
- `recover-orphan-anchors` → `*/5 * * * *` → `SELECT detect_and_recover_orphan_anchors();`
- `runtime-tick` → `*/1 * * * *` → `SELECT public.runtime_tick();`
- `send_emails_pending_job` → `*/5 * * * *` → `net.http_post(...)` a `send-pending-emails`

### Migrations (definiciones encontradas)
| jobname | schedule | command | migration |
|---|---|---|---|
| `process-polygon-anchors` | `*/1 * * * *` | `SELECT net.http_post( url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors', headers…` | `20260111060100_fix_cron_jobs.sql` |
| `process-bitcoin-anchors` | `*/5 * * * *` | `SELECT net.http_post( url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors', headers…` | `20260111060100_fix_cron_jobs.sql` |
| `process-polygon-anchors` | `*/1 * * * *` | `SELECT public.invoke_process_polygon_anchors();` | `20260118060000_fix_anchor_cron_auth.sql` |
| `process-bitcoin-anchors` | `*/5 * * * *` | `SELECT public.invoke_process_bitcoin_anchors();` | `20260118060000_fix_anchor_cron_auth.sql` |
| `invoke-fase1-executor` | `*/1 * * * *` | `SELECT public.invoke_fase1_executor();` | `20260118070000_add_fase1_executor_cron.sql` |
| `runtime-tick` | `*/1 * * * *` | `SELECT public.runtime_tick();` | `20260131001100_runtime_tick_single_cron.sql` |

**Punto de ruptura probable**: coexistencia de crons “viejos” vs “runtime_tick único”. `20260131001100_runtime_tick_single_cron.sql` intenta `cron.unschedule('invoke-fase1-executor')`, pero si en prod el nombre efectivo difiere (ej. `invoke-fase1-executor` vs `runtime-tick` vs wrapper custom), el drift vuelve.

---

## Edge functions (endpoint → auth → qué tablas toca)

Tabla generada desde `supabase/functions/*/index.ts` (heurística):
- `auth`: `service_role_enforced` (chequeo explícito) / `service_role_used_no_gate` (usa service role pero puede no tener guard explícito) / `user_jwt` / `user_jwt_optional` / `unknown`.
- `tablas`: solo DB (`supabase.from(...)`), se filtra `supabase.storage.from(...)`.

| endpoint | auth (heurístico) | tablas (db) | rpcs |
|---|---|---|---|
| `/accept-invite-nda` | `service_role_used_no_gate` | `invites`, `shadow_decision_logs` | — |
| `/accept-nda` | `service_role_used_no_gate` | `access_events`, `links`, `nda_acceptances`, `recipients`, `shadow_decision_logs` | — |
| `/accept-share-nda` | `service_role_used_no_gate` | `document_shares`, `shadow_decision_logs` | — |
| `/accept-workflow-nda` | `service_role_used_no_gate` | `shadow_decision_logs`, `workflow_signers` | — |
| `/anchor-bitcoin` | `service_role_used_no_gate` | `anchor_states`, `anchors`, `user_documents` | — |
| `/anchor-polygon` | `service_role_used_no_gate` | `anchor_states`, `anchors`, `user_documents` | — |
| `/anchoring-health-check` | `service_role_used_no_gate` | `anchors` | — |
| `/append-tsa-event` | `unknown` | — | — |
| `/apply-signer-signature` | `service_role_used_no_gate` | `batches`, `shadow_decision_logs`, `signature_workflows`, `workflow_events`, `workflow_signers` | — |
| `/auto-tsa` | `unknown` | — | — |
| `/build-artifact` | `service_role_used_no_gate` | `document_entities` | — |
| `/build-final-artifact` | `service_role_used_no_gate` | `signature_workflows`, `workflow_artifacts`, `workflow_events` | — |
| `/cancel-workflow` | `user_jwt` | `shadow_decision_logs`, `signature_workflows` | — |
| `/confirm-signer-identity` | `service_role_used_no_gate` | `shadow_decision_logs`, `workflow_signers` | — |
| `/create-custody-upload-url` | `unknown` | `document_entities` | — |
| `/create-invite` | `unknown` | `invites`, `user_documents` | `generate_invite_token` |
| `/create-signer-link` | `service_role_used_no_gate` | `events`, `signer_links`, `user_documents` | — |
| `/dead-jobs` | `service_role_used_no_gate` | `executor_jobs` | — |
| `/fase1-executor` | `service_role_used_no_gate` | `document_entities`, `executor_job_runs`, `executor_jobs` | — |
| `/feature-flags-status` | `service_role_used_no_gate` | `feature_flags` | — |
| `/generate-link` | `user_jwt` | `documents`, `links`, `recipients`, `user_documents` | — |
| `/get-signed-url` | `unknown` | `workflow_signers` | — |
| `/health` | `service_role_used_no_gate` | `executor_jobs` | — |
| `/health-check` | `service_role_used_no_gate` | `anchors`, `user_documents` | — |
| `/legal-timestamp` | `unknown` | — | — |
| `/load-draft` | `unknown` | `operation_documents`, `operations` | — |
| `/log-ecox-event` | `service_role_used_no_gate` | — | — |
| `/log-event` | `user_jwt` | `events`, `user_documents` | — |
| `/log-workflow-event` | `service_role_used_no_gate` | `signer_otps`, `workflow_signers` | — |
| `/monitoring-dashboard` | `service_role_used_no_gate` | `document_entities`, `executor_job_runs`, `executor_jobs`, `feature_flags` | — |
| `/new-document-canonical-trigger` | `service_role_used_no_gate` | `document_entities`, `user_documents` | — |
| `/notify-artifact-ready` | `service_role_used_no_gate` | `auth.users`, `workflow_artifacts`, `workflow_notifications` | — |
| `/notify-document-certified` | `service_role_used_no_gate` | `user_documents` | — |
| `/notify-document-signed` | `service_role_used_no_gate` | `auth.users`, `signer_links` | — |
| `/orchestrator` | `service_role_used_no_gate` | `executor_job_runs`, `executor_jobs` | — |
| `/process-bitcoin-anchors` | `service_role_enforced` | `anchor_states`, `anchors`, `document_entities`, `user_documents`, `workflow_notifications` | — |
| `/process-polygon-anchors` | `service_role_enforced` | `anchor_states`, `anchors`, `document_entities`, `user_documents`, `workflow_notifications` | — |
| `/process-signature` | `service_role_used_no_gate` | `auth.users`, `document_entities`, `workflow_notifications`, `workflow_signatures`, `workflow_signers`, `workflow_versions` | — |
| `/process-signer-signed` | `service_role_used_no_gate` | `signature_workflows`, `workflow_events`, `workflow_signers` | — |
| `/record-protection-event` | `user_jwt_optional` | `document_entities`, `executor_jobs`, `user_documents` | — |
| `/record-signer-receipt` | `service_role_used_no_gate` | `signer_receipts` | — |
| `/register-custody-upload` | `unknown` | `document_entities` | — |
| `/reissue-signer-token` | `user_jwt` | `signature_workflows`, `workflow_signers` | — |
| `/reject-signature` | `service_role_used_no_gate` | `shadow_decision_logs`, `signature_workflows`, `workflow_signers` | — |
| `/repair-missing-anchor-events` | `service_role_used_no_gate` | `anchors`, `document_entities`, `user_documents` | — |
| `/request-document-changes` | `service_role_used_no_gate` | `shadow_decision_logs`, `signature_workflows`, `workflow_notifications`, `workflow_signers` | — |
| `/respond-to-changes` | `user_jwt` | `shadow_decision_logs`, `signature_workflows`, `workflow_notifications`, `workflow_signers` | — |
| `/run-tsa` | `service_role_used_no_gate` | `document_entities` | — |
| `/save-draft` | `unknown` | `operation_documents`, `operations` | — |
| `/send-pending-emails` | `service_role_used_no_gate` | `system_emails`, `workflow_notifications`, `workflow_signers` | — |
| `/send-share-otp` | `unknown` | — | — |
| `/send-signer-otp` | `service_role_used_no_gate` | `signer_otps`, `workflow_signers` | — |
| `/send-signer-package` | `service_role_used_no_gate` | `workflow_signers` | — |
| `/send-welcome-email` | `service_role_used_no_gate` | `founder_badges`, `system_emails` | — |
| `/set-feature-flag` | `service_role_used_no_gate` | `feature_flags` | — |
| `/signer-access` | `service_role_used_no_gate` | `signer_otps`, `workflow_signers` | — |
| `/signnow` | `service_role_used_no_gate` | `integration_requests`, `signature_workflows`, `workflow_signers` | — |
| `/signnow-webhook` | `service_role_used_no_gate` | `auth.users`, `document_entities`, `signature_workflows`, `workflow_notifications`, `workflow_signers` | — |
| `/stamp-pdf` | `unknown` | — | — |
| `/start-signature-workflow` | `user_jwt` | `shadow_decision_logs`, `signature_workflows`, `workflow_notifications`, `workflow_signers`, `workflow_versions` | — |
| `/store-encrypted-custody` | `unknown` | `custody_audit_log`, `document_entities` | — |
| `/store-signer-signature` | `service_role_used_no_gate` | `signature_workflows`, `workflow_signers` | — |
| `/submit-anchor-bitcoin` | `service_role_used_no_gate` | `document_entities` | — |
| `/submit-anchor-polygon` | `service_role_used_no_gate` | `document_entities` | — |
| `/test-email` | `unknown` | — | — |
| `/test-insert-notification` | `service_role_used_no_gate` | `workflow_notifications` | — |
| `/verify-access` | `service_role_used_no_gate` | `access_events`, `documents`, `links`, `nda_acceptances`, `recipients`, `user_documents` | — |
| `/verify-ecox` | `unknown` | `anchor_states` | — |
| `/verify-invite-access` | `unknown` | `invites` | — |
| `/verify-signer-otp` | `service_role_used_no_gate` | `signature_workflows`, `signer_otps`, `workflow_signers` | — |
| `/verify-workflow-hash` | `service_role_used_no_gate` | `ecox_audit_trail`, `signature_workflows`, `workflow_signers` | — |
| `/wake-authority` | `service_role_used_no_gate` | — | — |
| `/workflow-fields` | `unknown` | `workflow_fields` | — |

**Punto de ruptura probable**: endpoints con `service_role_used_no_gate` (usa service role “internamente”) pero sin guard explícito → riesgo de exposición si quedan públicos por config/CORS.

---

## Workers / orchestrator / executor: qué encola qué, y con qué evento

### Cadena canónica — “Protección” (TSA + opcional anchors + artifact)
1) **UI / cliente**: solicita protección (no escribe TSA/anchors).
2) **`record-protection-event`**:
   - append event: `document.protected.requested`
   - encola `executor_jobs` tipo `protect_document_v2` (dedupe_key por entity + type)
   - best‑effort “wake”: POST a `fase1-executor` y `orchestrator` para no esperar al próximo cron.
3) **`runtime_tick()`** (cron por minuto):
   - corre `reclaim_stale_jobs()`
   - invoca `fase1-executor` (decision)
   - invoca `orchestrator` (execution)
4) **`fase1-executor`**:
   - reclama jobs iniciales (`claim_initial_decision_jobs`)
   - encola downstream: `run_tsa`, `submit_anchor_*`, `build_artifact` según plan/flags.
5) **`orchestrator`**:
   - reclama jobs (`claim_orchestrator_jobs`)
   - setea `trace_id` por intento
   - heartbeat vía `update_job_heartbeat`
   - llama a worker por tipo: `run-tsa`, `submit-anchor-*`, `build-artifact`
6) **Workers** escriben eventos canónicos vía `appendEvent(...)` → `append_document_entity_event(...)`:
   - `tsa.confirmed` / `tsa.failed`
   - `anchor.pending` / `anchor.failed` (confirmación real viene por cron de process-anchors)
   - `artifact.finalized` / `artifact.failed`

### Cadena anchors (confirmación pública)
- `submit-anchor-*` típicamente registra “pending” (tracking).
- `process-polygon-anchors` / `process-bitcoin-anchors` (crons) confirman (evidence) con `anchor` / `anchor.confirmed`.

---

## Contrato de eventos y naming

### Event envelope (canónico)
Invariantes del evento dentro de `document_entities.events[]`:
- `id` (UUID)
- `v` (versión envelope, default 1)
- `actor` (quién lo emitió; en práctica el source/worker)
- `entity_id` (UUID del `document_entities.id`)
- `correlation_id` (UUID, **debe ser** el `document_entities.id` en nuestro modelo actual)
- `kind` (string; **sin underscore**)
- `at` (ISO 8601)

### Lista de kinds canónicos (document_entities.events[])
**Evidence**
- `document.protected.requested`
- `tsa.confirmed`
- `anchor` / `anchor.confirmed`
- `artifact.finalized`
- `document.signed`

**Tracking / fallo**
- `tsa.failed`
- `anchor.pending`
- `anchor.failed`
- `artifact.failed`
- `protection.failed`

### Legacy / drift detectado (rompe contrato actual)
Actualmente hay edge functions que intentan emitir kinds con underscore:
- `share_created`, `share_opened`, `nda_accepted`, `otp_verified`

Pero `appendEvent(...)` rechaza underscore (`supabase/functions/_shared/eventHelper.ts`), por lo que **esos eventos no quedan registrados** (se pierde evidencia / trazabilidad).

**Fix canónico recomendado (antes de Canary)**:
- migrar naming a dot‑notation:
  - `share.created`, `share.opened`
  - `nda.accepted`
  - `otp.verified`
- actualizar UI timeline labels (`client/src/lib/verifier/normalizeEvents.ts`) para soportar el nuevo naming (y opcionalmente mapear legacy→canonical por 30 días si hay data histórica).

---

## Tabla “frontend espera vs backend emite”

| UI estado / expectativa | Backend “hecho” (evento canónico) | Dónde se deriva en UI |
|---|---|---|
| “Protegido” | `tsa.confirmed` | `client/src/lib/protectionLevel.ts` (`hasTsaConfirmed`), `client/src/components/DocumentRow.tsx` |
| “Procesando” | `document.protected.requested` presente **sin** `tsa.confirmed` y **sin** fallos | `client/src/components/DocumentRow.tsx`, `client/src/pages/DocumentsPage.tsx` (polling fallback) |
| “Error” | `tsa.failed` o `protection.failed` o `anchor.failed` | `client/src/components/DocumentRow.tsx` |
| Nivel probatorio (active/reinforced/total) | TSA + anchors confirmados | `client/src/pages/DocumentsPage.tsx` (`deriveProbativeState`) |
| Timeline verificador | labels según kind | `client/src/lib/verifier/normalizeEvents.ts` |

**Observación**: la UI ya tiene (a) Realtime subscription a `document_entities` y (b) polling rápido si falla Realtime para evitar refresh manual.

---

## Lugares donde se “deriva estado”

**Canonical** (solo desde `events[]`, sin fallbacks):
- `client/src/pages/DocumentsPage.tsx` (`deriveProbativeState`)
- `client/src/lib/protectionLevel.ts` (derivación de nivel y helpers)
- `client/src/components/DocumentRow.tsx` (badge simple: Procesando/Protegido/Error)
- `client/src/lib/verifier/normalizeEvents.ts` (timeline labels)

**Punto de ruptura probable**: drift de naming (kinds) rompe labels/badges silenciosamente.

---

## Modelo de identidad y correlación

### correlation_id (flujo lógico)
**Regla canónica**: `correlation_id = document_entity_id`.

Entry points:
- `record-protection-event` setea `executor_jobs.correlation_id = documentEntityId`.
- `orchestrator` propaga correlation_id a workers por body.
- Los workers agregan `correlation_id` al evento.

**Punto de ruptura probable (alto)**:
- `appendEvent` hoy genera `correlation_id` random si no viene o no es UUID (`supabase/functions/_shared/eventHelper.ts`). Eso contradice el modelo (correlation==entity) y hace trazas “decorativas”.
  - Fix: default a `documentEntityId` y/o enforce DB check.

### trace_id (ejecución concreta)
**Regla**: `trace_id` identifica “este intento de este job”.
- `orchestrator` genera `trace_id` por job run y lo guarda en `executor_jobs.trace_id` (último intento) y en `executor_job_runs` (histórico).
- Policy gradual: jobs creados post cutoff deben completar con trace_id (log‑only por ahora).

### Jobs legacy
- Coexisten `document.protected` (legacy) y `protect_document_v2` (v2). Canary necesita decisión explícita de “qué admitimos en producción” y por cuánto.

---

## Modelo: Documentos ↔ Operaciones (source‑of‑truth)

### Source of truth (propuesta explícita para Canary)
- **Documento canónico**: `document_entities` (identidad probatoria y técnica: hashes, witness, custody_mode, events[]).
- **Documento “vista de usuario”**: `user_documents` (UX + storage path del PDF visible + metadata del usuario). No debe ser fuente de verdad probatoria.
- **Operación**: `operations` (caso/carpeta lógica; no altera evidencia).
- **Binding**: `operation_documents` (many‑to‑many entre operación y documento).
  - En “draft”: `operation_documents.document_entity_id` puede ser `NULL` y se usa `draft_file_ref` + `draft_metadata` (contrato de preparación).
  - Al “proteger” el draft: se llena `document_entity_id` y un trigger limpia `draft_*` (append‑only de decisión, no de evidencia).
- **Audit de operación**: `operations_events` (append‑only audit log de eventos `operation.*`, separado de `document_entities.events[]`).

### Invariantes (bloqueantes para Canary)
1) **Mover a operación no cambia evidencia**: operación/binding no debe escribir ni mutar `document_entities.events[]`.
2) **Identidad única por documento**: todo lo que el usuario percibe como “el mismo documento” debe estar anclado por `document_entity_id` (y `correlation_id`).
3) **Operación es una vista**: en UI, “Documentos” y “Operaciones” son dos lenses sobre el mismo set de `document_entity_id`, no dos entidades duplicadas.

### Punto de ruptura probable (lo que viste como “duplicación visual”)
- Si el UI construye listados desde dos fuentes (ej. documentos sueltos + documentos dentro de operación) sin deduplicar por `document_entity_id`, el usuario ve “dos documentos”.
- Eso no es solo UX: rompe modelo mental y abre riesgo legal (“¿cuál es el documento real?”).

### Fix canónico (sin tocar evidencia)
- Definir una regla de dedupe UI: *clave primaria de render = `document_entity_id`*.
- En “vista operación”, mostrar el documento canónico + metadata del binding (ej. `added_at`, `draft_metadata.order`, notas).
- Si se necesita “referencias múltiples” (mismo doc en varias operaciones), eso es **producto**: se representa como múltiples bindings, no múltiples documentos.

---

## Puntos de seguridad (pre‑mortem)

### OTP de firmantes (workflow_signers / signer_otps)
- Hash almacenado: `signer_otps.otp_hash` (nunca plaintext), con `expires_at` y `attempts`. Ver `supabase/migrations/20251214100000_signer_receipts_otp.sql`.
- Riesgos:
  - rate limit: que exista y sea uniforme en `send-signer-otp` + `verify-signer-otp`.
  - replay: `verified_at` debe impedir re‑uso efectivo.
  - eventos probatorios: hoy se intenta emitir `otp_verified` (underscore) → no queda en `document_entities.events[]` con el contrato actual.

### Decrypt client-side (E2E)
- Session secret client‑side (persistido en `localStorage`) y unwrapKey derivado con salt desde DB (`profiles.wrap_salt`).
- Riesgos:
  - pérdida de `localStorage` ⇒ documentos inaccesibles (diseño explícito, pero necesita UX de “warning” y recuperación).
  - “force reinit” o regeneración de session secret puede invalidar wraps previos.

### Custody: original cifrado vs Copia Fiel (witness)

**Artefactos (no mezclar)**
- **Original**: payload subido por el usuario. Si se guarda, se guarda **cifrado** en bucket `custody` (nunca plaintext).
- **Copia Fiel / witness**: PDF “usable” para el usuario (y verificable), típicamente en `witness_current_storage_path` (bucket `user-documents`).
- **Evidencia**: `document_entities.events[]` + hashes + TSA/anchors (nunca contienen el contenido).

**Contrato de storage (DB)**
- `document_entities.custody_mode` es **inmutable** por trigger (`enforce_document_entities_immutability`).
- El constraint `document_entities_custody_storage_consistent` fue relajado para permitir `source_storage_path` incluso con `custody_mode='hash_only'` (esto rompe la semántica “custody_mode indica si hay original guardado”).

**Dónde se implementa hoy**
- UI elige “guardar original” en `client/src/components/LegalCenterModalV2.tsx` (`custodyModeChoice`) y sube el original cifrado con `storeEncryptedCustody(...)`.
- Upload directo a Storage:
  - `supabase/functions/create-custody-upload-url`
  - `supabase/functions/register-custody-upload`
  - bucket `custody` con policies “owner read/upload/delete” (`supabase/migrations/20260110100000_create_custody_storage_bucket.sql`).
- Descarga “original” en UI:
  - `client/src/pages/DocumentsPage.tsx` (`handleOriginalDownload`) crea signed URL en bucket `custody`, descarga ciphertext y descifra client-side.
  - El botón está **gated** por: `custody_mode === 'encrypted_custody' && source_storage_path` (también en `client/src/components/DocumentRow.tsx`).

**Punto de ruptura que explica el síntoma reportado (“marco guardar original pero nunca puedo descargarlo”)**
- Si el sistema permite `source_storage_path` en `hash_only`, pero la UI exige `custody_mode='encrypted_custody'`, el original puede existir y aun así el botón queda deshabilitado o el flujo de download se corta temprano.
- Si el “modo” se decide en UI pero el `custody_mode` es inmutable en DB, cualquier intento de “flip” post-creación es frágil o directamente imposible.

**Decisión canónica necesaria antes de Canary (no se puede dejar ambiguo)**
Elegir una y solo una:
1) **Hash-only (honesto)**: no se promete ni se ofrece descargar original; “guardar original” se elimina o queda detrás de feature flag.
2) **Custody recuperable (producto)**: si el usuario elige guardar original, se garantiza:
   - `source_storage_path` presente,
   - UI “Descargar original” siempre habilitado,
   - key derivation/recovery definida (hoy: derivación débil por `user.id`, funcional pero no ideal).
3) **Híbrido (por doc)**: el sistema soporta ambos, pero entonces `custody_mode` debe ser **fuente de verdad** o se introduce un campo explícito tipo `original_available` / `source_custody_status` para no inferir por heurística.

### Share link + NDA
Existen dos líneas:
- **Link legacy**: `links` + `recipients` + `nda_acceptances` + `access_events` (y eventos probatorios `share_*` en `document_entities`).
- **E2E shares**: `document_shares` (wrapped_key + otp_hash), más `send-share-otp` (solo email) y `accept-share-nda`.

**Decisión canónica sugerida**:
- La asociación de NDA pertenece a la historia del documento (`nda.attached` / `nda.accepted`), pero el share decide `include_nda=true|false` sin reescribir historia.

---

## Hardening bloqueante (antes de Canary)

### Decisión 1 — Clasificación de endpoints (no dejar “unknown”)
Antes de Canary, cada Edge Function debe caer en una sola de estas categorías:
1) **Internal (service role only)**: solo invocable por cron/engine/backend. Debe exigir `service_role` (guard explícito).
2) **User-auth (JWT)**: invocable por el navegador, requiere usuario autenticado y RLS aplica.
3) **Public stateless**: no toca DB ni secretos; si es público, debe tener rate limit y límites de payload (para evitar abuso).

### Decisión 2 — Política mínima de auth
Bloqueante Canary:
- Todo endpoint “internal” debe tener guard explícito estilo `requireServiceRole(...)` (no solo “usa service role key”).
- Todo endpoint “user-auth” debe validar JWT y fallar 401 si falta.
- Todo endpoint “public stateless” debe tener:
  - CORS allowlist consistente
  - rate limiting (edge)
  - límites de tamaño (PDF base64, fields)

### “Unknown” actuales que hay que cerrar (ejemplos relevantes)
- `stamp-pdf`: hoy es **stateless** (no DB). Decidir: `public stateless` + rate limit + límites de tamaño (recomendado).
- `legal-timestamp`: hace fetch externo (TSA). Decidir: `internal service_role only` (recomendado) o agregar rate limit fuerte + anti-abuse si quedara público.
- `send-share-otp`: envía email (external). Decidir: `user-auth` o `internal`. Hoy no valida usuario ni service role → riesgo de abuso/spam.

### Checklist de hardening (DoD Canary)
- [ ] No quedan endpoints “unknown” en esta clasificación.
- [ ] Todos los endpoints “internal” fallan sin `service_role` (403/401).
- [ ] Todos los endpoints que hacen fetch externo tienen timeout (AbortController) y logs estructurados.
- [ ] Se define qué endpoints pueden ser invocados por cron (`pg_cron`) y cuáles por UI.

---

## Matriz de flujos (happy paths)

### Flow Matrix (end‑to‑end)

| Flujo | Entrada | Eventos esperados (canónicos) | Jobs / workers | Bloqueos conocidos |
|---|---|---|---|---|
| Documento → Protección → Share (sin NDA) | `record-protection-event` + `generate-link` | `document.protected.requested` → `tsa.confirmed` → `share.created` → `share.opened` | `protect_document_v2` → `run_tsa` (+ opcional anchors) | Naming drift underscore en `share_*`; correlation_id default random si el writer omite |
| Documento → NDA → Share (con NDA) | `generate-link(require_nda=true)` + `accept-nda` + `verify-access` | `share.created(include_nda=true)` → `nda.accepted` → `share.opened` | (sin jobs) | Naming drift underscore en `nda_accepted`; decisión canónica include_nda (share vs historia) |
| Documento protegido → Operación → Firma secuencial → Certificado | `addDocumentToOperation` + `start-signature-workflow` + `process-signature` + `build-final-artifact` | `signature` (→ `document.signed`) + `workflow.artifact_finalized` | workflow pipeline + email queue | Gating de invitaciones (secuencialidad); modelo docs vs operaciones (duplicación UI) |
| Draft → Documento legal → Flujo de firmas → Anchor | `save-draft` → proteger → workflow | `document.protected.requested` → `tsa.confirmed` → `anchor.pending` → `anchor.confirmed` | runtime_tick + orchestrator + process-anchors | Draft dual-write (server+IndexedDB) y “load draft file server-side” pendiente |
| Custody (guardar original cifrado) | toggle `encrypted_custody` + upload custody | (no necesita evento; es storage contract) | — | Semántica rota: `source_storage_path` permitido en `hash_only` + UI gating por `custody_mode` |

> Nota: el Flow Matrix de arriba define *expectativas canónicas*. Los flujos detallados abajo sirven para ver rápidamente: **pasos**, **eventos**, **jobs**, **artefactos** y **estado UI** esperado. Si un evento “esperado” hoy no existe, eso es una brecha (P0) a cerrar antes de Canary.

### Flujo A — Proteger documento (TSA)
1) UI → `record-protection-event`
2) `document.protected.requested` (events[])
3) `executor_jobs: protect_document_v2` enqueued
4) `fase1-executor` encola `run_tsa`
5) `orchestrator` ejecuta `run-tsa`
6) `tsa.confirmed` (events[])
7) UI muestra “Protegido” sin refresh manual

**Artefactos**
- Copia Fiel / witness: PDF canónico descargable por el usuario (storage en `user_documents` / artifact pipeline).
- Evidencia: `document_entities.events[]` (TSA token + hashes).

**Estados UI esperados**
- “Confirmando…” (si el umbral de visibilidad evita mostrar “Procesando” cuando el TSA es rápido).
- “Procesando” mientras exista `document.protected.requested` sin `tsa.confirmed`.
- “Protegido” al entrar `tsa.confirmed`.

### Flujo A.1 — Guardar original cifrado (custody) + Proteger
1) UI: usuario elige `encrypted_custody`
2) Client-side: cifra el original y sube ciphertext a bucket `custody`
3) DB: se persiste `document_entities.source_storage_path` (y se define semántica de `custody_mode`)
4) Luego corre el flujo A (TSA) normalmente (independiente del custody)
5) UI: “Descargar original” funciona siempre que el original exista (no debe depender de inferencias ambiguas)

**Condición de cierre para Canary**: si el toggle existe, el original debe ser descargable; si no puede serlo, el toggle debe estar apagado/hidden y el contrato de producto debe declarar hash-only.

**Estados UI esperados**
- (opcional) “Confirmando…” < 800ms
- “Procesando” mientras existe request sin TSA
- “Protegido” al entrar `tsa.confirmed`

### Flujo B — Proteger + anchors
Igual a A, más:
- `submit-anchor-*` → `anchor.pending`
- crons `process-*-anchors` → `anchor`/`anchor.confirmed`
- UI sube nivel probatorio (reinforced/total)

### Flujo C — Documento → NDA → Protección → Share (con/sin NDA)
**Objetivo**: cerrar el flujo de producto “core” (uso legal) sin depender de anchors.

**Pasos (visión usuario)**
1) Usuario decide si el documento tendrá NDA asociada (historia) y si un share incluirá NDA (decisión del share).
2) Usuario protege el documento (TSA).
3) Usuario crea share link (con/sin NDA) y lo envía.
4) Receptor abre el link; si `require_nda`, acepta NDA antes de acceder.

**Pasos (técnico)**
1) Protección: ver Flujo A (TSA).
2) Share: `generate-link` crea `links`, `recipients` (y/o `document_shares` según implementación).
3) Acceso: `verify-access` valida link, registra `access_events` y checa `nda_acceptances`.
4) NDA: `accept-nda` / `accept-share-nda` escribe `nda_acceptances` y habilita el acceso.

**Eventos canónicos esperados (bloqueante Canary)**
- `share.created` (incluye `include_nda` + `require_nda` si aplica)
- `nda.accepted` (si aplica)
- `share.opened`

**Artefactos**
- PDF witness (descargable por receptor según permisos).
- (Opcional) NDA PDF (si el share incluye NDA).

**Estados UI esperados**
- En UI del owner: “Link creado”, “Abierto”, “NDA aceptada” (si aplica).
- En UI del receptor: antes de aceptar NDA: “Debes aceptar NDA”; luego: acceso a PDF.

**Evento probatorio esperado** (pero hoy con drift):
- `share.created` / `share.opened` (propuesto) en `document_entities.events[]`

### Flujo D — Documento protegido → Operación → Firma secuencial → Estampa → Certificado
**Objetivo**: cerrar el “happy path” de firma en orden determinista y con evidencia consistente.

**Pasos (visión usuario)**
1) Owner mueve/agrega el documento protegido a una operación (case/folder).
2) Owner inicia workflow de firma con N firmantes en orden.
3) Se envía OTP al firmante 1; solo cuando firma 1 termina, se habilita y se contacta al firmante 2, etc.
4) Al completar firmas: se genera estampa visible y certificado (artifact final).

**Pasos (técnico)**
1) Operación:
   - `operations` (creación)
   - `operation_documents` (binding al `document_entity_id`)
2) Workflow:
   - `start-signature-workflow` crea `signature_workflows`, `workflow_signers`, `workflow_versions` y notificaciones
   - `send-signer-otp` / `verify-signer-otp` controla acceso a firma (tablas `signer_otps`, `workflow_signers`)
3) Firma:
   - `store-signer-signature` / `apply-signer-signature` guarda y aplica firma (tablas `workflow_signers`, `workflow_events`, `workflow_signatures`)
4) Artifact:
   - `build-final-artifact` genera PDF final con estampa + anexos (tablas `workflow_artifacts`, `workflow_events`)

**Eventos canónicos esperados (mínimo para Canary)**
- Documento: `document.signed` (cuando el workflow se completa y el documento tiene evidencia de firma).
- Workflow: `workflow.artifact_finalized` (o evento equivalente en workflow_events) para cert/stamp.

**Artefactos**
- PDF final (con estampa de firmas): storage path en `workflow_artifacts` o equivalente.
- Certificado: derivado del workflow artifact o PDF separado.

**Estados UI esperados**
- “En operación” (binding)
- “En firma” (workflow started)
- “Esperando a firmante X” (gating secuencial)
- “Firmado” (workflow complete)
- “Certificado listo” (artifact finalized)

**Punto de ruptura probable (ya observado)**: emails/invitaciones salen todos juntos → falta gating determinista por evento (“firma anterior completada”).

#### Subflujo D.1 — OTP de firmantes (acceso a firma)
1) `send-signer-otp` crea/renueva OTP hash en `signer_otps`
2) `verify-signer-otp` valida + marca `verified_at`
3) La UI habilita el paso de firma (y el engine puede encolar/activar el siguiente firmante cuando corresponda)

**Evento probatorio esperado** (pero hoy con drift):
- `otp.verified` (propuesto) en `document_entities.events[]`

### Flujo E — Draft → Documento legal → Flujo de firmas → Anchor (opcional)
**Objetivo**: soportar preparación (draft) sin perder material y sin duplicar identidades.

**Pasos (técnico)**
1) Draft:
   - `save-draft` persiste en `operation_documents` con `draft_file_ref` / metadata (y potencialmente espejo en IndexedDB).
2) Convertir a documento legal:
   - Se crea `document_entities` (hash/witness) y se rellena `operation_documents.document_entity_id`.
3) Protección: Flujo A (TSA).
4) Firma: Flujo D (workflow).
5) Anchor (opcional):
   - `submit-anchor-*` → `anchor.pending`
   - `process-*-anchors` → `anchor.confirmed`

**Eventos canónicos esperados**
- `document.protected.requested` → `tsa.confirmed`
- `document.signed`
- (si anchors activados) `anchor.pending` → `anchor.confirmed`

**Estados UI esperados**
- “Borrador” (hasta que exista `document_entity_id`)
- “Procesando/Protegido”
- “En firma / Firmado”
- “Anclado” (si aplica)

---

## Entregable B — Lista corta de riesgos y fixes (priorizada)

### P0 — Riesgos que rompen evidencia o bloquean canary
1) **Riesgo**: drift de naming con underscore en events probatorios (`share_created`, `share_opened`, `nda_accepted`, `otp_verified`) ⇒ eventos no se apendean por contrato (underscore ban).  
   **Fix**: migrar a `share.created`, `share.opened`, `nda.accepted`, `otp.verified` + compat mapping en UI (30 días si hay data histórica).

2) **Riesgo**: `correlation_id` random por default en `appendEvent(...)` ⇒ trazabilidad “decorativa”, dead-jobs y auditoría por documento se vuelven inconsistentes.  
   **Fix**: default `correlation_id = documentEntityId` + opcional DB check (reject si correlation_id != entity_id).

3) **Riesgo**: “Guardar original cifrado” existe en UI pero el usuario no puede descargarlo de forma confiable ⇒ ruptura del contrato mental/legal (custodia).  
   **Fix**: decidir el contrato (hash-only vs custody recuperable vs híbrido) y alinear:
   - DB (`custody_mode`/constraints),
   - UI gating del botón (no inferir con reglas contradictorias),
   - key derivation/recovery (documentar y testear).

4) **Riesgo**: endpoints que usan service_role sin gate explícito (`service_role_used_no_gate`) ⇒ exposición si quedan públicos.  
   **Fix**: estandarizar `requireServiceRole` en endpoints internos + tests de CORS/auth.

5) **Riesgo**: jobs en `running` con `heartbeat_at` estancado (ej. `run_tsa`) ⇒ el usuario queda “Procesando” y no hay logs en el worker.  
   **Fix**: (a) timeouts obligatorios en *todos* los fetch externos (AbortController), (b) heartbeat independiente del handler (timer garantizado), (c) reclaim basado en TTL + heartbeat.

### P1 — Riesgos de operación / latencia / UX
5) **Riesgo**: drift de cron naming (jobs “viejos” no deshabilitados) ⇒ doble ejecución o colas raras.  
   **Fix**: script/consulta de auditoría de crons en prod + una sola fuente de verdad (runtime_tick + wrappers explícitos).

6) **Riesgo**: Realtime inestable (WSS) ⇒ usuarios refrescan/ven “Procesando” demasiado.  
   **Fix**: polling adaptativo mientras “processing” (ya existe) + umbral de visibilidad (ya existe) + wake engine best‑effort (ya existe).

### P2 — Riesgos de producto/legales
7) **Riesgo**: NDA “asociada” vs “incluir en share” ambiguo ⇒ inconsistencia legal y UX.  
   **Fix**: `nda.attached` (historia del doc) + `share.created(include_nda=bool)` (decisión del share).

---

## Checklist de cierre de happy paths (antes de Canary)
- [ ] Todos los events que se apendean a `document_entities.events[]` cumplen naming canónico (sin underscore).
- [ ] Todos los writers canónicos setean `correlation_id=document_entity_id` (sin defaults aleatorios).
- [ ] `orchestrator` y `fase1-executor` son invocables por cron y por wake sin generar carreras.
- [ ] `dead-jobs` responde consistentemente “qué está muerto, por qué y desde cuándo”.
- [ ] UI no requiere refresh manual (Realtime + polling fallback).
