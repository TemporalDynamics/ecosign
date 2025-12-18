-- =================================================================
-- MIGRATION: Fix Security & Performance Issues (2025-11-25)
-- =================================================================
-- This migration addresses issues reported by the Supabase dashboard.
--
-- 1.  **Security**: Sets a secure `search_path` for trigger functions to
--     prevent potential schema-hijacking vulnerabilities.
-- 2.  **Performance**: Optimizes Row Level Security (RLS) policies by
--     wrapping `auth` function calls in a `SELECT` statement. This
--     ensures the function is evaluated once per query, not per row.
-- =================================================================

-- =================================================================
-- 1. SECURITY FIXES: Set secure search_path for trigger functions
-- =================================================================

-- Safety: ensure function exists so ALTER doesn't fail in fresh/local setups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_integration_requests_updated_at'
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_integration_requests_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END;
$$;

-- Fix for function reported by Supabase
ALTER FUNCTION public.update_integration_requests_updated_at() SET search_path = public;

-- Proactive fixes for other similar trigger functions
ALTER FUNCTION public.update_anchors_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_invites_updated_at() SET search_path = public;


-- =================================================================
-- 2. PERFORMANCE FIXES: Optimize RLS policies
-- =================================================================

-- Policy on: public.recipients
-- Name: "Recipients can view their own record"
DROP POLICY IF EXISTS "Recipients can view their own record" ON public.recipients;
CREATE POLICY "Recipients can view their own record"
  ON public.recipients FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'email') = email
  );
COMMENT ON POLICY "Recipients can view their own record" ON public.recipients IS 'Optimized to evaluate auth.jwt() once per query.';


-- Policy on: public.events
-- Name: "Users can view events for their documents"
DROP POLICY IF EXISTS "Users can view events for their documents" ON public.events;
CREATE POLICY "Users can view events for their documents"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_documents
      WHERE user_documents.id = events.document_id
        AND user_documents.user_id = (SELECT auth.uid())
    )
  );
COMMENT ON POLICY "Users can view events for their documents" ON public.events IS 'Optimized to evaluate auth.uid() once per query.';


-- Policy on: public.integration_requests (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'integration_requests'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own integration requests" ON public.integration_requests;
    CREATE POLICY "Users can view their own integration requests"
      ON public.integration_requests FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
    COMMENT ON POLICY "Users can view their own integration requests" ON public.integration_requests IS 'Optimized to evaluate auth.uid() once per query.';
  END IF;
END;
$$;

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
