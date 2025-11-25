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


-- Policy on: public.integration_requests
-- Name: "Users can view their own integration requests"
DROP POLICY IF EXISTS "Users can view their own integration requests" ON public.integration_requests;
CREATE POLICY "Users can view their own integration requests"
  ON public.integration_requests FOR SELECT
  USING ((SELECT auth.uid()) = user_id);
COMMENT ON POLICY "Users can view their own integration requests" ON public.integration_requests IS 'Optimized to evaluate auth.uid() once per query.';

-- =================================================================
-- MIGRATION COMPLETE
-- =================================================================
