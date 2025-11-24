-- Habilitar RLS en las tablas si no está habilitado
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.access_links ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Users can view their own documents." ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents." ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents." ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents." ON public.documents;

-- DROP POLICY IF EXISTS "Users can manage links for their own documents." ON public.access_links;

-- ----------------------------------------------------------------------------
-- Políticas para la tabla 'documents'
-- ----------------------------------------------------------------------------

-- 1. Política de SELECT: Los usuarios pueden ver sus propios documentos.
CREATE POLICY "Users can view their own documents."
ON public.documents FOR SELECT
USING (auth.uid() = owner_id);

-- 2. Política de INSERT: Los usuarios pueden crear documentos para sí mismos.
CREATE POLICY "Users can insert their own documents."
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- 3. Política de UPDATE: Los usuarios pueden actualizar sus propios documentos.
CREATE POLICY "Users can update their own documents."
ON public.documents FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 4. Política de DELETE: Los usuarios pueden eliminar sus propios documentos.
CREATE POLICY "Users can delete their own documents."
ON public.documents FOR DELETE
USING (auth.uid() = owner_id);


-- ----------------------------------------------------------------------------
-- -- Políticas para la tabla 'access_links'
-- ----------------------------------------------------------------------------

-- 1. Política General: Los usuarios solo pueden gestionar (ver, crear, borrar)
--    enlaces para los documentos que les pertenecen.
--    Esto se comprueba haciendo un JOIN implícito para ver si el auth.uid()
--    coincide con el user_id del documento al que el enlace apunta.
-- CREATE POLICY "Users can manage links for their own documents."
-- ON public.access_links FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.documents
--     WHERE id = access_links.document_id
--     AND user_id = auth.uid()
--   )
-- )
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM public.documents
--     WHERE id = access_links.document_id
--     AND user_id = auth.uid()
--   )
-- );
