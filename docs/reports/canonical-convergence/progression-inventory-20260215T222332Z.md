# Progression Inventory Snapshot

Generated at: 2026-02-15T22:23:32Z

Purpose: list active progression engines and authority leaks (Fase 1).

## A. Triggers definidos en migraciones

```
supabase/migrations/20251208113000_document_folder_functions.sql:129:CREATE TRIGGER trg_certificate_regen_updated_at
supabase/migrations/20251124000000_015_bitcoin_pending_and_invites.sql:212:CREATE TRIGGER trigger_update_invites_updated_at
supabase/migrations/20251208110001_nda_templates_events.sql:43:CREATE TRIGGER trg_nda_templates_updated_at
supabase/migrations/20251208110000_document_folders_and_privacy.sql:36:CREATE TRIGGER trg_document_folders_updated_at
supabase/migrations/20251118120000_012_signer_links_and_events.sql:58:CREATE TRIGGER update_signer_links_updated_at
supabase/migrations/20251208100000_create_bitcoin_ots_files.sql:21:CREATE TRIGGER set_public_bitcoin_ots_files_updated_at
supabase/migrations/20251118010000_011_workflow_security_defaults.sql:42:CREATE TRIGGER trigger_validate_signer_security
supabase/migrations/20251115220000_007_user_documents.sql:76:CREATE TRIGGER update_user_documents_updated_at
supabase/migrations/20251220110000_founder_badges.sql:75:CREATE TRIGGER trigger_queue_welcome_email
supabase/migrations/20251115140000_006_fix_anchors_table.sql:92:CREATE TRIGGER anchors_updated_at
supabase/migrations/20251219160000_fix_system_emails.sql:60:CREATE TRIGGER trigger_queue_welcome_email
supabase/migrations/20251107074810_003_create_contact_leads_table.sql:84:CREATE TRIGGER update_contact_leads_updated_at
supabase/migrations/20251219000000_welcome_email_system.sql:89:CREATE TRIGGER trigger_queue_welcome_email
supabase/migrations/20251128000004_cleanup_and_optimize_notifications.sql:46:CREATE TRIGGER trg_prevent_status_regression
supabase/migrations/20251107050603_001_create_verifysign_schema.sql:201:CREATE TRIGGER update_eco_records_updated_at
supabase/migrations/001_core_schema.sql:293:CREATE TRIGGER update_documents_updated_at
supabase/migrations/001_core_schema.sql:319:CREATE TRIGGER validate_document_not_revoked
supabase/migrations/20260106130000_harden_events_canonical_invariants.sql:53:CREATE TRIGGER trg_events_append_only
supabase/migrations/20260106130000_harden_events_canonical_invariants.sql:101:CREATE TRIGGER trg_anchor_network_unique
supabase/migrations/20260118193000_hash_only_witness_hash.sql:28:CREATE TRIGGER document_entities_hash_only_witness_hash
supabase/migrations/20260110120000_create_workflow_fields.sql:109:CREATE TRIGGER trigger_workflow_fields_updated_at
supabase/migrations/20260110000000_add_draft_support.sql:131:CREATE TRIGGER trigger_cleanup_draft_on_protect
supabase/migrations/20260117140000_guard_document_entity_events.sql:87:CREATE TRIGGER trg_events_write_guard
supabase/migrations/20260106090001_document_entities_triggers.sql:2:CREATE TRIGGER update_document_entities_updated_at
supabase/migrations/20260106090001_document_entities_triggers.sql:45:CREATE TRIGGER document_entities_immutability_guard
supabase/migrations/20260106090001_document_entities_triggers.sql:79:CREATE TRIGGER document_entities_append_only_guard
supabase/migrations/20260109110000_add_draft_support.sql:42:CREATE TRIGGER enforce_draft_transition
supabase/migrations/20260105000000_auto_create_profile_trigger.sql:31:CREATE TRIGGER on_auth_user_created
supabase/migrations/20260127181058_document_entities_events_listener.sql:92:CREATE TRIGGER on_document_entity_events_change
supabase/migrations/20260127190053_safe_create_feature_flags_table.sql:73:  CREATE TRIGGER update_feature_flags_updated_at 
supabase/migrations/20260109100001_fix_operation_documents_rls.sql:35:CREATE TRIGGER trg_set_operation_document_added_by
supabase/migrations/20260116090000_executor_jobs_and_outbox.sql:38:CREATE TRIGGER executor_jobs_updated_at
supabase/migrations/20260116090000_executor_jobs_and_outbox.sql:71:CREATE TRIGGER domain_outbox_updated_at
supabase/migrations/20260127233000_document_entities_events_listener.sql:92:CREATE TRIGGER on_document_entity_events_change
supabase/migrations/20260127235800_safe_create_feature_flags_table.sql:73:  CREATE TRIGGER update_feature_flags_updated_at 
supabase/migrations/20251224170000_add_anchor_states.sql:37:CREATE TRIGGER anchor_states_updated_at
supabase/migrations/20260127185705_create_feature_flags_table.sql:58:    CREATE TRIGGER update_feature_flags_updated_at
supabase/migrations/20260109100000_create_operations.sql:93:CREATE TRIGGER trigger_operations_updated_at
supabase/migrations/20260127235500_create_feature_flags_table.sql:58:    CREATE TRIGGER update_feature_flags_updated_at
supabase/migrations/20260126200000_feature_flags_persistent_table.sql:51:CREATE TRIGGER update_feature_flags_updated_at 
supabase/migrations/20260129120000_final_feature_flags.sql:55:    CREATE TRIGGER update_feature_flags_updated_at
supabase/migrations/20260115030000_create_batches_table.sql:36:CREATE TRIGGER set_batches_updated_at
supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql:238:CREATE TRIGGER on_signature_notify_creator
supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql:120:CREATE TRIGGER on_user_documents_blockchain_anchoring
supabase/migrations/20251126000000_guest_signature_workflow_automation.sql:84:CREATE TRIGGER on_signer_created
supabase/migrations/20251126000000_guest_signature_workflow_automation.sql:181:CREATE TRIGGER on_workflow_completed
supabase/migrations/20251126000000_guest_signature_workflow_automation.sql:271:CREATE TRIGGER on_signature_completed
supabase/migrations/20260106090005_document_entities_events.sql:99:CREATE TRIGGER document_entities_events_append_only_guard
supabase/migrations/20260106090005_document_entities_events.sql:125:CREATE TRIGGER document_entities_update_tsa_latest
supabase/migrations/20260131000700_guard_active_requires_proof_events.sql:70:CREATE TRIGGER trg_user_documents_active_requires_proof
```

