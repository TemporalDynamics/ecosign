-- =================================================================
-- FIX para Migraciones de Supabase Local
-- =================================================================
-- Ejecutar DESPUÉS de cargar todas las migraciones normales
-- Este fix soluciona referencias a funciones/tablas que no existen
-- =================================================================

-- =================================================================
-- 1. Verificar qué funciones existen antes de alterarlas
-- =================================================================

-- Solo alterar funciones que existen
DO $$
BEGIN
  -- update_anchors_updated_at
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_anchors_updated_at'
  ) THEN
    ALTER FUNCTION public.update_anchors_updated_at() SET search_path = public;
    RAISE NOTICE 'Fixed search_path for update_anchors_updated_at';
  ELSE
    RAISE NOTICE 'Function update_anchors_updated_at does not exist, skipping';
  END IF;

  -- update_updated_at_column
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
    RAISE NOTICE 'Fixed search_path for update_updated_at_column';
  ELSE
    RAISE NOTICE 'Function update_updated_at_column does not exist, skipping';
  END IF;

  -- update_invites_updated_at
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_invites_updated_at'
  ) THEN
    ALTER FUNCTION public.update_invites_updated_at() SET search_path = public;
    RAISE NOTICE 'Fixed search_path for update_invites_updated_at';
  ELSE
    RAISE NOTICE 'Function update_invites_updated_at does not exist, skipping';
  END IF;

  -- update_integration_requests_updated_at (probablemente no existe)
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_integration_requests_updated_at'
  ) THEN
    ALTER FUNCTION public.update_integration_requests_updated_at() SET search_path = public;
    RAISE NOTICE 'Fixed search_path for update_integration_requests_updated_at';
  ELSE
    RAISE NOTICE 'Function update_integration_requests_updated_at does not exist, skipping';
  END IF;
END $$;

-- =================================================================
-- 2. Optimizar RLS policies solo para tablas que existen
-- =================================================================

-- Policy on: public.recipients (solo si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'recipients' AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Recipients can view their own record" ON public.recipients;
    CREATE POLICY "Recipients can view their own record"
      ON public.recipients FOR SELECT
      TO authenticated
      USING (
        (SELECT auth.jwt() ->> 'email') = email
      );
    COMMENT ON POLICY "Recipients can view their own record" ON public.recipients IS 'Optimized to evaluate auth.jwt() once per query.';
    RAISE NOTICE 'Fixed RLS policy for recipients';
  ELSE
    RAISE NOTICE 'Table recipients does not exist, skipping policy';
  END IF;
END $$;

-- Policy on: public.events (solo si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'events' AND schemaname = 'public'
  ) THEN
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
    RAISE NOTICE 'Fixed RLS policy for events';
  ELSE
    RAISE NOTICE 'Table events does not exist, skipping policy';
  END IF;
END $$;

-- Policy on: public.integration_requests (probablemente no existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'integration_requests' AND schemaname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own integration requests" ON public.integration_requests;
    CREATE POLICY "Users can view their own integration requests"
      ON public.integration_requests FOR SELECT
      USING ((SELECT auth.uid()) = user_id);
    COMMENT ON POLICY "Users can view their own integration requests" ON public.integration_requests IS 'Optimized to evaluate auth.uid() once per query.';
    RAISE NOTICE 'Fixed RLS policy for integration_requests';
  ELSE
    RAISE NOTICE 'Table integration_requests does not exist, skipping policy (this is normal)';
  END IF;
END $$;

-- =================================================================
-- FIX COMPLETE
-- =================================================================
-- Ahora puedes ejecutar: supabase start
-- Y después correr los tests: npm run test
-- =================================================================
