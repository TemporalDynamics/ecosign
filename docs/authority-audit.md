# Auditoría de Autoridad — Fase Cero (Mapeo)

Fecha: 2026-01-22

Objetivo: mapear **dónde vive la autoridad** (quién decide qué) sin migrar ni refactorizar.  
Alcance: triggers, cron jobs, edge functions, workers y funciones DB con lógica de decisión.

Definiciones rápidas
- **Decisión (🟥)**: elige el próximo paso, dispara efectos, cambia estados “de verdad”.
- **Validación (🟨)**: guardrail / invariantes, evita estados inválidos.
- **Persistencia (🟩)**: updated_at, caches derivadas, housekeeping.
- **Ejecución (⚙️)**: realiza tareas decididas en otro lugar.
- **TBD**: requiere inspección manual.

---

## Regla de trabajo (formal)

### Paso A — Inventario completo

Para **cada** Trigger / Cron / Edge Function / SQL Function / Worker:
1) ¿**Decide** algo? (elige el próximo paso / cambia destino)  
2) ¿**Valida** algo? (bloquea estados inválidos)  
3) ¿**Solo ejecuta**? (hace lo que otro ya decidió)

**Marcado obligatorio:**
- 🟥 Decisión → candidato a orquestador
- 🟨 Validación → guardrail (puede quedarse en DB)
- ⚙️ Ejecución → se queda, pero sin pensar
- 🟩 Derivado → cache/comfort
- TBD → falta inspección

### Paso B — Candidatos reales a migración

**Solo** las 🟥 (decisiones). No migrar ahora, solo **marcar**.

Ejemplos ya resueltos (referencia):
- **Decidir TSA** → ✅ migrado (D1)
- **Decidir anchors** → ✅ migrado (D4)
- **Decidir "está protegido"** → ✅ derivación canónica (D2)
- **Decidir artifact** → ✅ migrado (D3)

Decisiones aceptadas (Grupo 1 - Notificaciones):
- **Decidir notificar link de firma** → ✅ ACCEPTED (D5, 2026-01-23)
- **Decidir notificar firma completada** → ✅ ACCEPTED (D6, 2026-01-23)
- **Decidir notificar workflow completado** → ✅ ACCEPTED (D7, 2026-01-23)
- **Decidir notificar creador detallado** → ✅ ACCEPTED (D8, 2026-01-23)

Decisiones en shadow mode (Grupo 2 - Workflow):
- **Decidir cancelar workflow** → ✅ VALIDADO (D9, 2026-01-23, 1 run, 0 divergencias)
- **Decidir rechazar firma (signer)** → ✅ VALIDADO (D10, 2026-01-23, 2 runs, 0 divergencias)
- **Decidir confirmar identidad (signer)** → ✅ VALIDADO (D11, 2026-01-23, 1 run, 0 divergencias)

Ejemplos que probablemente siguen pendientes (a confirmar):
- Triggers de notificaciones
- Workflows de firma (avance de workflow)
- Aceptación de NDA / accesos
- Recuperación de orphans
- Crons de anchors

---

## Mapa inicial (incompleto, basado en repo)

### A) Triggers DB

Formato: `Trigger / Function` | Tipo | Decide/Efecto | Fuente

**Decisión / Notificaciones**
- `on_signer_created` → `notify_signer_link` | 🟥 | Encola email de firma al crear signer | ✅ ACCEPTED (D5, 2026-01-23) | `supabase/migrations/20251126000000_guest_signature_workflow_automation.sql`
- `on_signature_completed` → `notify_signature_completed` | 🟥 | Encola notificaciones al firmar | ✅ ACCEPTED (D6, 2026-01-23) | `supabase/migrations/20251126000000_guest_signature_workflow_automation.sql`
- `on_workflow_completed` → `notify_workflow_completed` | 🟥 | Encola notificaciones al completar workflow | ✅ ACCEPTED (D7, 2026-01-23) | `supabase/migrations/20251126000000_guest_signature_workflow_automation.sql`
- `on_signature_notify_creator` → `notify_creator_on_signature` | 🟥 | Encola notificación detallada al owner | ✅ ACCEPTED (D8, 2026-01-23) | `supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql`
- `trigger_queue_welcome_email` → `queue_welcome_email` / `queue_system_welcome_email` | 🟥 | Encola welcome email | `supabase/migrations/20251219000000_welcome_email_system.sql`, `supabase/migrations/20251219160000_fix_system_emails.sql`, `supabase/migrations/20251220110000_founder_badges.sql`

