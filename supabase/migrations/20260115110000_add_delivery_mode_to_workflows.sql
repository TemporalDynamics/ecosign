-- Migration: Add 'delivery_mode' to signature_workflows
-- Implements F0.3 - Delivery Mode

-- 1. Add the delivery_mode column with a CHECK constraint and a default
ALTER TABLE public.signature_workflows
ADD COLUMN delivery_mode TEXT NOT NULL DEFAULT 'email'
CHECK (delivery_mode IN ('email', 'link'));

COMMENT ON COLUMN public.signature_workflows.delivery_mode IS 'Specifies the delivery mechanism for the workflow: "email" for automated notifications, "link" for manual sharing.';
