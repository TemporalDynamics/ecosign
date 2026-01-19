# Clasificacion de migraciones (local)

Objetivo: separar CORE vs INFRA vs LEGACY vs AMBIGUO, sin ejecutar cambios, solo leer.
Esta clasificacion es inicial; si un archivo no aparece en CORE/INFRA/LEGACY/AMBIGUO
queda en REVISION.

## CORE (canonico, no se toca)
- `supabase/migrations/001_core_schema.sql`
- `supabase/migrations/20260106090000_document_entities.sql`
- `supabase/migrations/20260106090001_document_entities_triggers.sql`
- `supabase/migrations/20260106090002_document_entities_rls.sql`
- `supabase/migrations/20260106090004_document_entities_signed_authority.sql`
- `supabase/migrations/20260106090005_document_entities_events.sql`
- `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`
- `supabase/migrations/20260106140000_validate_anchor_witness_hash.sql`
- `supabase/migrations/20260106160000_detect_missing_anchor_events.sql`
- `supabase/migrations/20260109100000_create_operations.sql`
- `supabase/migrations/20260109100001_fix_operation_documents_rls.sql`
- `supabase/migrations/20260109110000_add_draft_support.sql`
- `supabase/migrations/20260109130000_create_operations_events.sql`
- `supabase/migrations/20260110000000_add_draft_support.sql`
- `supabase/migrations/20260110120000_create_workflow_fields.sql`
- `supabase/migrations/20260112165000_create_workflow_events.sql`
- `supabase/migrations/20260112173000_update_workflow_events_types.sql`
- `supabase/migrations/20260115120000_create_append_event_sql_function.sql`
- `supabase/migrations/20260115121000_allow_source_storage_path_in_hash_only.sql`
- `supabase/migrations/20260117140000_guard_document_entity_events.sql`
- `supabase/migrations/20260118193000_hash_only_witness_hash.sql`
- `supabase/migrations/20260118193500_backfill_hash_only_witness_hash.sql`
- `supabase/migrations/20260115030000_create_batches_table.sql`
- `supabase/migrations/20260115030100_add_batch_id_to_fields.sql`
- `supabase/migrations/20260115030200_backfill_batches.sql`
- `supabase/migrations/20260115030300_enforce_batch_id_not_null.sql`

## INFRA (manual/operativo, no deberia bloquear db push)
- `supabase/migrations/20250117000000_create_rate_limits_table.sql`
- `supabase/migrations/20251115090000_005_rate_limiting.sql`
- `supabase/migrations/20251127100000_create_documents_storage_bucket.sql`
- `supabase/migrations/20251127110000_fix_storage_rls_policies.sql`
- `supabase/migrations/20251218130000_fix_storage_service_role.sql`
- `supabase/migrations/20260106090003_storage_signed_rls.sql`
- `supabase/migrations/20260110100000_create_custody_storage_bucket.sql`
- `supabase/migrations/20251221100002_orphan_recovery_cron.sql`
- `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`
- `supabase/migrations/20260111060100_fix_cron_jobs.sql`
- `supabase/migrations/20260118060000_fix_anchor_cron_auth.sql`
- `supabase/migrations/20260118070000_add_fase1_executor_cron.sql`
- `supabase/migrations/20260118143500_disable_legacy_crons_and_triggers.sql`
- `supabase/migrations/20251128000001_ensure_uuid_extension.sql`
- `supabase/migrations/20260116090000_executor_jobs_and_outbox.sql`
- `supabase/migrations/20260116091000_executor_job_runs.sql`
- `supabase/migrations/20260117160000_create_workspace_plan_tables.sql`
- `supabase/migrations/20260117170000_adjust_workspace_plan_tables.sql`
- `supabase/migrations/20260117180000_seed_plans_catalog.sql`
- `supabase/migrations/20260117190000_compute_workspace_effective_limits.sql`
- `supabase/migrations/20260117200000_backfill_workspaces_and_plans.sql`
- `supabase/migrations/20260117201000_backfill_workspace_plan_only.sql`
- `supabase/migrations/20260118050000_fix_orphan_recovery_auth.sql`