**Decisión / Anchoring**
- `on_user_documents_blockchain_anchoring` → `trigger_blockchain_anchoring` | 🟥 | Dispara edge functions de anchor (Polygon/Bitcoin) | `supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql`  
  - Variantes/ajustes: `supabase/migrations/20260116120000_fix_blockchain_trigger_no_app_settings.sql`, `supabase/migrations/20260117210000_fix_blockchain_trigger_auth.sql`, `supabase/migrations/20260117211000_remove_user_email_from_trigger.sql`

**Validación / Guardrails**
- `document_entities_immutability_guard` | 🟨 | Inmutabilidad de columnas críticas | `supabase/migrations/20260106090001_document_entities_triggers.sql`
- `document_entities_append_only_guard` | 🟨 | Append-only en logs internos | `supabase/migrations/20260106090001_document_entities_triggers.sql`
- `document_entities_events_append_only_guard` | 🟨 | Append-only + validación TSA events | `supabase/migrations/20260106090005_document_entities_events.sql`
- `trg_events_write_guard` | 🟨 | Bloquea updates directos a events[] | `supabase/migrations/20260117140000_guard_document_entity_events.sql`
- `trg_events_append_only` | 🟨 | Invariantes de events[] (canon) | `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`
- `trg_anchor_network_unique` | 🟨 | Unicidad de anchors por red | `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`
- `validate_document_not_revoked` | 🟨 | Evita operaciones en documentos revocados | `supabase/migrations/001_core_schema.sql`
- `trigger_validate_signer_security` | 🟨 | Reglas de seguridad de signer | `supabase/migrations/20251118010000_011_workflow_security_defaults.sql`
- `enforce_draft_transition` | 🟨 | Reglas de transición draft | `supabase/migrations/20260109110000_add_draft_support.sql`
- `trg_prevent_status_regression` | 🟨 | Evita regresión de estados | `supabase/migrations/20251128000004_cleanup_and_optimize_notifications.sql`
- `validate_anchor_witness_hash` (función + trigger) | 🟨 | Validación de witness hash | `supabase/migrations/20260106140000_validate_anchor_witness_hash.sql`

**Persistencia / Derivados**
- `update_document_entities_updated_at` | 🟩 | updated_at | `supabase/migrations/20260106090001_document_entities_triggers.sql`
- `document_entities_update_tsa_latest` | 🟩 | Cache de TSA latest | `supabase/migrations/20260106090005_document_entities_events.sql`
- `document_entities_hash_only_witness_hash` | 🟩 | Deriva witness hash (hash-only) | `supabase/migrations/20260118193000_hash_only_witness_hash.sql`
- `update_user_documents_updated_at` | 🟩 | updated_at | `supabase/migrations/20251115220000_007_user_documents.sql`
- `anchors_updated_at` | 🟩 | updated_at | `supabase/migrations/20251115140000_006_fix_anchors_table.sql`
- `update_signer_links_updated_at` | 🟩 | updated_at | `supabase/migrations/20251118120000_012_signer_links_and_events.sql`
- `update_contact_leads_updated_at` | 🟩 | updated_at | `supabase/migrations/20251107074810_003_create_contact_leads_table.sql`
- `set_batches_updated_at` | 🟩 | updated_at | `supabase/migrations/20260115030000_create_batches_table.sql`
- `trigger_workflow_fields_updated_at` | 🟩 | updated_at | `supabase/migrations/20260110120000_create_workflow_fields.sql`
- `trigger_operations_updated_at` | 🟩 | updated_at | `supabase/migrations/20260109100000_create_operations.sql`

---

### B) Cron jobs (pg_cron)

Formato: `Job` | Tipo | Decide/Efecto | Fuente

- `process-polygon-anchors` | 🟥 | Procesa confirmación de anchors Polygon, decide estado | `supabase/migrations/20260118060000_fix_anchor_cron_auth.sql`
- `process-bitcoin-anchors` | 🟥 | Procesa confirmación de anchors Bitcoin, decide estado | `supabase/migrations/20260118060000_fix_anchor_cron_auth.sql`
- `invoke-fase1-executor` | 🟥 | Invoca worker executor (jobs), decide ejecución | `supabase/migrations/20260118070000_add_fase1_executor_cron.sql`
- `recover-orphan-anchors` | 🟥 | Detecta orphans y decide recuperación | `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`
- `cleanup-rate-limits` | 🟩 | Limpieza de rate limits (no decide) | `supabase/migrations/20251115090000_005_rate_limiting.sql`

Notas operativas:
- Scripts adicionales para setup/repair de crons viven en `scripts/cron/`.
- Existen migraciones “legacy/fix” con tokens hardcodeados (`supabase/migrations/20260111060100_fix_cron_jobs.sql`).

