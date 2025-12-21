# 🚀 Deployment Guide - Blockchain Anchoring (FIXED)

## ✅ Estado Real del Sistema

### Migraciones YA aplicadas (verificado con CLI):
- ✅ `20251218140000` - Columnas polygon_status, bitcoin_status, protection_level
- ✅ `20251221100000` - Trigger blockchain_anchoring_trigger

### Migraciones pendientes:
- ⏭️ `20251221100001` - **NO NECESARIA** (app.settings no funciona en Supabase Cloud)
- ⚠️ `20251221100002` - Cron de recovery (necesita aplicarse en Dashboard)

---

## 📍 Único Paso Pendiente

### Aplicar Cron Job de Recuperación

**Ubicación**: Supabase Dashboard → SQL Editor

**Por qué se necesita:**
- Safety net para documentos huérfanos (trigger falló / edge function dio timeout)
- Se ejecuta cada 5 minutos
- Detecta documentos con `polygon_status='pending'` pero sin registro en tabla `anchors`

---

## 🔧 SQL a Ejecutar (Dashboard)

**Copiar y pegar COMPLETO** en SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create recovery function
CREATE OR REPLACE FUNCTION detect_and_recover_orphan_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  doc record;
  supabase_url text;
  request_id bigint;
  orphan_count_polygon int := 0;
  orphan_count_bitcoin int := 0;
BEGIN
  -- Hardcoded Supabase URL (public, not secret)
  supabase_url := 'https://uiyojopjbhooxrmamaiw.supabase.co';

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
      AND a.id IS NULL
      AND ud.created_at > NOW() - INTERVAL '2 hours'
    ORDER BY ud.created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-polygon',
        headers := jsonb_build_object('Content-Type', 'application/json'),
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
      RAISE NOTICE 'Recovery: Polygon orphan % recovered', doc.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Recovery failed for %: %', doc.id, SQLERRM;
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
      AND a.id IS NULL
      AND ud.created_at > NOW() - INTERVAL '2 hours'
    ORDER BY ud.created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-bitcoin',
        headers := jsonb_build_object('Content-Type', 'application/json'),
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
      RAISE NOTICE 'Recovery: Bitcoin orphan % recovered', doc.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Recovery failed for %: %', doc.id, SQLERRM;
    END;
  END LOOP;

  IF orphan_count_polygon > 0 OR orphan_count_bitcoin > 0 THEN
    RAISE NOTICE 'Recovery complete: % Polygon, % Bitcoin',
      orphan_count_polygon, orphan_count_bitcoin;
  END IF;
END;
$$;