## B. Triggers/listeners que encolan jobs

```
supabase/migrations/20260127183712_executor_specific_job_claims.sql:11:-- FUNCIÓN: claim_initial_decision_jobs - Solo para executor
supabase/migrations/20260127183712_executor_specific_job_claims.sql:15:CREATE OR REPLACE FUNCTION public.claim_initial_decision_jobs(
supabase/migrations/20260127183712_executor_specific_job_claims.sql:132:  RAISE NOTICE '   - claim_initial_decision_jobs(): Solo para executor';
supabase/migrations/20260127235000_executor_specific_job_claims.sql:11:-- FUNCIÓN: claim_initial_decision_jobs - Solo para executor
supabase/migrations/20260127235000_executor_specific_job_claims.sql:15:CREATE OR REPLACE FUNCTION public.claim_initial_decision_jobs(
supabase/migrations/20260127235000_executor_specific_job_claims.sql:132:  RAISE NOTICE '   - claim_initial_decision_jobs(): Solo para executor';
supabase/migrations/20260215023000_requeue_protect_document_on_tsa_and_anchor_events.sql:58:    INSERT INTO executor_jobs (
supabase/migrations/20260215020000_forward_only_anchor_pipeline_hardening.sql:9:-- 1) Fix claim_orchestrator_jobs scope (execution only)
supabase/migrations/20260215020000_forward_only_anchor_pipeline_hardening.sql:11:CREATE OR REPLACE FUNCTION public.claim_orchestrator_jobs(
supabase/migrations/20260215020000_forward_only_anchor_pipeline_hardening.sql:77:COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
supabase/migrations/20260127233000_document_entities_events_listener.sql:58:    INSERT INTO executor_jobs (
supabase/migrations/20260130172500_fix_orchestrator_claim_status.sql:6:-- - claim_orchestrator_jobs() was setting status='processing', causing the claim UPDATE to fail.
supabase/migrations/20260130172500_fix_orchestrator_claim_status.sql:13:CREATE OR REPLACE FUNCTION public.claim_orchestrator_jobs(
supabase/migrations/20260130172500_fix_orchestrator_claim_status.sql:49:COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
supabase/migrations/20260129130001_switch_to_orchestrator_only.sql:76:    RAISE NOTICE '   • Usa claim_orchestrator_jobs con locking correcto';
supabase/migrations/20260129130000_orchestrator_claim_function.sql:8:CREATE OR REPLACE FUNCTION public.claim_orchestrator_jobs(
supabase/migrations/20260129130000_orchestrator_claim_function.sql:47:GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO postgres;
supabase/migrations/20260129130000_orchestrator_claim_function.sql:48:GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO anon;
supabase/migrations/20260129130000_orchestrator_claim_function.sql:49:GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO authenticated;
supabase/migrations/20260129130000_orchestrator_claim_function.sql:50:GRANT EXECUTE ON FUNCTION public.claim_orchestrator_jobs(integer, text) TO service_role;
supabase/migrations/20260129130000_orchestrator_claim_function.sql:53:COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
supabase/migrations/20260129130000_orchestrator_claim_function.sql:59:  RAISE NOTICE '✅ Función claim_orchestrator_jobs creada exitosamente';
supabase/migrations/20260129120200_final_executor_job_claims.sql:8:-- FUNCIÓN: claim_initial_decision_jobs - Executor (fase1-executor)
supabase/migrations/20260129120200_final_executor_job_claims.sql:10:CREATE OR REPLACE FUNCTION public.claim_initial_decision_jobs(
supabase/migrations/20260129120200_final_executor_job_claims.sql:121:  RAISE NOTICE '   - claim_initial_decision_jobs(): Executor';
supabase/migrations/20260129150000_fix_trigger_memory_leak.sql:37:      INSERT INTO executor_jobs (
supabase/migrations/20260129150000_fix_trigger_memory_leak.sql:63:      INSERT INTO executor_jobs (
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:8:-- ACTUALIZAR claim_initial_decision_jobs
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:11:CREATE OR REPLACE FUNCTION public.claim_initial_decision_jobs(
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:44:COMMENT ON FUNCTION public.claim_initial_decision_jobs(integer, text) IS
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:48:-- ACTUALIZAR claim_orchestrator_jobs
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:51:CREATE OR REPLACE FUNCTION public.claim_orchestrator_jobs(
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:87:COMMENT ON FUNCTION public.claim_orchestrator_jobs(integer, text) IS
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:97:  RAISE NOTICE '📋 claim_initial_decision_jobs:';
supabase/migrations/20260129140001_separate_claim_responsibilities.sql:101:  RAISE NOTICE '🔨 claim_orchestrator_jobs:';
supabase/migrations/20260129140000_enable_both_executors.sql:67:  RAISE NOTICE '   → Usa: claim_initial_decision_jobs()';
supabase/migrations/20260129140000_enable_both_executors.sql:73:  RAISE NOTICE '   → Usa: claim_orchestrator_jobs()';
supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql:21:-- Update claim_orchestrator_jobs to return new fields
supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql:23:DROP FUNCTION IF EXISTS public.claim_orchestrator_jobs(integer, text);
supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql:25:CREATE FUNCTION public.claim_orchestrator_jobs(
supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql:88:-- Similarly update claim_initial_decision_jobs (used by fase1-executor)
supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql:89:DROP FUNCTION IF EXISTS public.claim_initial_decision_jobs(integer, text);
supabase/migrations/20260131180000_add_correlation_trace_ids_to_executor_jobs.sql:91:CREATE FUNCTION public.claim_initial_decision_jobs(
supabase/migrations/20260131170000_fase1_canonical_close_no_legacy_protection_enabled.sql:153:      INSERT INTO executor_jobs (
supabase/functions/fase1-executor/index.ts:746:  const { data: jobs, error: claimError } = await supabase.rpc('claim_initial_decision_jobs', {
supabase/migrations/20260127181058_document_entities_events_listener.sql:58:    INSERT INTO executor_jobs (
supabase/functions/orchestrator/index.ts:348:    // NOTA: El job ya fue reclamado por claim_orchestrator_jobs
supabase/functions/orchestrator/index.ts:462:    // Usar claim_orchestrator_jobs para reclamar jobs de forma atómica
supabase/functions/orchestrator/index.ts:464:    const { data: jobs, error } = await supabase.rpc('claim_orchestrator_jobs', {
```

