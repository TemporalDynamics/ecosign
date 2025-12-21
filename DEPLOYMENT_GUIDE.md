# 🚀 Guía de Deployment - Blockchain Anchoring

## ⚠️ Importante
Estas 2 migraciones **NO se pueden aplicar con CLI** (requieren permisos de superadmin).
**Debes ejecutarlas manualmente en Supabase Dashboard.**

---

## 📍 Paso 1: Ir al Dashboard

1. Abrir: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw
2. Login con tu cuenta
3. Ir a **SQL Editor** (menú izquierdo)
4. Click en **"New query"**

---

## 🔧 Paso 2: Configurar App Settings

**Copiar y pegar este SQL** (reemplazando el SERVICE_ROLE_KEY):

```sql
-- 1. Configurar Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uiyojopjbhooxrmamaiw.supabase.co';

-- 2. Configurar Service Role Key
-- ⚠️ IMPORTANTE: Obtener de Project Settings > API > service_role key
ALTER DATABASE postgres SET app.settings.service_role_key = 'PEGAR_TU_SERVICE_ROLE_KEY_AQUI';

-- 3. Verificar configuración
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'app.settings.%';
```

### ¿Dónde obtener el Service Role Key?

1. En el Dashboard, ir a **Project Settings** (ícono engranaje abajo a la izquierda)
2. Ir a **API**
3. En la sección **Project API keys**, copiar el key que dice `service_role` (⚠️ NO el `anon`)
4. Pegarlo en el SQL de arriba donde dice `PEGAR_TU_SERVICE_ROLE_KEY_AQUI`
5. Ejecutar el SQL (botón "Run" o `Ctrl+Enter`)

**Resultado esperado:**
```
name                           | setting
-------------------------------+------------------------------------------
app.settings.supabase_url      | https://uiyojopjbhooxrmamaiw.supabase.co
app.settings.service_role_key  | eyJhbG... (parcial)
```

---

## 🔄 Paso 3: Crear Cron Job de Recuperación

**En una nueva query, copiar y pegar este SQL completo:**

```sql
-- Habilitar pg_cron si no está activo
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear función de recuperación
CREATE OR REPLACE FUNCTION detect_and_recover_orphan_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  doc record;
  supabase_url text;
  service_key text;
  request_id bigint;
  orphan_count_polygon int := 0;
  orphan_count_bitcoin int := 0;
BEGIN
  -- Get settings
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Orphan recovery: Missing app settings';
      RETURN;
  END;

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Orphan recovery: Settings are NULL';
    RETURN;
  END IF;

  -- Detect Polygon orphans
  FOR doc IN
    SELECT
      ud.id,
      ud.document_hash,
      ud.user_id,
      ud.document_name,
      u.email as user_email
    FROM user_documents ud
    LEFT JOIN anchors a ON a.user_document_id = ud.id AND a.anchor_type = 'polygon'
    LEFT JOIN auth.users u ON u.id = ud.user_id
    WHERE ud.polygon_status = 'pending'
      AND a.id IS NULL  -- No anchor exists
      AND ud.created_at > NOW() - INTERVAL '2 hours'  -- Only recent docs
    ORDER BY ud.created_at ASC
    LIMIT 10  -- Process max 10 per run to avoid overload
  LOOP
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-polygon',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', doc.document_hash,
          'documentId', doc.id,
          'userDocumentId', doc.id,
          'userId', doc.user_id,
          'userEmail', doc.user_email,
          'metadata', jsonb_build_object(
            'source', 'recovery_cron',
            'documentName', doc.document_name
          )
        )
      ) INTO request_id;

      orphan_count_polygon := orphan_count_polygon + 1;
      RAISE NOTICE 'Recovery: Polygon anchor created for orphan document %: request_id=%', doc.id, request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Recovery: Failed to create Polygon anchor for document %: %', doc.id, SQLERRM;
    END;
  END LOOP;

  -- Detect Bitcoin orphans
  FOR doc IN
    SELECT
      ud.id,
      ud.document_hash,
      ud.user_id,
      ud.document_name,
      u.email as user_email
    FROM user_documents ud
    LEFT JOIN anchors a ON a.user_document_id = ud.id AND a.anchor_type = 'opentimestamps'
    LEFT JOIN auth.users u ON u.id = ud.user_id
    WHERE ud.bitcoin_status = 'pending'
      AND a.id IS NULL  -- No anchor exists
      AND ud.created_at > NOW() - INTERVAL '2 hours'  -- Only recent docs
    ORDER BY ud.created_at ASC
    LIMIT 10  -- Process max 10 per run
  LOOP
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-bitcoin',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', doc.document_hash,
          'documentId', doc.id,
          'userDocumentId', doc.id,
          'userId', doc.user_id,
          'userEmail', doc.user_email,
          'metadata', jsonb_build_object(
            'source', 'recovery_cron',
            'documentName', doc.document_name
          )
        )
      ) INTO request_id;

      orphan_count_bitcoin := orphan_count_bitcoin + 1;
      RAISE NOTICE 'Recovery: Bitcoin anchor created for orphan document %: request_id=%', doc.id, request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Recovery: Failed to create Bitcoin anchor for document %: %', doc.id, SQLERRM;
    END;
  END LOOP;

  -- Log summary if orphans were found
  IF orphan_count_polygon > 0 OR orphan_count_bitcoin > 0 THEN
    RAISE NOTICE 'Recovery complete: % Polygon orphans, % Bitcoin orphans',
      orphan_count_polygon, orphan_count_bitcoin;
  END IF;
END;
$$;

-- Create cron job (every 5 minutes)
SELECT cron.schedule(
  'recover-orphan-anchors',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT detect_and_recover_orphan_anchors();$$
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION detect_and_recover_orphan_anchors() TO service_role;
```

