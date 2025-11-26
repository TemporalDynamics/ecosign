-- Security hardening + RLS cleanup

-- 1) Lock down rate limit tables
ALTER TABLE IF EXISTS public.rate_limit_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limit_blocks_service" ON public.rate_limit_blocks;
CREATE POLICY "rate_limit_blocks_service"
  ON public.rate_limit_blocks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2) Ensure analytics view runs with caller privileges
CREATE OR REPLACE VIEW public.analytics_summary
  WITH (security_invoker = true)
AS
SELECT
  variant,
  action,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS unique_sessions,
  date_trunc('day', timestamp) AS event_date
FROM public.conversion_events
GROUP BY variant, action, date_trunc('day', timestamp);

-- 3) Pin search_path for SECURITY DEFINER functions
ALTER FUNCTION public.generate_invite_token() SET search_path = public, extensions;
ALTER FUNCTION public.update_invites_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.check_document_not_revoked() SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions;
ALTER FUNCTION public.update_contact_leads_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.update_anchors_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.get_next_signer(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.advance_workflow(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.create_workflow_version(uuid, text, text, text, uuid, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.validate_signer_security() SET search_path = public, extensions;
ALTER FUNCTION public.expire_signer_links() SET search_path = public, extensions;
-- ALTER FUNCTION public.update_integration_requests_updated_at() SET search_path = public, extensions; -- Function does not exist at this point

-- 4) Drop legacy duplicate policies from the initial schema
DROP POLICY IF EXISTS "Owners can view their documents" ON public.documents;
DROP POLICY IF EXISTS "Owners can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Owners can update their documents" ON public.documents;
DROP POLICY IF EXISTS "Owners can view links for their documents" ON public.links;
DROP POLICY IF EXISTS "Owners can insert links" ON public.links;
DROP POLICY IF EXISTS "Owners can update their links" ON public.links;
DROP POLICY IF EXISTS "Owners can view recipients for their documents" ON public.recipients;
DROP POLICY IF EXISTS "Owners can view NDA acceptances" ON public.nda_acceptances;
DROP POLICY IF EXISTS "Owners can view access events" ON public.access_events;
DROP POLICY IF EXISTS "Owners can view anchors" ON public.anchors;

-- 5) Normalize modern RLS policies to use SELECT auth.uid() pattern
ALTER POLICY "Users can view their own documents."
  ON public.documents
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

ALTER POLICY "Users can insert their own documents."
  ON public.documents
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

ALTER POLICY "Users can update their own documents."
  ON public.documents
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

ALTER POLICY "Users can view links for their documents"
  ON public.links
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = public.links.document_id
        AND owner_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Users can view recipients for their documents"
  ON public.recipients
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = public.recipients.document_id
        AND owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can view NDA acceptances" ON public.nda_acceptances;
CREATE POLICY "Users can view NDA acceptances"
  ON public.nda_acceptances
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = (
      SELECT d.owner_id
      FROM public.documents d
      JOIN public.recipients r ON r.document_id = d.id
      WHERE r.id = public.nda_acceptances.recipient_id
    )
  );

ALTER POLICY "Users can view access events"
  ON public.access_events
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.documents d
      JOIN public.recipients r ON r.document_id = d.id
      WHERE r.id = public.access_events.recipient_id
        AND d.owner_id = (SELECT auth.uid())
    )
  );

-- ALTER POLICY "Users can view anchors"
--   ON public.anchors
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.documents
--       WHERE id = public.anchors.document_id
--         AND owner_id = (SELECT auth.uid())
--     )
--   ); -- Policy does not exist at this point

ALTER POLICY "Users can insert their own anchors"
  ON public.anchors
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own anchors"
  ON public.anchors
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own documents"
  ON public.user_documents
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert their own documents"
  ON public.user_documents
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own documents"
  ON public.user_documents
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete their own documents"
  ON public.user_documents
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ALTER POLICY "Users can view their own integration requests"
--   ON public.integration_requests
--   TO authenticated
--   USING ((SELECT auth.uid()) = user_id);