## C. Feature flags que afectan ejecucion

```
supabase/functions/_shared/flagSync.ts:20:    { envVar: 'ENABLE_D1_CANONICAL', flagName: 'D1_RUN_TSA_ENABLED' },
supabase/functions/_shared/flagSync.ts:21:    { envVar: 'ENABLE_D3_CANONICAL', flagName: 'D3_BUILD_ARTIFACT_ENABLED' },
supabase/functions/_shared/flagSync.ts:22:    { envVar: 'ENABLE_D4_CANONICAL', flagName: 'D4_ANCHORS_ENABLED' },
supabase/functions/_shared/flagSync.ts:23:    { envVar: 'ENABLE_D5_CANONICAL', flagName: 'D5_NOTIFICATIONS_ENABLED' },
supabase/functions/_shared/featureFlags.ts:21:  D1_RUN_TSA_ENABLED: "ENABLE_D1_CANONICAL",
supabase/functions/_shared/featureFlags.ts:29:  D3_BUILD_ARTIFACT_ENABLED: "ENABLE_D3_CANONICAL",
supabase/functions/_shared/featureFlags.ts:37:  D4_ANCHORS_ENABLED: "ENABLE_D4_CANONICAL",
supabase/functions/_shared/featureFlags.ts:45:  D5_NOTIFICATIONS_ENABLED: "ENABLE_D5_CANONICAL",
supabase/functions/_shared/featureFlags.ts:62:export function isDecisionUnderCanonicalAuthority(decisionId: keyof typeof CANONICAL_AUTHORITY_FLAGS): boolean {
supabase/functions/_shared/featureFlags.ts:75:  return !isDecisionUnderCanonicalAuthority(decisionId);
supabase/functions/feature-flags-status/index.ts:51:        'D1_RUN_TSA_ENABLED',
supabase/functions/feature-flags-status/index.ts:52:        'D3_BUILD_ARTIFACT_ENABLED', 
supabase/functions/feature-flags-status/index.ts:53:        'D4_ANCHORS_ENABLED',
supabase/functions/feature-flags-status/index.ts:54:        'D5_NOTIFICATIONS_ENABLED'
supabase/functions/feature-flags-status/index.ts:73:      'D1_RUN_TSA_ENABLED': Deno.env.get('ENABLE_D1_CANONICAL') === 'true',
supabase/functions/feature-flags-status/index.ts:74:      'D3_BUILD_ARTIFACT_ENABLED': Deno.env.get('ENABLE_D3_CANONICAL') === 'true',
supabase/functions/feature-flags-status/index.ts:75:      'D4_ANCHORS_ENABLED': Deno.env.get('ENABLE_D4_CANONICAL') === 'true',
supabase/functions/feature-flags-status/index.ts:76:      'D5_NOTIFICATIONS_ENABLED': Deno.env.get('ENABLE_D5_CANONICAL') === 'true',
supabase/functions/set-feature-flag/index.ts:21:  'D1_RUN_TSA_ENABLED',
supabase/functions/set-feature-flag/index.ts:22:  'D3_BUILD_ARTIFACT_ENABLED', 
supabase/functions/set-feature-flag/index.ts:23:  'D4_ANCHORS_ENABLED',
supabase/functions/set-feature-flag/index.ts:24:  'D5_NOTIFICATIONS_ENABLED'
supabase/functions/set-feature-flag/index.ts:102:      'D1_RUN_TSA_ENABLED': 'ENABLE_D1_CANONICAL',
supabase/functions/set-feature-flag/index.ts:103:      'D3_BUILD_ARTIFACT_ENABLED': 'ENABLE_D3_CANONICAL', 
supabase/functions/set-feature-flag/index.ts:104:      'D4_ANCHORS_ENABLED': 'ENABLE_D4_CANONICAL',
supabase/functions/set-feature-flag/index.ts:105:      'D5_NOTIFICATIONS_ENABLED': 'ENABLE_D5_CANONICAL'
supabase/functions/fase1-executor/index.ts:12:import { isDecisionUnderCanonicalAuthority } from '../_shared/featureFlags.ts';
supabase/functions/fase1-executor/index.ts:13:import { syncFlagsToDatabase } from '../_shared/flagSync.ts';
supabase/functions/fase1-executor/index.ts:309:  const isD1Canonical = isDecisionUnderCanonicalAuthority('D1_RUN_TSA_ENABLED');
supabase/functions/fase1-executor/index.ts:398:  const isD4Canonical = isDecisionUnderCanonicalAuthority('D4_ANCHORS_ENABLED');
supabase/functions/fase1-executor/index.ts:519:  const isD3Canonical = isDecisionUnderCanonicalAuthority('D3_BUILD_ARTIFACT_ENABLED');
```