## LEGACY (congelado)
- `supabase/migrations/20251107050603_001_create_verifysign_schema.sql`
- `supabase/migrations/20251107060520_002_create_analytics_table.sql`
- `supabase/migrations/20251107074810_003_create_contact_leads_table.sql`
- `supabase/migrations/20251114223000_004_apply_rls_policies.sql`
- `supabase/migrations/20251115140000_006_fix_anchors_table.sql`
- `supabase/migrations/20251115220000_007_user_documents.sql`
- `supabase/migrations/20251117000000_008_fix_link_recipient_attribution.sql`
- `supabase/migrations/20251117010000_009_signature_workflows.sql`
- `supabase/migrations/20251118000000_010_add_missing_columns.sql`
- `supabase/migrations/20251118010000_011_workflow_security_defaults.sql`
- `supabase/migrations/20251118120000_012_signer_links_and_events.sql`
- `supabase/migrations/20251121000000_013_add_document_tracking_columns.sql`
- `supabase/migrations/20251124000000_015_bitcoin_pending_and_invites.sql`
- `supabase/migrations/20251124000001_secure_events_rls.sql`
- `supabase/migrations/20251124000002_add_missing_document_fields.sql`
- `supabase/migrations/20251124010000_016_add_user_document_to_anchors.sql`
- `supabase/migrations/20251125120100_consolidate_rls_policies.sql`
- `supabase/migrations/20251125120200_consolidate_recipients_rls.sql`
- `supabase/migrations/20251125120300_fix_conflicting_rls.sql`
- `supabase/migrations/20251125120500_refactor_rls_policies.sql`
- `supabase/migrations/20251126000000_guest_signature_workflow_automation.sql`
- `supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql`
- `supabase/migrations/20251127120000_fix_owner_read_permissions.sql`
- `supabase/migrations/20251127130000_allow_signer_workflow_updates.sql`
- `supabase/migrations/20251127140000_restrict_signer_updates_to_active.sql`
- `supabase/migrations/20251128000002_add_retry_count.sql`
- `supabase/migrations/20251128000003_alter_notification_type_constraint.sql`
- `supabase/migrations/20251128000004_cleanup_and_optimize_notifications.sql`
- `supabase/migrations/20251129000001_fix_rls_infinite_recursion.sql`
- `supabase/migrations/20251130000000_fix_notification_types.sql`
- `supabase/migrations/20251201090000_update_notify_signer_link_template.sql`
- `supabase/migrations/20251201120000_add_signature_type_and_nda_flags.sql`
- `supabase/migrations/20251201130000_update_notify_signer_link_template_v2.sql`
- `supabase/migrations/20251201140000_update_notify_signature_completed_templates.sql`
- `supabase/migrations/20251201150000_update_notify_link_expired_and_resend.sql`
- `supabase/migrations/20251201160000_add_signnow_columns.sql`
- `supabase/migrations/20251201170000_fix_notifications_insert_policy.sql`
- `supabase/migrations/20251201180000_remove_display_name_if_exists.sql`
- `supabase/migrations/20251201190000_create_insert_signer_function.sql`
- `supabase/migrations/20251201200000_force_remove_display_name.sql`
- `supabase/migrations/20251201210000_fix_display_name_scope.sql`
- `supabase/migrations/20251202100000_add_polygon_fields_and_notifications.sql`
- `supabase/migrations/20251202110000_add_bitcoin_attempts.sql`
- `supabase/migrations/20251202120000_add_audit_logs.sql`
- `supabase/migrations/20251203160000_signnow_embed_timestamp.sql`
- `supabase/migrations/20251208090000_anchor_atomic_tx.sql`
- `supabase/migrations/20251208090100_anchor_atomic_tx_grants.sql`
- `supabase/migrations/20251208100000_create_bitcoin_ots_files.sql`
- `supabase/migrations/20251208110000_document_folders_and_privacy.sql`
- `supabase/migrations/20251208110001_nda_templates_events.sql`
- `supabase/migrations/20251208113000_document_folder_functions.sql`
- `supabase/migrations/20251209000000_add_unique_constraint_anchors.sql`
- `supabase/migrations/20251213000000_polygon_atomic_tx.sql`
- `supabase/migrations/20251213000100_polygon_atomic_tx_comment.sql`
- `supabase/migrations/20251213000110_polygon_atomic_tx_grant.sql`
- `supabase/migrations/20251214100000_signer_receipts_otp.sql`
- `supabase/migrations/20251218120000_fix_anchors_service_role_insert.sql`
- `supabase/migrations/20251218120001_fix_anchors_service_role_select.sql`
- `supabase/migrations/20251218120002_fix_service_role_full_access.sql`
- `supabase/migrations/20251218140000_add_protection_level_and_polygon_status.sql`
- `supabase/migrations/20251218150000_upgrade_protection_level_function.sql`
- `supabase/migrations/20251219000000_welcome_email_system.sql`
- `supabase/migrations/20251219010000_add_service_role_policy_documents.sql`
- `supabase/migrations/20251219160000_fix_system_emails.sql`
- `supabase/migrations/20251220110000_founder_badges.sql`
- `supabase/migrations/20251221044721_create_product_events.sql`
- `supabase/migrations/20251221090000_add_nda_text_to_links.sql`
- `supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql`
- `supabase/migrations/20251224160000_fix_rls_completeness.sql`
- `supabase/migrations/20251224170000_add_anchor_states.sql`
- `supabase/migrations/20260105000000_auto_create_profile_trigger.sql`
- `supabase/migrations/20260106090006_migrate_legacy_tsa.sql`
- `supabase/migrations/20260106120000_update_blockchain_trigger_witness_hash.sql`
- `supabase/migrations/20260106150000_deprecate_upgrade_protection_level.sql`
- `supabase/migrations/20260106155000_add_user_documents_entity_link.sql`
- `supabase/migrations/20260109090000_add_document_entity_id_to_signature_workflows.sql`
- `supabase/migrations/20260111050700_fix_anchors_policy.sql`
- `supabase/migrations/20260111061521_add_anchor_observable_event_types.sql`
- `supabase/migrations/20260111065455_rls_authenticated_users.sql`
- `supabase/migrations/20260112130000_workflow_states_v2.sql`
- `supabase/migrations/20260112143000_update_notify_signer_link_statuses.sql`
- `supabase/migrations/20260112152000_fix_workflow_states_migration_order.sql`
- `supabase/migrations/20260113015223_add_signature_data_to_signers.sql`
- `supabase/migrations/20260113053000_extend_workflow_notification_types.sql`
- `supabase/migrations/20260114000000_fix_notification_constraint.sql`
- `supabase/migrations/20260114081820_create_view_v_p0.sql`
- `supabase/migrations/20260115100000_add_notification_step_and_unique_constraint.sql`
- `supabase/migrations/20260115110000_add_delivery_mode_to_workflows.sql`
- `supabase/migrations/20260115130000_add_token_lifecycle_to_signers.sql`
- `supabase/migrations/20260115140000_create_workflow_artifacts.sql`
- `supabase/migrations/20260115150000_create_signature_instances.sql`
- `supabase/migrations/20260115150100_create_signature_application_events.sql`
- `supabase/migrations/20260115193518_add_artifact_ready_notification_type.sql`
- `supabase/migrations/20260116120000_fix_blockchain_trigger_no_app_settings.sql`
- `supabase/migrations/20260117150000_create_v_incomplete_documents.sql`
- `supabase/migrations/20260117210000_fix_blockchain_trigger_auth.sql`
- `supabase/migrations/20260117211000_remove_user_email_from_trigger.sql`
- `supabase/migrations/20251222130000_e2e_profiles.sql`
- `supabase/migrations/20251222130001_e2e_documents.sql`
- `supabase/migrations/20251222130002_e2e_document_shares.sql`
- `supabase/migrations/20251222140000_add_e2e_to_user_documents.sql`
- `supabase/migrations/20251222140001_fix_document_shares_fk.sql`
- `supabase/migrations/20251224000000_fix_profiles_rls_upsert.sql`
- `supabase/migrations/20251224010000_fix_document_shares_rls.sql`
- `supabase/migrations/20251224010001_fix_document_shares_fk.sql`
- `supabase/migrations/20251224120000_add_nda_to_shares.sql`
- `supabase/migrations/20251224150000_fix_rls_delete_policy.sql`

