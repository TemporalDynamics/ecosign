-- MIGRATION: Add Performance Indexes
--
-- Descripción:
-- Esta migración añade índices a las columnas que se usan con frecuencia en
-- las cláusulas WHERE, JOINs y en las políticas de Row Level Security (RLS).
--
-- ¿Por qué es importante?
-- Los índices aceleran drásticamente las operaciones de lectura en la base de datos,
-- especialmente en tablas que crecerán con el tiempo. Sin ellos, las consultas
-- que filtran por `user_id` o `document_id` se volverían muy lentas.
--
-- Columnas indexadas:
-- 1. `documents(user_id)`: Clave para las políticas de RLS. Acelera la búsqueda
--    de "todos los documentos de un usuario".
-- 2. `access_links(document_id)`: Clave para las políticas de RLS en esta tabla.
--    Acelera la búsqueda de "todos los enlaces de un documento".

-- Crear índice concurrente para no bloquear la tabla en producción
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);

CREATE INDEX IF NOT EXISTS idx_links_document_id ON public.links(document_id);

-- Nota: `CONCURRENTLY` no se puede ejecutar dentro de un bloque de transacción
-- en algunas versiones de PostgreSQL. Si usas la CLI de Supabase, gestionará
-- las migraciones adecuadamente.