---

### C) Edge Functions (Supabase)

Formato: `Function` | Categoría | Autoridad | Notas

**Anchoring / TSA**
- `anchor-polygon` | Anchoring | ⚙️ | Ejecuta anclaje + crea record (guardrails/dedupe) | `supabase/functions/anchor-polygon/index.ts`
- `anchor-bitcoin` | Anchoring | ⚙️ | Ejecuta anclaje Bitcoin + crea record (guardrails/dedupe) | `supabase/functions/anchor-bitcoin/index.ts`
- `process-polygon-anchors`, `process-bitcoin-anchors` | Anchoring | 🟥 | Procesan confirmación periódica, deciden estado | `supabase/functions/process-*-anchors/index.ts`
- `submit-anchor-polygon`, `submit-anchor-bitcoin` | Anchoring | 🟥 | Deciden envío de anclaje (validan estado previo) | `supabase/functions/submit-*-anchor/index.ts`
- `repair-missing-anchor-events` | Anchoring | ⚙️ | Fallback / reconciliación (ejecución) | `supabase/functions/repair-missing-anchor-events/index.ts`
- `auto-tsa`, `run-tsa`, `append-tsa-event` | TSA | 🟥 | Deciden/emiten TSA (validan estado) | `supabase/functions/auto-tsa/index.ts`, etc.
- `legal-timestamp` | TSA | ⚙️ | Ejecuta solicitud TSA externa (no decide) | `supabase/functions/legal-timestamp/index.ts`

**Workflow / Firma**
- `start-signature-workflow` | Workflow | 🟥 | Crea workflow/versiones/signers + setea estados | `supabase/functions/start-signature-workflow/index.ts`
- `process-signature` | Workflow | 🟥 | Valida, firma, cambia estados, avanza workflow | `supabase/functions/process-signature/index.ts`
- `apply-signer-signature` | Workflow | 🟥 | Valida + setea estado signer/workflow | `supabase/functions/apply-signer-signature/index.ts`
- `process-signer-signed` | Workflow | ⚙️ | Aplica firma en PDF + hash + evento | `supabase/functions/process-signer-signed/index.ts`
- `confirm-signer-identity` | Workflow | 🟥 | Confirma identidad (update + evento) | ✅ VALIDADO (D11, 2026-01-23) | `supabase/functions/confirm-signer-identity/index.ts`
- `reject-signature` | Workflow | 🟥 | Cancela signer (estado) | ✅ VALIDADO (D10, 2026-01-23) | `supabase/functions/reject-signature/index.ts`
- `cancel-workflow` | Workflow | 🟥 | Cancela workflow (estado) | ✅ VALIDADO (D9, 2026-01-23) | `supabase/functions/cancel-workflow/index.ts`
- `request-document-changes`, `respond-to-changes` | Workflow | TBD | Pendiente inspección

**Notificaciones / Emails**
- `notify-document-certified`, `notify-document-signed`, `notify-artifact-ready` | Notif | 🟥 | Deciden qué notificar basado en eventos | `supabase/functions/notify-*-ready/index.ts`
- `send-pending-emails`, `send-welcome-email`, `send-signer-otp`, `send-share-otp`, `send-signer-package` | Notif | ⚙️ | Ejecutan envíos (no deciden qué/enviar) | `supabase/functions/send-*-email/index.ts`

**Storage / Custody**
- `create-custody-upload-url`, `register-custody-upload`, `store-encrypted-custody` | Custody | ⚙️/TBD | Verificar side-effects
- `get-signed-url`, `save-draft`, `load-draft` | Storage | ⚙️ | Operaciones de datos

**Acceso / Verificación**
- `verify-access`, `verify-invite-access`, `verify-signer-otp`, `verify-workflow-hash`, `verify-ecox` | Verify | 🟨 | Validaciones (no deciden) | `supabase/functions/verify-*-access/index.ts`
- `accept-nda` | Access | 🟥 | Registra aceptación NDA + cambia estado | `supabase/functions/accept-nda/index.ts`
- `accept-share-nda` | Access | 🟥 | Registra aceptación NDA en shares + cambia estado | `supabase/functions/accept-share-nda/index.ts`
- `accept-workflow-nda`, `accept-invite-nda` | Access | 🟥 | Registra aceptación NDA + cambia estado | `supabase/functions/accept-*-nda/index.ts`
- `signer-access` | Access | TBD | Pendiente inspección