## AMBIGUO (mezcla infra + legacy, revisar luego)
- `supabase/migrations/20251124120000_security_rls_cleanup.sql`
- `supabase/migrations/20251125120000_fix_security_performance_issues.sql`
- `supabase/migrations/20251127110000_fix_storage_rls_policies.sql`
- `supabase/migrations/20251129000002_fix_storage_rls_recursion.sql`
- `supabase/migrations/20260111043858_security_rls_hardening.sql`

## REVISION (pendiente de clasificar)
Todo archivo no listado arriba queda en REVISION hasta que se confirme su rol.

## Apndice A - Lote 1 (10 migraciones revisadas)
- `supabase/migrations/20251107050603_001_create_verifysign_schema.sql` -> LEGACY (eco_records/access_logs/nda_signatures).
- `supabase/migrations/20251107060520_002_create_analytics_table.sql` -> LEGACY (conversion_events/analytics_summary).
- `supabase/migrations/20251107074810_003_create_contact_leads_table.sql` -> LEGACY (contact_leads).
- `supabase/migrations/20251114223000_004_apply_rls_policies.sql` -> LEGACY (RLS sobre tables legacy).
- `supabase/migrations/20251115090000_005_rate_limiting.sql` -> INFRA (rate_limits + cron cleanup).
- `supabase/migrations/20251115140000_006_fix_anchors_table.sql` -> LEGACY (anchors legacy).
- `supabase/migrations/20251115220000_007_user_documents.sql` -> LEGACY (user_documents + bucket legacy).
- `supabase/migrations/20251117000000_008_fix_link_recipient_attribution.sql` -> LEGACY (links/recipients legacy).
- `supabase/migrations/20251117010000_009_signature_workflows.sql` -> LEGACY (workflow tables legacy).
- `supabase/migrations/20251118000000_010_add_missing_columns.sql` -> LEGACY (documents legacy).

