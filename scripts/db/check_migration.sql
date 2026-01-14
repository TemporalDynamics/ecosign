-- Verificar que las nuevas columnas existen
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_documents'
  AND column_name IN ('status', 'file_type', 'last_event_at')
ORDER BY column_name;
