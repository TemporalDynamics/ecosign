-- Migración 013: Agregar columnas de tracking a user_documents
-- Ejecutar este SQL en el Dashboard de Supabase -> SQL Editor

ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS status TEXT
    DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'sent',
      'pending',
      'signed',
      'rejected',
      'expired'
    )),
  ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ DEFAULT NOW();

-- Índice por estado
CREATE INDEX IF NOT EXISTS idx_user_documents_status
  ON public.user_documents(status);

-- Índice por actividad reciente
CREATE INDEX IF NOT EXISTS idx_user_documents_last_event
  ON public.user_documents(last_event_at DESC);

-- Actualizar documentos existentes con valores por defecto
UPDATE public.user_documents
SET 
  status = 'signed',
  file_type = COALESCE(
    CASE 
      WHEN mime_type LIKE '%pdf%' THEN 'pdf'
      WHEN mime_type LIKE '%doc%' THEN 'docx'
      WHEN mime_type LIKE '%image%' THEN 'img'
      ELSE 'pdf'
    END,
    'pdf'
  ),
  last_event_at = COALESCE(updated_at, created_at, NOW())
WHERE status IS NULL;