## D. Requeue/retry/timeout en runtime

```
supabase/functions/fase1-executor/index.ts:92:  const deadline = Date.now() + POLYGON_CONFIRM_TIMEOUT_MS;
supabase/functions/fase1-executor/index.ts:93:  while (Date.now() < deadline) {
supabase/functions/fase1-executor/index.ts:611:      .in('status', ['failed', 'retry_scheduled', 'dead']);
supabase/functions/fase1-executor/index.ts:614:      console.log(`[fase1-executor] Failed to requeue ${type} for ${documentEntityId}: ${updateError.message}`);
supabase/functions/fase1-executor/index.ts:619:async function requeueMissingTsaJobs(
supabase/functions/fase1-executor/index.ts:629:    console.error('[fase1-executor] Error fetching TSA requeue candidates:', error.message);
supabase/functions/fase1-executor/index.ts:648:      entityId  // NUEVO: correlation_id = entity_id for requeued jobs
supabase/functions/fase1-executor/index.ts:740:    await requeueMissingTsaJobs(supabase);
supabase/functions/fase1-executor/index.ts:746:  const { data: jobs, error: claimError } = await supabase.rpc('claim_initial_decision_jobs', {
supabase/functions/orchestrator/index.ts:241:  const timeout = setTimeout(() => controller.abort(), 30_000);
supabase/functions/orchestrator/index.ts:265:    clearTimeout(timeout);
supabase/functions/orchestrator/index.ts:348:    // NOTA: El job ya fue reclamado por claim_orchestrator_jobs
supabase/functions/orchestrator/index.ts:436:      status: shouldDeadLetter ? 'dead' : 'retry_scheduled',
supabase/functions/orchestrator/index.ts:446:    // Marcar job como retry_scheduled o dead (para permitir reintentos reales)
supabase/functions/orchestrator/index.ts:462:    // Usar claim_orchestrator_jobs para reclamar jobs de forma atómica
supabase/functions/orchestrator/index.ts:464:    const { data: jobs, error } = await supabase.rpc('claim_orchestrator_jobs', {
```