-- ALTER POLICY "Users can insert their own integration requests"
--   ON public.integration_requests
--   TO authenticated
--   WITH CHECK ((SELECT auth.uid()) = user_id); -- Table does not exist at this point

ALTER POLICY "Users can view own signer links"
  ON public.signer_links
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

ALTER POLICY "Users can create signer links"
  ON public.signer_links
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

ALTER POLICY "Users can update own signer links"
  ON public.signer_links
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

ALTER POLICY "Users can view events for own documents"
  ON public.events
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_documents
      WHERE public.user_documents.id = public.events.document_id
        AND public.user_documents.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Users can create events"
  ON public.events
  TO authenticated
  WITH CHECK (true);

ALTER POLICY "Users can view their sent invites"
  ON public.invites
  TO authenticated
  USING ((SELECT auth.uid()) = invited_by);

ALTER POLICY "Users can create invites for their documents"
  ON public.invites
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = invited_by
    AND EXISTS (
      SELECT 1 FROM public.user_documents
      WHERE id = document_id
        AND user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Users can revoke their invites"
  ON public.invites
  TO authenticated
  USING ((SELECT auth.uid()) = invited_by)
  WITH CHECK ((SELECT auth.uid()) = invited_by);

ALTER POLICY "Invitees can view their invites"
  ON public.invites
  TO authenticated
  USING (
    email = (
      SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Invitees can accept invites"
  ON public.invites
  TO authenticated
  USING (
    email = (
      SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
    )
    AND revoked_at IS NULL
    AND expires_at > now()
  )
  WITH CHECK (
    email = (
      SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
    )
    AND revoked_at IS NULL
    AND expires_at > now()
  );

ALTER POLICY workflows_owner_access
  ON public.signature_workflows
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

ALTER POLICY workflows_signer_access
  ON public.signature_workflows
  TO authenticated
  USING (
    id IN (
      SELECT workflow_id
      FROM public.workflow_signers
      WHERE email = (
        SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
      )
    )
  );

ALTER POLICY versions_access
  ON public.workflow_versions
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id
      FROM public.signature_workflows
      WHERE owner_id = (SELECT auth.uid())
         OR id IN (
           SELECT workflow_id
           FROM public.workflow_signers
           WHERE email = (
             SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
           )
         )
    )
  );

ALTER POLICY signers_access
  ON public.workflow_signers
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id FROM public.signature_workflows WHERE owner_id = (SELECT auth.uid())
    )
    OR email = (
      SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
    )
  );

ALTER POLICY signatures_access
  ON public.workflow_signatures
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id
      FROM public.signature_workflows
      WHERE owner_id = (SELECT auth.uid())
         OR id IN (
           SELECT workflow_id
           FROM public.workflow_signers
           WHERE email = (
             SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
           )
         )
    )
  );

ALTER POLICY notifications_access
  ON public.workflow_notifications
  TO authenticated
  USING (
    recipient_email = (
      SELECT email FROM auth.users WHERE id = (SELECT auth.uid())
    )
    OR workflow_id IN (
      SELECT id FROM public.signature_workflows WHERE owner_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "Users can view their own ECO records"
  ON public.eco_records
  TO authenticated
  USING (((SELECT auth.jwt()) ->> 'email') = user_email);

ALTER POLICY "Users can create their own ECO records"
  ON public.eco_records
  TO authenticated
  WITH CHECK (((SELECT auth.jwt()) ->> 'email') = user_email);

ALTER POLICY "Users can view their own access logs"
  ON public.access_logs
  TO authenticated
  USING (((SELECT auth.jwt()) ->> 'email') = user_email);

ALTER POLICY "Users can view NDA signatures for their documents"
  ON public.nda_signatures
  TO authenticated
  USING (
    document_id IN (
      SELECT document_id
      FROM public.eco_records
      WHERE user_email = ((SELECT auth.jwt()) ->> 'email')
    )
  );

ALTER POLICY "Users can view their own documents"
  ON storage.objects
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

ALTER POLICY "Users can upload their own documents"
  ON storage.objects
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

ALTER POLICY "Users can delete their own documents"
  ON storage.objects
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

-- 6) Remove redundant index
DROP INDEX IF EXISTS public.idx_documents_owner;