## Apndice B - Lote 2 (10 migraciones revisadas)
- `supabase/migrations/20251118010000_011_workflow_security_defaults.sql` -> LEGACY (workflow_signers/signatures legacy).
- `supabase/migrations/20251118120000_012_signer_links_and_events.sql` -> LEGACY (signer_links + events legacy).
- `supabase/migrations/20251121000000_013_add_document_tracking_columns.sql` -> LEGACY (user_documents legacy).
- `supabase/migrations/20251124000000_015_bitcoin_pending_and_invites.sql` -> LEGACY (user_documents + invites legacy).
- `supabase/migrations/20251124000001_secure_events_rls.sql` -> LEGACY (events legacy).
- `supabase/migrations/20251124000002_add_missing_document_fields.sql` -> LEGACY (user_documents legacy).
- `supabase/migrations/20251124010000_016_add_user_document_to_anchors.sql` -> LEGACY (anchors legacy).
- `supabase/migrations/20251124120000_security_rls_cleanup.sql` -> AMBIGUO (mezcla rate_limit_blocks + legacy RLS).
- `supabase/migrations/20251124130000_fix_rls_on_rate_limit_blocks.sql` -> INFRA (rate_limit_blocks).
- `supabase/migrations/20251125120000_fix_security_performance_issues.sql` -> AMBIGUO (seguridad/perf sobre legacy).

## Apndice C - Lote 3 (10 migraciones revisadas)
- `supabase/migrations/20251125120100_consolidate_rls_policies.sql` -> LEGACY (invites legacy RLS).
- `supabase/migrations/20251125120200_consolidate_recipients_rls.sql` -> LEGACY (recipients legacy RLS).
- `supabase/migrations/20251125120300_fix_conflicting_rls.sql` -> LEGACY (events/anchors legacy RLS).
- `supabase/migrations/20251125120500_refactor_rls_policies.sql` -> LEGACY (events/signature_workflows legacy RLS).
- `supabase/migrations/20251126000000_guest_signature_workflow_automation.sql` -> LEGACY (workflow notifications legacy).
- `supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notifications.sql` -> LEGACY (ecox_audit_trail legacy).
- `supabase/migrations/20251127100000_create_documents_storage_bucket.sql` -> INFRA (storage bucket).
- `supabase/migrations/20251127110000_fix_storage_rls_policies.sql` -> AMBIGUO (storage + workflow legacy).
- `supabase/migrations/20251127120000_fix_owner_read_permissions.sql` -> LEGACY (storage RLS for legacy workflows).
- `supabase/migrations/20251127130000_allow_signer_workflow_updates.sql` -> LEGACY (legacy workflow policy).

## Apndice D - Lote 4 (10 migraciones revisadas)
- `supabase/migrations/20251127140000_restrict_signer_updates_to_active.sql` -> LEGACY (workflow policy).
- `supabase/migrations/20251128000001_ensure_uuid_extension.sql` -> INFRA (extensions).
- `supabase/migrations/20251128000002_add_retry_count.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20251128000003_alter_notification_type_constraint.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20251128000004_cleanup_and_optimize_notifications.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20251129000001_fix_rls_infinite_recursion.sql` -> LEGACY (signature_workflows RLS).
- `supabase/migrations/20251129000002_fix_storage_rls_recursion.sql` -> AMBIGUO (storage RLS on legacy buckets).
- `supabase/migrations/20251129000003_temp_disable_rls_for_debug.sql` -> LEGACY (debug stub).
- `supabase/migrations/20251130000000_fix_notification_types.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20251201090000_update_notify_signer_link_template.sql` -> LEGACY (workflow_notifications template).