## E. Paths legacy vivos (functions + cron)

```
supabase/functions/_legacy/process-polygon-anchors/index.ts
supabase/functions/_legacy/process-polygon-anchors/cron.sql
supabase/functions/_legacy/process-bitcoin-anchors/index.ts
supabase/functions/_legacy/process-bitcoin-anchors/cron.sql
supabase/functions/_legacy/process-bitcoin-anchors/README.md
supabase/functions/_legacy/anchor-polygon/index.ts
supabase/functions/_legacy/anchor-bitcoin/index.ts
supabase/functions/_legacy/README.md
supabase/functions/wake-authority/config.toml
supabase/functions/wake-authority/index.ts
supabase/functions/process-polygon-anchors/index.ts
supabase/functions/process-polygon-anchors/cron.sql
supabase/functions/process-bitcoin-anchors/index.ts
supabase/functions/process-bitcoin-anchors/cron.sql
supabase/functions/process-bitcoin-anchors/README.md
supabase/functions/_legacy/README.md
supabase/functions/_legacy/process-polygon-anchors/index.ts
supabase/functions/_legacy/process-polygon-anchors/cron.sql
supabase/functions/_legacy/anchor-polygon/index.ts
supabase/functions/_legacy/anchor-bitcoin/index.ts
supabase/functions/_legacy/process-bitcoin-anchors/index.ts
supabase/functions/_legacy/process-bitcoin-anchors/cron.sql
supabase/functions/_legacy/process-bitcoin-anchors/README.md
```