-- Schedule cron job (every 5 minutes)
SELECT cron.schedule(
  'recover-orphan-anchors',
  '*/5 * * * *',
  $$SELECT detect_and_recover_orphan_anchors();$$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_and_recover_orphan_anchors() TO service_role;

-- Add comment
COMMENT ON FUNCTION detect_and_recover_orphan_anchors() IS
  'Safety net: detects orphan documents and triggers edge functions for recovery';
```

**Ejecutar** → Botón "Run" o `Ctrl+Enter`

**Resultado esperado:**
```
CREATE EXTENSION
CREATE FUNCTION
cron.schedule | 1
GRANT
```

---

## ✅ Verificación Post-Deploy

### 1️⃣ Verificar cron job existe
```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'recover-orphan-anchors';
```
**Debe mostrar**: `recover-orphan-anchors | */5 * * * * | t`

### 2️⃣ Verificar trigger existe (ya aplicado)
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'user_documents'::regclass
  AND tgname = 'on_user_documents_blockchain_anchoring';
```
**Debe mostrar**: `on_user_documents_blockchain_anchoring | O`

### 3️⃣ Test manual del cron (opcional)
```sql
SELECT detect_and_recover_orphan_anchors();
```
- Si no hay huérfanos → No output (normal)
- Si hay huérfanos → Verás NOTICE con IDs

### 4️⃣ Query de huérfanos actuales
```sql
SELECT COUNT(*) as orphan_count
FROM user_documents ud
LEFT JOIN anchors a ON a.user_document_id = ud.id
WHERE (ud.polygon_status = 'pending' OR ud.bitcoin_status = 'pending')
  AND a.id IS NULL
  AND ud.created_at < NOW() - INTERVAL '10 minutes';
```
**Resultado esperado**: `0` (o pocos si acabas de certificar documentos)

---

## 🧪 Test End-to-End

### Paso 1: Certificar documento de prueba
1. Ir a la app web
2. Certificar un PDF con Polygon activado
3. Esperar 5 segundos

### Paso 2: Verificar anchor creado por trigger
```sql
-- Ver último documento certificado
SELECT id, document_name, polygon_status, created_at
FROM user_documents
ORDER BY created_at DESC
LIMIT 1;

-- Copiar el ID y verificar anchor
SELECT id, anchor_type, anchor_status, created_at
FROM anchors
WHERE user_document_id = 'PEGAR_ID_AQUI';
```
**Debe mostrar**: 1-2 anchors con `status='pending'`

### Paso 3: Esperar confirmación Polygon (~30-120s)
```sql
SELECT
  document_name,
  polygon_status,
  protection_level,
  polygon_confirmed_at
FROM user_documents
WHERE id = 'PEGAR_ID_DOCUMENTO';
```
**Debe mostrar**: `polygon_status='confirmed'`, `protection_level='REINFORCED'`

---

## 📊 Queries de Monitoreo

### Documentos huérfanos (debe ser 0 o muy bajo)
```sql
SELECT
  id,
  document_name,
  polygon_status,
  bitcoin_status,
  created_at
FROM user_documents ud
LEFT JOIN anchors a ON a.user_document_id = ud.id
WHERE (ud.polygon_status = 'pending' OR ud.bitcoin_status = 'pending')
  AND a.id IS NULL
  AND ud.created_at < NOW() - INTERVAL '1 hour';
```

### Tasa de éxito Polygon (últimas 24h)
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN polygon_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  ROUND(100.0 * SUM(CASE WHEN polygon_status = 'confirmed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as success_rate
FROM user_documents
WHERE polygon_status IN ('pending', 'confirmed', 'failed')
  AND created_at >= NOW() - INTERVAL '24 hours';
```

### Distribución de protection_level
```sql
SELECT
  protection_level,
  COUNT(*) as count
FROM user_documents
GROUP BY protection_level
ORDER BY CASE protection_level
  WHEN 'TOTAL' THEN 1
  WHEN 'REINFORCED' THEN 2
  WHEN 'ACTIVE' THEN 3
END;
```

---

## 🚨 Troubleshooting

### Error: "pg_cron extension does not exist"
**Causa**: Extension no habilitada en el proyecto
**Solución**: Ir a Dashboard → Database → Extensions → Enable `pg_cron`

### Error: "function detect_and_recover_orphan_anchors already exists"
**Causa**: Ya se ejecutó antes (idempotente)
**Solución**: No es error, continuar

### Polygon no confirma después de 5 minutos
**Diagnóstico**:
```sql
SELECT anchor_status, error_message, created_at
FROM anchors
WHERE anchor_type = 'polygon'
ORDER BY created_at DESC
LIMIT 5;
```
**Posibles causas**: Wallet sin POL, RPC caído, contract address incorrecto

---

## ✅ Checklist de Deployment Completo

- [ ] Ejecutar SQL del cron en Dashboard
- [ ] Verificar cron job activo (query 1️⃣)
- [ ] Verificar trigger existe (query 2️⃣)
- [ ] Certificar documento de prueba
- [ ] Verificar anchor creado (~5s)
- [ ] Verificar Polygon confirmado (~60s)
- [ ] Query de huérfanos = 0

---

## 📝 Diferencias vs. Guía Anterior

**❌ Eliminado:**
- `20251221100001_configure_app_settings.sql` (no funciona en Supabase Cloud)
- Dependencia de `app.settings.service_role_key`
- Pasos manuales de obtener service_role_key

**✅ Simplificado:**
- URL hardcodeada (pública, no es secreto)
- Edge functions ya tienen service_role en su environment
- net.http_post no necesita Authorization header para llamadas internas

**🧠 Arquitectura correcta:**
```
DB Trigger/Cron → net.http_post → Edge Function (con service_role env) → Supabase Admin API
```

---

**¡Listo!** Con esto el sistema de anchoring automático + recovery está completamente deployado.
