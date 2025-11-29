-- Añadir columna retry_count (por defecto 0)
ALTER TABLE public.workflow_notifications
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