## F. Posibles decisiones fuera del decision engine

```
supabase/functions/request-document-changes/index.ts:307:          <p>Por favor revisa los cambios y decide:</p>
supabase/functions/process-signature/index.ts:382:    // Canonical authority is protectDocumentV2PipelineDecision + executor/orchestrator.
supabase/functions/signer-access/index.ts:423:    // Fetch prior signatures (for rendering a derived/stamped viewing PDF)
supabase/functions/signer-access/index.ts:424:    // Canon: evidence lives in events + instances; UI may derive a visual preview.
supabase/functions/dead-jobs/index.ts:70:function deriveReason(job: DeadJob): 'ttl_exceeded' | 'max_attempts_exceeded' | 'handler_error' | 'precondition_failed' {
supabase/functions/dead-jobs/index.ts:140:    // Build query - derive dead condition instead of relying on status='dead'
supabase/functions/dead-jobs/index.ts:178:      const reason = deriveReason(job);
supabase/functions/apply-signer-signature/index.ts:12:import { decideAnchorPolicyByStage, resolveOwnerAnchorPlan } from '../_shared/anchorPlanPolicy.ts'
supabase/functions/apply-signer-signature/index.ts:1523:      const finalAnchorPolicy = decideAnchorPolicyByStage({
supabase/functions/process-polygon-anchors/index.ts:511:        // UI already derives correctly via deriveProtectionLevel(events)
supabase/functions/process-bitcoin-anchors/index.ts:856:              // UI already derives correctly via deriveProtectionLevel(events)
supabase/functions/process-bitcoin-anchors/index.ts:1032:          // UI already derives correctly via deriveProtectionLevel(events)
supabase/functions/record-protection-event/index.ts:17:import { decideAnchorPolicyByStage, resolveOwnerAnchorPlan } from '../_shared/anchorPlanPolicy.ts'
supabase/functions/record-protection-event/index.ts:136:    const anchorPolicy = decideAnchorPolicyByStage({
supabase/functions/_shared/anchorPlanPolicy.ts:68:export function decideAnchorPolicyByStage(params: {
supabase/functions/orchestrator/index.ts:9: * NUNCA decide reglas de negocio - eso es autoridad
supabase/functions/_legacy/process-polygon-anchors/index.ts:436:        // UI already derives correctly via deriveProtectionLevel(events)
supabase/functions/fase1-executor/index.ts:155:    await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:208:      await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:242:      await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:263:    await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:312:    : decideProtectDocumentV2(events);               // Usar lógica legacy
supabase/functions/fase1-executor/index.ts:315:  const currentShouldEnqueue = !isD1Canonical && decideProtectDocumentV2(events) === 'run_tsa';
supabase/functions/fase1-executor/index.ts:320:      currentDecision: !isD1Canonical ? decideProtectDocumentV2(events) : 'canonical_used',
supabase/functions/fase1-executor/index.ts:440:    await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:500:    await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:556:    await enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:568:async function enqueueExecutorJob(
supabase/functions/fase1-executor/index.ts:641:    await enqueueExecutorJob(
supabase/functions/_shared/decisionLogger.ts:14:  decision: string[]; // Array of job types decided
supabase/functions/_shared/email.ts:14:function deriveSiteUrlFromLink(link?: string | null) {
supabase/functions/_shared/email.ts:104:  const resolvedSiteUrl = normalizeSiteUrl(siteUrl ?? deriveSiteUrlFromLink(signLink));
supabase/functions/_shared/email.ts:209:  const resolvedSiteUrl = normalizeSiteUrl(siteUrl ?? deriveSiteUrlFromLink(downloadUrl));
supabase/functions/_shared/signatureCapture.ts:10: * - Viewer derives visual from events + witness
supabase/functions/_shared/featureFlags.ts:18:   * Controla si el executor canónico decide sobre la ejecución de TSA
supabase/functions/_shared/featureFlags.ts:26:   * Controla si el executor canónico decide sobre la construcción del artifact
supabase/functions/_shared/featureFlags.ts:34:   * Controla si el executor canónico decide sobre los anclajes
supabase/functions/_shared/featureFlags.ts:42:   * Controla si el executor canónico decide sobre las notificaciones
supabase/functions/_shared/canonicalModelControl.ts:212:    const lifecycleStatus = this.deriveLifecycleStatus(events);
supabase/functions/_shared/canonicalModelControl.ts:246:  private static deriveLifecycleStatus(events: any[]): string {
supabase/functions/_shared/domainAdapters.ts:39:  let derivedStatus: string = 'created';
supabase/functions/_shared/domainAdapters.ts:40:  if (hasTsa && !hasPolygon && !hasBitcoin) derivedStatus = 'protected';
supabase/functions/_shared/domainAdapters.ts:41:  if (hasTsa && (hasPolygon || hasBitcoin)) derivedStatus = 'anchored';
supabase/functions/_shared/domainAdapters.ts:42:  if (hasTsa && hasPolygon && hasBitcoin && hasArtifact) derivedStatus = 'completed';
supabase/functions/_shared/domainAdapters.ts:43:  if (hasTsa && hasPolygon && hasBitcoin && !hasArtifact) derivedStatus = 'ready_for_artifact';
supabase/functions/_shared/domainAdapters.ts:52:    status: derivedStatus,
supabase/functions/_shared/domainAdapters.ts:83:    protection_status: deriveProtectionStatus(events),
supabase/functions/_shared/domainAdapters.ts:84:    anchor_status: deriveAnchorStatus(events),
supabase/functions/_shared/domainAdapters.ts:197:    protection_status: deriveProtectionStatus(events),
supabase/functions/_shared/domainAdapters.ts:198:    anchor_status: deriveAnchorStatus(events),
supabase/functions/_shared/domainAdapters.ts:206:function deriveProtectionStatus(events: any[]): string {
supabase/functions/_shared/domainAdapters.ts:222:function deriveAnchorStatus(events: any[]): AnchorStatus {
supabase/functions/_shared/test-d2-protected-state.ts:69:  console.log('   UI actual: deriveProtectionLevel(events) !== "NONE"');
supabase/functions/_shared/anchorHelper.ts:208:export function deriveProtectionLevel(events: any[]): string {
supabase/functions/_shared/test-shadow-decision.ts:15:const current1 = decideProtectDocumentV2(test1);
supabase/functions/_shared/test-shadow-decision.ts:24:const current2 = decideProtectDocumentV2(test2);
supabase/functions/_shared/test-shadow-decision.ts:36:const current3 = decideProtectDocumentV2(test3);
supabase/functions/_legacy/README.md:83:4. **Complex resolution** - Witness hash derived from multiple sources
supabase/functions/_legacy/README.md:90:4. ✅ **Simple resolution:** Trigger derives canonical witness_hash
supabase/functions/_legacy/README.md:115:witness_hash (derived, cached)
supabase/functions/_legacy/process-bitcoin-anchors/index.ts:770:              // UI already derives correctly via deriveProtectionLevel(events)
supabase/functions/_legacy/process-bitcoin-anchors/index.ts:947:          // UI already derives correctly via deriveProtectionLevel(events)
```

## Resumen automatico

Este reporte no infiere semantica completa: muestra candidatos de autoridad/progresion para inspeccion.

Uso recomendado:
1. Revisar secciones B, C, D, F.
2. Clasificar cada hallazgo como: `canonical`, `operational`, `legacy`.
3. Abrir ticket por cada item no canonical que altere progresion.