**Ejecutar** (botón "Run" o `Ctrl+Enter`)

**Resultado esperado:**
```
CREATE EXTENSION
CREATE FUNCTION
cron.schedule
------------
1

GRANT
```

---

## ✅ Paso 4: Verificar que Todo Funciona

**Ejecutar estos queries de verificación:**

### 4.1 Verificar App Settings
```sql
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'app.settings.%';
```
✅ Debe mostrar 2 settings (supabase_url + service_role_key)

### 4.2 Verificar Cron Job
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'recover-orphan-anchors';
```
✅ Debe mostrar: `recover-orphan-anchors | */5 * * * * | t`

### 4.3 Verificar Trigger Existe
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'user_documents'::regclass
  AND tgname = 'on_user_documents_blockchain_anchoring';
```
✅ Debe mostrar: `on_user_documents_blockchain_anchoring | O`

---

## 🧪 Paso 5: Test End-to-End

### 5.1 Certificar Documento de Prueba
1. Ir a la app web (localhost o producción)
2. Certificar un documento nuevo
3. Esperar 5 segundos

### 5.2 Verificar Anchor Creado
```sql
-- Ver último documento
SELECT id, document_name, polygon_status, created_at
FROM user_documents
ORDER BY created_at DESC
LIMIT 1;

-- Copiar el ID y verificar anchor
SELECT id, anchor_type, anchor_status, created_at
FROM anchors
WHERE user_document_id = 'PEGAR_ID_AQUI';
```
✅ Debe mostrar 1-2 anchors con status='pending'

### 5.3 Esperar Confirmación Polygon (~60s)
```sql
-- Esperar 60 segundos, luego verificar
SELECT
  id,
  document_name,
  polygon_status,
  polygon_confirmed_at
FROM user_documents
WHERE id = 'PEGAR_ID_DOCUMENTO';
```
✅ Debe mostrar: `polygon_status = 'confirmed'`

---

## 📊 Queries de Monitoreo

### Documentos Huérfanos (debe ser 0)
```sql
SELECT COUNT(*) as orphan_count
FROM user_documents ud
LEFT JOIN anchors a ON a.user_document_id = ud.id
WHERE (ud.polygon_status = 'pending' OR ud.bitcoin_status = 'pending')
  AND a.id IS NULL
  AND ud.created_at < NOW() - INTERVAL '5 minutes';
```

### Tasa de Éxito Polygon (debe ser >95%)
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN polygon_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  ROUND(100.0 * SUM(CASE WHEN polygon_status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
FROM user_documents
WHERE polygon_status IN ('pending', 'confirmed', 'failed')
  AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## ✅ Checklist Final

- [ ] **Paso 2**: App settings configurados (URL + Service Role Key)
- [ ] **Paso 3**: Cron job creado
- [ ] **Paso 4.1**: App settings verificados (2 settings presentes)
- [ ] **Paso 4.2**: Cron job verificado (activo)
- [ ] **Paso 4.3**: Trigger verificado (exists + enabled)
- [ ] **Paso 5**: Test end-to-end completado exitosamente

---

## 🚨 Troubleshooting

### Error: "Settings no aparecen"
**Solución**: Reconectar sesión
```sql
SELECT pg_reload_conf();
```

### Error: "Cron job no existe"
**Solución**: Verificar que `pg_cron` extension está habilitada
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```
Si no existe, ejecutar: `CREATE EXTENSION pg_cron;`

### Error: "Polygon no confirma"
**Diagnóstico**:
```sql
SELECT anchor_status, error_message, created_at
FROM anchors
WHERE anchor_type = 'polygon'
ORDER BY created_at DESC
LIMIT 5;
```
Revisar: wallet POL balance, RPC URL, contract address

---

**¡Listo!** El sistema de anchoring automático está deployado y funcionando.