## Apndice E - Lote 5 (10 migraciones revisadas)
- `supabase/migrations/20251201120000_add_signature_type_and_nda_flags.sql` -> LEGACY (workflow fields).
- `supabase/migrations/20251201130000_update_notify_signer_link_template_v2.sql` -> LEGACY (workflow notification template).
- `supabase/migrations/20251201140000_update_notify_signature_completed_templates.sql` -> LEGACY (workflow notifications).
- `supabase/migrations/20251201150000_update_notify_link_expired_and_resend.sql` -> LEGACY (workflow notifications).
- `supabase/migrations/20251201160000_add_signnow_columns.sql` -> LEGACY (workflow signnow).
- `supabase/migrations/20251201170000_fix_notifications_insert_policy.sql` -> LEGACY (workflow_notifications policy).
- `supabase/migrations/20251201180000_remove_display_name_if_exists.sql` -> LEGACY (workflow_signers cleanup).
- `supabase/migrations/20251201190000_create_insert_signer_function.sql` -> LEGACY (workflow_signers helper).
- `supabase/migrations/20251201200000_force_remove_display_name.sql` -> LEGACY (workflow_signers cleanup).
- `supabase/migrations/20251201210000_fix_display_name_scope.sql` -> LEGACY (notify_signer_link fix).

## Apndice F - Lote 6 (10 migraciones revisadas)
- `supabase/migrations/20251202100000_add_polygon_fields_and_notifications.sql` -> LEGACY (anchors/workflow_notifications legacy).
- `supabase/migrations/20251202110000_add_bitcoin_attempts.sql` -> LEGACY (anchors legacy).
- `supabase/migrations/20251202120000_add_audit_logs.sql` -> LEGACY (audit_logs legacy).
- `supabase/migrations/20251203160000_signnow_embed_timestamp.sql` -> LEGACY (workflow_signers legacy).
- `supabase/migrations/20251208090000_anchor_atomic_tx.sql` -> LEGACY (anchors/user_documents legacy).
- `supabase/migrations/20251208090100_anchor_atomic_tx_grants.sql` -> LEGACY (anchor_atomic_tx grant).
- `supabase/migrations/20251208100000_create_bitcoin_ots_files.sql` -> LEGACY (bitcoin_ots_files legacy).
- `supabase/migrations/20251208110000_document_folders_and_privacy.sql` -> LEGACY (user_documents folders legacy).
- `supabase/migrations/20251208110001_nda_templates_events.sql` -> LEGACY (nda templates/events legacy).
- `supabase/migrations/20251208113000_document_folder_functions.sql` -> LEGACY (document_folders RPC legacy).

## Apndice G - Lote 7 (10 migraciones revisadas)
- `supabase/migrations/20251209000000_add_unique_constraint_anchors.sql` -> LEGACY (anchors legacy).
- `supabase/migrations/20251213000000_polygon_atomic_tx.sql` -> LEGACY (anchors/user_documents legacy).
- `supabase/migrations/20251213000100_polygon_atomic_tx_comment.sql` -> LEGACY (anchor_polygon_atomic_tx comment).
- `supabase/migrations/20251213000110_polygon_atomic_tx_grant.sql` -> LEGACY (anchor_polygon_atomic_tx grant).
- `supabase/migrations/20251214100000_signer_receipts_otp.sql` -> LEGACY (workflow signers legacy).
- `supabase/migrations/20251218120000_fix_anchors_service_role_insert.sql` -> LEGACY (anchors legacy).
- `supabase/migrations/20251218120001_fix_anchors_service_role_select.sql` -> LEGACY (anchors legacy).
- `supabase/migrations/20251218120002_fix_service_role_full_access.sql` -> LEGACY (anchors/user_documents legacy).
- `supabase/migrations/20251218130000_fix_storage_service_role.sql` -> INFRA (storage service role).
- `supabase/migrations/20251218140000_add_protection_level_and_polygon_status.sql` -> LEGACY (user_documents legacy).

