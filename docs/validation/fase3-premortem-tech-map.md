# Pre‑Mortem Técnico (Macro Mapa) — Antes de Fase 3 (Canary)

**Fecha**: 2026-02-02  
**Objetivo**: congelar contratos + mapear el sistema completo (DB/cron/edge/UI) para anticipar puntos de ruptura antes de Canary.  
**Regla de oro**: *en Canary no “parcheamos micro”; primero cerramos contratos, naming y happy paths medibles*.

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

### Share link + NDA
Existen dos líneas:
- **Link legacy**: `links` + `recipients` + `nda_acceptances` + `access_events` (y eventos probatorios `share_*` en `document_entities`).
- **E2E shares**: `document_shares` (wrapped_key + otp_hash), más `send-share-otp` (solo email) y `accept-share-nda`.

**Decisión canónica sugerida**:
- La asociación de NDA pertenece a la historia del documento (`nda.attached` / `nda.accepted`), pero el share decide `include_nda=true|false` sin reescribir historia.

---

## Matriz de flujos (happy paths)

### Flujo A — Proteger documento (TSA)
1) UI → `record-protection-event`
2) `document.protected.requested` (events[])
3) `executor_jobs: protect_document_v2` enqueued
4) `fase1-executor` encola `run_tsa`
5) `orchestrator` ejecuta `run-tsa`
6) `tsa.confirmed` (events[])
7) UI muestra “Protegido” sin refresh manual

**Estados UI esperados**
- (opcional) “Confirmando…” < 800ms
- “Procesando” mientras existe request sin TSA
- “Protegido” al entrar `tsa.confirmed`

### Flujo B — Proteger + anchors
Igual a A, más:
- `submit-anchor-*` → `anchor.pending`
- crons `process-*-anchors` → `anchor`/`anchor.confirmed`
- UI sube nivel probatorio (reinforced/total)

### Flujo C — Share (link) + NDA
1) UI → `generate-link` (crea `recipients` + `links`)
2) Acceso → `verify-access` (logs `access_events`, chequea `nda_acceptances`)
3) (si `require_nda`) NDA → `accept-nda` (escribe `nda_acceptances`)
4) UI/recipient accede a PDF/eco según permisos

**Evento probatorio esperado** (pero hoy con drift):
- `share.created` / `share.opened` (propuesto) en `document_entities.events[]`

### Flujo D — OTP signer (firma)
1) `send-signer-otp` crea/renueva OTP hash en `signer_otps`
2) `verify-signer-otp` valida + marca `verified_at`
3) Se habilita siguiente paso del workflow / firma

**Evento probatorio esperado** (pero hoy con drift):
- `otp.verified` (propuesto) en `document_entities.events[]`

---

## Entregable B — Lista corta de riesgos y fixes (priorizada)

### P0 — Riesgos que rompen evidencia o bloquean canary
1) **Riesgo**: drift de naming con underscore en events probatorios (`share_created`, `share_opened`, `nda_accepted`, `otp_verified`) ⇒ eventos no se apendean por contrato (underscore ban).  
   **Fix**: migrar a `share.created`, `share.opened`, `nda.accepted`, `otp.verified` + compat mapping en UI (30 días si hay data histórica).

2) **Riesgo**: `correlation_id` random por default en `appendEvent(...)` ⇒ trazabilidad “decorativa”, dead-jobs y auditoría por documento se vuelven inconsistentes.  
   **Fix**: default `correlation_id = documentEntityId` + opcional DB check (reject si correlation_id != entity_id).

3) **Riesgo**: endpoints que usan service_role sin gate explícito (`service_role_used_no_gate`) ⇒ exposición si quedan públicos.  
   **Fix**: estandarizar `requireServiceRole` en endpoints internos + tests de CORS/auth.

### P1 — Riesgos de operación / latencia / UX
4) **Riesgo**: drift de cron naming (jobs “viejos” no deshabilitados) ⇒ doble ejecución o colas raras.  
   **Fix**: script/consulta de auditoría de crons en prod + una sola fuente de verdad (runtime_tick + wrappers explícitos).

5) **Riesgo**: Realtime inestable (WSS) ⇒ usuarios refrescan/ven “Procesando” demasiado.  
   **Fix**: polling adaptativo mientras “processing” (ya existe) + umbral de visibilidad (ya existe) + wake engine best‑effort (ya existe).

### P2 — Riesgos de producto/legales
6) **Riesgo**: NDA “asociada” vs “incluir en share” ambiguo ⇒ inconsistencia legal y UX.  
   **Fix**: `nda.attached` (historia del doc) + `share.created(include_nda=bool)` (decisión del share).

---

## Checklist de cierre de happy paths (antes de Canary)
- [ ] Todos los events que se apendean a `document_entities.events[]` cumplen naming canónico (sin underscore).
- [ ] Todos los writers canónicos setean `correlation_id=document_entity_id` (sin defaults aleatorios).
- [ ] `orchestrator` y `fase1-executor` son invocables por cron y por wake sin generar carreras.
- [ ] `dead-jobs` responde consistentemente “qué está muerto, por qué y desde cuándo”.
- [ ] UI no requiere refresh manual (Realtime + polling fallback).
