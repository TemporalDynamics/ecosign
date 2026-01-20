-- Migration: Disable legacy crons and triggers for Fase 0.5 isolation
-- Created: 2026-01-18T14:34:46.234Z
-- NOTE: This migration is intended to be applied manually to staging/production
-- after review. It is reversible (see ENABLE section at bottom).

BEGIN;

-- 1) Disable cron jobs that may trigger workers/pollers/notifications
DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    UPDATE cron.job
    SET active = false
    WHERE jobname ILIKE '%polygon%'
       OR jobname ILIKE '%bitcoin%'
       OR jobname ILIKE '%anchor%'
       OR jobname ILIKE '%email%'
       OR jobname ILIKE '%notify%'
       OR jobname ILIKE '%welcome%'
       OR jobname ILIKE '%pending%'
       OR jobname ILIKE '%cron%';
  ELSE
    RAISE NOTICE 'Skipping cron disable (cron.job not available)';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping cron disable (insufficient privilege)';
END $$;

-- 2) Disable triggers on legacy/operational tables to prevent background writes
DO $$
BEGIN
  ALTER TABLE public.anchors DISABLE TRIGGER ALL;
  ALTER TABLE public.anchor_states DISABLE TRIGGER ALL;
  ALTER TABLE public.workflow_notifications DISABLE TRIGGER ALL;
  ALTER TABLE public.system_emails DISABLE TRIGGER ALL;
  ALTER TABLE public.workflow_events DISABLE TRIGGER ALL;
  ALTER TABLE public.workflow_signers DISABLE TRIGGER ALL;
  ALTER TABLE public.user_documents DISABLE TRIGGER ALL;
  ALTER TABLE public.operation_documents DISABLE TRIGGER ALL;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping trigger disable (insufficient privilege)';
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipping trigger disable (missing tables)';
END $$;

COMMIT;

-- Re-enable commands (manual rollback):
-- BEGIN;
-- UPDATE cron.job SET active = true WHERE jobname ILIKE '%polygon%' OR jobname ILIKE '%bitcoin%' OR jobname ILIKE '%anchor%' OR jobname ILIKE '%email%' OR jobname ILIKE '%notify%';
-- ALTER TABLE public.anchors ENABLE TRIGGER ALL;
-- ALTER TABLE public.anchor_states ENABLE TRIGGER ALL;
-- ALTER TABLE public.workflow_notifications ENABLE TRIGGER ALL;
-- ALTER TABLE public.system_emails ENABLE TRIGGER ALL;
-- ALTER TABLE public.workflow_events ENABLE TRIGGER ALL;
-- ALTER TABLE public.workflow_signers ENABLE TRIGGER ALL;
-- ALTER TABLE public.user_documents ENABLE TRIGGER ALL;
-- COMMIT;