## Apndice H - Lote 8 (10 migraciones revisadas)
- `supabase/migrations/20251218150000_upgrade_protection_level_function.sql` -> LEGACY (user_documents legacy).
- `supabase/migrations/20251219000000_welcome_email_system.sql` -> LEGACY (welcome emails legacy).
- `supabase/migrations/20251219010000_add_service_role_policy_documents.sql` -> LEGACY (documents legacy RLS).
- `supabase/migrations/20251219160000_fix_system_emails.sql` -> LEGACY (system_emails legacy).
- `supabase/migrations/20251220110000_founder_badges.sql` -> LEGACY (founder badges legacy).
- `supabase/migrations/20251221044721_create_product_events.sql` -> LEGACY (product_events analytics legacy).
- `supabase/migrations/20251221090000_add_nda_text_to_links.sql` -> LEGACY (links legacy).
- `supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql` -> LEGACY (user_documents anchor trigger).
- `supabase/migrations/20251221100002_orphan_recovery_cron.sql` -> INFRA (pg_cron orphan recovery).
- `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql` -> INFRA (pg_cron orphan recovery).

## Apndice J - Lote 10 (10 migraciones revisadas)
- `supabase/migrations/20251224160000_fix_rls_completeness.sql` -> LEGACY (documents legacy RLS).
- `supabase/migrations/20251224170000_add_anchor_states.sql` -> LEGACY (anchor_states legacy).
- `supabase/migrations/20260105000000_auto_create_profile_trigger.sql` -> LEGACY (profiles legacy).
- `supabase/migrations/20260106090006_migrate_legacy_tsa.sql` -> LEGACY (legacy TSA no-op).
- `supabase/migrations/20260106120000_update_blockchain_trigger_witness_hash.sql` -> LEGACY (user_documents trigger).
- `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql` -> CORE (events invariants).
- `supabase/migrations/20260106150000_deprecate_upgrade_protection_level.sql` -> LEGACY (legacy deprecation).
- `supabase/migrations/20260106155000_add_user_documents_entity_link.sql` -> LEGACY (legacy link).
- `supabase/migrations/20260106160000_detect_missing_anchor_events.sql` -> CORE (canonical detection views).
- `supabase/migrations/20260109090000_add_document_entity_id_to_signature_workflows.sql` -> LEGACY (legacy workflows link).

## Apndice K - Lote 11 (10 migraciones revisadas)
- `supabase/migrations/20260109100000_create_operations.sql` -> CORE (operations + operation_documents).
- `supabase/migrations/20260109100001_fix_operation_documents_rls.sql` -> CORE (operations RLS).
- `supabase/migrations/20260109110000_add_draft_support.sql` -> CORE (draft operations).
- `supabase/migrations/20260109130000_create_operations_events.sql` -> CORE (operations_events).
- `supabase/migrations/20260110000000_add_draft_support.sql` -> CORE (draft operations).
- `supabase/migrations/20260110100000_create_custody_storage_bucket.sql` -> INFRA (custody bucket).
- `supabase/migrations/20260110120000_create_workflow_fields.sql` -> CORE (workflow_fields).
- `supabase/migrations/20260111043858_security_rls_hardening.sql` -> AMBIGUO (empty/no-op).
- `supabase/migrations/20260111050700_fix_anchors_policy.sql` -> LEGACY (anchors legacy RLS).
- `supabase/migrations/20260111061521_add_anchor_observable_event_types.sql` -> LEGACY (events legacy observability).

## Apndice L - Lote 12 (10 migraciones revisadas)
- `supabase/migrations/20260111065455_rls_authenticated_users.sql` -> LEGACY (user_documents/anchors legacy RLS).
- `supabase/migrations/20260112130000_workflow_states_v2.sql` -> LEGACY (workflow states legacy).
- `supabase/migrations/20260112143000_update_notify_signer_link_statuses.sql` -> LEGACY (workflow notifications).
- `supabase/migrations/20260112152000_fix_workflow_states_migration_order.sql` -> LEGACY (workflow states legacy).
- `supabase/migrations/20260112165000_create_workflow_events.sql` -> CORE (workflow_events).
- `supabase/migrations/20260112173000_update_workflow_events_types.sql` -> CORE (workflow_events types).
- `supabase/migrations/20260113015223_add_signature_data_to_signers.sql` -> LEGACY (workflow_signers legacy).
- `supabase/migrations/20260113053000_extend_workflow_notification_types.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20260114000000_fix_notification_constraint.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20260114081820_create_view_v_p0.sql` -> LEGACY (workflow view).

