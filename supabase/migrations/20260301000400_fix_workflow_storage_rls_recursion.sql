-- Fix RLS recursion between storage.objects, signature_workflows and workflow_signers.
-- Context:
-- - storage SELECT policy for signed docs queried signature_workflows/workflow_signers
-- - signature_workflows SELECT policy queried workflow_signers
-- - workflow_signers SELECT policy queried signature_workflows
-- This created a policy cycle and broke createSignedUrl with:
--   "infinite recursion detected in policy for relation signature_workflows"

-- 1) Break the recursion chain in signature_workflows SELECT policy.
DROP POLICY IF EXISTS "Users can view their workflows" ON public.signature_workflows;

CREATE POLICY "Users can view their workflows"
  ON public.signature_workflows
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

COMMENT ON POLICY "Users can view their workflows" ON public.signature_workflows IS
  'Owner-only client reads to avoid policy recursion; signer access is handled through tokenized edge functions.';

-- 1.1) Remove auth.users dependency from workflow_signers SELECT policy.
-- auth.users is not readable by authenticated role and can fail policy evaluation.
DROP POLICY IF EXISTS signers_access ON public.workflow_signers;

CREATE POLICY signers_access
  ON public.workflow_signers
  FOR SELECT
  TO authenticated
  USING (
    workflow_id IN (
      SELECT id
      FROM public.signature_workflows
      WHERE owner_id = auth.uid()
    )
    OR email = auth.email()
  );

COMMENT ON POLICY signers_access ON public.workflow_signers IS
  'Owners can read signers from their workflows; signers can read their own signer row (auth.email).';

-- 2) Recreate signed docs read policy with explicit outer object reference.
-- Also guard UUID parsing from path segment to avoid cast errors.
DROP POLICY IF EXISTS "workflow_participants_can_access_signed_docs" ON storage.objects;

CREATE POLICY "workflow_participants_can_access_signed_docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(storage.objects.name))[1] = 'signed'
    AND array_length(storage.foldername(storage.objects.name), 1) >= 3
    AND (storage.foldername(storage.objects.name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    AND (
      EXISTS (
        SELECT 1
        FROM public.signature_workflows sw
        WHERE sw.id = ((storage.foldername(storage.objects.name))[2])::uuid
          AND sw.owner_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1
        FROM public.workflow_signers ws
        WHERE ws.workflow_id = ((storage.foldername(storage.objects.name))[2])::uuid
          AND ws.email = auth.email()
      )
    )
  );