**Orquestación / Artefacto**
- `fase1-executor` | Executor | ⚙️ | Ejecuta jobs según cola (D3: decisión artifact → canónico)
- `build-artifact`, `build-final-artifact`, `stamp-pdf` | Artifact | ⚙️ | Ejecución (decisión D3 migrada)

**Logging / Observabilidad**
- `log-event`, `log-ecox-event`, `log-workflow-event`, `record-protection-event`, `record-signer-receipt` | Observability | ⚙️ | Persisten eventos

---

### F) Candidatos reales a migración (🟥)

Pendientes **a confirmar**, pero son decisiones activas hoy:

**Triggers de notificación (ACEPTADOS)**
- `notify_signer_link`, `notify_signature_completed`, `notify_workflow_completed`, `notify_creator_on_signature`

---

## Backlog crítico (Grupo C) — a definir contratos + shadow

Priorizar decisiones que **cambian estado** o **causan efectos**:

**Workflow / Firma**
- `cancel-workflow` — cancela workflow (estado)
- `reject-signature` — cancela firmante (estado)
- `confirm-signer-identity` — confirma identidad + avanza estado
- `apply-signer-signature` — valida + cambia estados de firma/workflow
- `start-signature-workflow` — crea workflow y estados iniciales
- `request-document-changes`, `respond-to-changes` — cambios de estado

**NDA / Accesos**
- `accept-nda`, `accept-workflow-nda`, `accept-invite-nda`, `accept-share-nda` — registran aceptación + cambian estado

**Crons con decisión**
- `recover-orphan-anchors`
- `process-polygon-anchors`, `process-bitcoin-anchors`

**Siguiente acción recomendada**
- Seleccionar 1 decisión crítica y redactar contrato (D9+).

**Workflow / firma (edge functions)**
- `start-signature-workflow` - Crea workflow y estados iniciales
- `process-signature` - Valida y avanza workflow
- `apply-signer-signature` - Valida y cambia estados de firma
- `reject-signature` - Cancela firmante y cambia estado
- `cancel-workflow` - Cancela workflow completo
- `confirm-signer-identity` - Confirma identidad y avanza
- `request-document-changes`, `respond-to-changes` - Cambia estado de workflow

**NDA / accesos (edge functions)**
- `accept-nda` - Registra aceptación y cambia estado
- `accept-share-nda` - Registra aceptación en shares y cambia estado
- `accept-workflow-nda` - Registra aceptación y cambia estado
- `accept-invite-nda` - Registra aceptación y cambia estado

**Crons con decisión**
- `recover-orphan-anchors` (decide recuperación)
- `process-polygon-anchors`, `process-bitcoin-anchors` (deciden ejecución periódica)

**Anchoring**
- `trigger_blockchain_anchoring` (trigger DB)
- `anchor-polygon` / `anchor-bitcoin` (ejecución con decisiones internas de dedupe)

---

### D) Workers / Orchestrators

Formato: `Componente` | Tipo | Autoridad | Notas

- `packages/ecosign-orchestrator/src/runner.ts` | ⚙️ | ⚙️ | Runner de jobs (decisión depende de handlers)
- `packages/ecosign-orchestrator/src/executor.ts` | ⚙️ | ⚙️ | Dispatch de handlers
- `packages/orchestrator-core/src/executor.ts` | ⚙️ | ⚙️ | Core runner/queue
- `packages/artifact-processor/src/processor.ts` | ⚙️ | ⚙️ | Procesamiento de artefactos
- `ffmpeg-orchestrator/src/processor.ts` | ⚙️ | ⚙️ | Orquestación multimedia (ver uso real)

---

### E) Funciones DB con lógica de decisión (no trigger)

Estas funciones son **puntos de autoridad** si el app las invoca:
- `advance_workflow`, `get_next_signer`, `create_workflow_version` | `supabase/migrations/20251117010000_009_signature_workflows.sql` (+ fixes 20260112)
- `append_document_entity_event` | `supabase/migrations/20260117140000_guard_document_entity_events.sql`
- `upgrade_protection_level` | `supabase/migrations/20251218150000_upgrade_protection_level_function.sql`
- `insert_workflow_signer` | `supabase/migrations/20251201190000_create_insert_signer_function.sql`
- `generate_ecox_certificate` | `supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql`

---

## Pendientes para completar

- Confirmar **qué edge functions mutan estado** vs solo ejecutan.
- Confirmar **qué triggers están activos** en DB (algunas migraciones son fixes/legacy).
- Revisar handlers del executor (`fase1-executor`) para detectar decisiones implícitas.
- Completar mapa con **SQL functions** invocadas desde app/edge.
- Marcar owners: quién “toca” cada autoridad (backend, DB, edge, worker).