## Apndice I - Lote 9 (10 migraciones revisadas)
- `supabase/migrations/20251222130000_e2e_profiles.sql` -> LEGACY (profiles legacy).
- `supabase/migrations/20251222130001_e2e_documents.sql` -> LEGACY (documents legacy).
- `supabase/migrations/20251222130002_e2e_document_shares.sql` -> LEGACY (document_shares legacy).
- `supabase/migrations/20251222140000_add_e2e_to_user_documents.sql` -> LEGACY (user_documents legacy).
- `supabase/migrations/20251222140001_fix_document_shares_fk.sql` -> LEGACY (document_shares legacy).
- `supabase/migrations/20251224000000_fix_profiles_rls_upsert.sql` -> LEGACY (profiles legacy).
- `supabase/migrations/20251224010000_fix_document_shares_rls.sql` -> LEGACY (document_shares legacy).
- `supabase/migrations/20251224010001_fix_document_shares_fk.sql` -> LEGACY (document_shares legacy).
- `supabase/migrations/20251224120000_add_nda_to_shares.sql` -> LEGACY (document_shares legacy).
- `supabase/migrations/20251224150000_fix_rls_delete_policy.sql` -> LEGACY (documents legacy).

## Apndice M - Lote 13 (10 migraciones revisadas)
- `supabase/migrations/20260115030000_create_batches_table.sql` -> CORE (batches canonicos ligados a document_entities).
- `supabase/migrations/20260115030100_add_batch_id_to_fields.sql` -> CORE (workflow_fields batching).
- `supabase/migrations/20260115030200_backfill_batches.sql` -> CORE (backfill batches).
- `supabase/migrations/20260115030300_enforce_batch_id_not_null.sql` -> CORE (batch_id obligatorio).
- `supabase/migrations/20260115100000_add_notification_step_and_unique_constraint.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20260115110000_add_delivery_mode_to_workflows.sql` -> LEGACY (signature_workflows).
- `supabase/migrations/20260115130000_add_token_lifecycle_to_signers.sql` -> LEGACY (workflow_signers).
- `supabase/migrations/20260115140000_create_workflow_artifacts.sql` -> LEGACY (workflow_artifacts).
- `supabase/migrations/20260115150000_create_signature_instances.sql` -> LEGACY (signature_instances).
- `supabase/migrations/20260115150100_create_signature_application_events.sql` -> LEGACY (signature_application_events).

## Apndice N - Lote 14 (10 migraciones revisadas)
- `supabase/migrations/20260115193518_add_artifact_ready_notification_type.sql` -> LEGACY (workflow_notifications).
- `supabase/migrations/20260116090000_executor_jobs_and_outbox.sql` -> INFRA (executor queue/outbox).
- `supabase/migrations/20260116091000_executor_job_runs.sql` -> INFRA (executor observabilidad).
- `supabase/migrations/20260116120000_fix_blockchain_trigger_no_app_settings.sql` -> LEGACY (trigger user_documents).
- `supabase/migrations/20260117150000_create_v_incomplete_documents.sql` -> LEGACY (view sobre user_documents).
- `supabase/migrations/20260117160000_create_workspace_plan_tables.sql` -> INFRA (workspaces/plans).
- `supabase/migrations/20260117170000_adjust_workspace_plan_tables.sql` -> INFRA (ajustes plan).
- `supabase/migrations/20260117180000_seed_plans_catalog.sql` -> INFRA (seed planes).
- `supabase/migrations/20260117190000_compute_workspace_effective_limits.sql` -> INFRA (funcion de limites).
- `supabase/migrations/20260117200000_backfill_workspaces_and_plans.sql` -> INFRA (backfill planes/workspaces).

## Apndice O - Lote 15 (4 migraciones revisadas)
- `supabase/migrations/20260117201000_backfill_workspace_plan_only.sql` -> INFRA (backfill plan actual).
- `supabase/migrations/20260117210000_fix_blockchain_trigger_auth.sql` -> LEGACY (trigger user_documents).
- `supabase/migrations/20260117211000_remove_user_email_from_trigger.sql` -> LEGACY (trigger user_documents).
- `supabase/migrations/20260118050000_fix_orphan_recovery_auth.sql` -> INFRA (orphan recovery auth).
