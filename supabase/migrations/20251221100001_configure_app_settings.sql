-- Script auxiliar: Configurar app settings para blockchain anchoring trigger
-- Ejecutar MANUALMENTE en Supabase SQL Editor DESPUÉS de aplicar la migración

-- IMPORTANTE: Reemplazar estos valores con los reales de tu proyecto
-- Los puedes obtener de:
-- - SUPABASE_URL: Project Settings > API > Project URL
-- - SERVICE_ROLE_KEY: Project Settings > API > service_role key (⚠️ SECRETO)

-- Configurar Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uiyojopjbhooxrmamaiw.supabase.co';

-- Configurar Service Role Key (⚠️ MANTENER SECRETO)
-- ⚠️ IMPORTANTE: Obtener este valor de Supabase Dashboard > Project Settings > API > service_role
-- NO COMMITEAR ESTE VALOR AL REPOSITORIO
-- 
-- Ejecutar en SQL Editor:
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbG...TU_SERVICE_ROLE_KEY_AQUI';

-- Verificar que los settings están configurados
SELECT 
  name, 
  setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';

-- Si los settings no aparecen, reconectar la sesión:
-- SELECT pg_reload_conf();
