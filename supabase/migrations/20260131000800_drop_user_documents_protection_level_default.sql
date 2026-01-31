-- Migration: Drop user_documents.protection_level default
-- Date: 2026-01-31
-- Purpose:
-- Avoid silently creating new documents as 'ACTIVE' by default.
-- ACTIVE is a derived consequence of proof events, not an initial write.

ALTER TABLE public.user_documents
  ALTER COLUMN protection_level DROP DEFAULT;
