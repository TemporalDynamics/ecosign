-- Agregar política de INSERT para workflow_notifications
-- Las Edge Functions (con SERVICE_ROLE_KEY) necesitan poder insertar notificaciones

-- Policy: Permitir INSERT para service_role (Edge Functions)
CREATE POLICY notifications_service_insert ON public.workflow_notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Owners pueden insertar notificaciones para sus propios workflows
CREATE POLICY notifications_owner_insert ON public.workflow_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM public.signature_workflows WHERE owner_id = auth.uid()
    )
  );

COMMENT ON POLICY notifications_service_insert ON public.workflow_notifications IS
  'Permite a Edge Functions (service_role) crear notificaciones';

COMMENT ON POLICY notifications_owner_insert ON public.workflow_notifications IS
  'Permite a owners crear notificaciones para sus workflows';
