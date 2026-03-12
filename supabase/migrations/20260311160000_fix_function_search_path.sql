-- Fix: Function search_path mutable warnings
-- Date: 2026-03-11
-- Purpose: Pin search_path on listed public functions (Security Advisor WARN)

DO $$
DECLARE
  fn RECORD;
  target_names TEXT[] := ARRAY[
    'update_anchor_states_updated_at',
    'update_operations_updated_at',
    'count_documents_in_operation',
    'count_user_drafts',
    'is_draft_operation',
    'cleanup_draft_on_protect',
    'validate_draft_transition',
    'update_workflow_fields_updated_at',
    'get_next_signer',
    'hash_events_array',
    'get_workflow_public_status',
    'update_bitcoin_ots_files_updated_at',
    'validate_anchor_event',
    'try_parse_timestamptz',
    'prevent_canvas_snapshot_mutation',
    'check_and_expire_shares',
    'enforce_document_entities_immutability',
    'enforce_document_entities_append_only',
    'on_document_entity_events_change',
    'set_hash_only_witness_hash',
    'get_anchor_inconsistency_summary',
    'is_decision_in_shadow_mode',
    'notify_link_expired',
    'notify_resend_access',
    'notify_owner_resend',
    'update_nda_templates_updated_at',
    'should_notify_signer_link_canonical',
    'update_document_folders_updated_at',
    'update_certificate_regen_updated_at',
    'should_notify_workflow_completed_canonical',
    'update_tsa_latest',
    'validate_tsa_event',
    'should_notify_creator_detailed_canonical',
    'is_decision_under_canonical_authority',
    'enforce_required_evidence_on_protection_request',
    'notify_creator_on_signature',
    'enforce_events_write_guard',
    'compute_workspace_effective_limits',
    'enforce_events_append_only',
    'enforce_active_requires_proof_events',
    'validate_anchor_uniqueness',
    'check_legacy_write_attempt',
    'claim_executor_jobs',
    'worker_heartbeat',
    'claim_execution_jobs',
    'process_document_entity_events',
    'claim_orchestrator_jobs',
    'update_feature_flags_updated_at_column',
    'claim_initial_decision_jobs',
    'insert_workflow_signer',
    'append_event_to_workflow_events',
    'queue_welcome_email',
    'notify_signature_completed',
    'notify_signer_link',
    'notify_workflow_completed',
    'queue_system_welcome_email',
    'log_ecox_event',
    'upgrade_protection_level',
    'set_operation_document_added_by',
    'generate_ecox_certificate'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid,
           n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(target_names)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      fn.schema_name,
      fn.function_name,
      fn.args
    );
  END LOOP;
END $$;
