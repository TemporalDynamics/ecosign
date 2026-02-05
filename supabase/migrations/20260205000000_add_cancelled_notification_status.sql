-- Migration: Add 'cancelled' to workflow_notifications.delivery_status
-- Purpose: support precanonical reset without conflating with delivery failures

DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname
  INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.workflow_notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%delivery_status%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.workflow_notifications DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.workflow_notifications
  ADD CONSTRAINT workflow_notifications_delivery_status_check
  CHECK (delivery_status IN (
    'pending',
    'sent',
    'delivered',
    'failed',
    'bounced',
    'cancelled'
  ));
