-- Allow supervisor seats as an enterprise/manual add-on (not self-serve initially)

ALTER TABLE public.workspace_addons
  DROP CONSTRAINT IF EXISTS workspace_addons_type_unit_check;

ALTER TABLE public.workspace_addons
  ADD CONSTRAINT workspace_addons_type_unit_check
  CHECK (
    (addon_type = 'storage_gb' AND unit = 'gb') OR
    (addon_type = 'seats' AND unit = 'seat') OR
    (addon_type = 'supervisor_seats' AND unit = 'supervisor') OR
    (addon_type = 'signature_credits' AND unit = 'signature') OR
    (addon_type = 'polygon_fast_anchor' AND unit = 'capability')
  );

