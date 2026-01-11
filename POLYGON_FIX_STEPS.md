# 🚨 FIX POLYGON ANCHORING - PASOS EXACTOS

**Fecha:** 2026-01-11
**Problema identificado:** Cron job falla por autenticación incorrecta
**Documentos pendientes legacy:** 65 (safe to skip)

---

## ⚡ PASO 1: Limpiar documentos legacy (OPCIONAL)

Si querés limpiar los 65 documentos pendientes legacy:

**Dashboard Supabase → SQL Editor:**
```sql
-- Ver qué vamos a limpiar
SELECT COUNT(*), MIN(created_at), MAX(created_at)
FROM user_documents
WHERE polygon_status = 'pending';

-- Marcar como NULL (skip anchoring)
UPDATE user_documents
SET polygon_status = NULL,
    bitcoin_status = NULL,
    updated_at = NOW()
WHERE polygon_status = 'pending'
  AND created_at < '2026-01-10'::timestamp;

-- Verificar
SELECT COUNT(*) FROM user_documents WHERE polygon_status = 'pending';
-- Debería ser 0
```

---

## 🔧 PASO 2: Arreglar autenticación del cron job

### Opción A: Usar script automático

**Terminal:**
```bash
cd /home/manu/dev/ecosign
./scripts/fix-polygon-cron-auth.sh
```

El script genera el SQL correcto con tu service_role_key.

### Opción B: Manual

**1. Obtener service_role_key:**

```bash
supabase status --project-ref uiyojopjbhooxrmamaiw | grep "service_role"
```

O desde Dashboard → Settings → API → **service_role (secret)**

**2. Ejecutar en Dashboard → SQL Editor:**

```sql
-- Eliminar cron actual
SELECT cron.unschedule('process-polygon-anchors');

-- Recrear con key correcto
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY_AQUI'
      )
    );
  $$
);

-- Verificar
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'process-polygon-anchors';
```

**⚠️ Reemplazá `TU_SERVICE_ROLE_KEY_AQUI` con el key real.**

---

## ✅ PASO 3: Verificar que funciona

**Esperar 2 minutos, luego ejecutar:**

```sql
SELECT jobid, status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-polygon-anchors')
ORDER BY runid DESC
LIMIT 5;
```

**Resultado esperado:**
- ✅ `status = 'succeeded'` (no más `failed`)
- ✅ Sin errores en `return_message`

---

## 🧪 PASO 4: Probar con documento nuevo

**1. Proteger un documento nuevo con Polygon habilitado**

**2. Esperar 1-2 minutos**

**3. Verificar que se procesa:**

```sql
-- Ver documentos pendientes (debería procesar rápido)
SELECT COUNT(*) FROM user_documents WHERE polygon_status = 'pending';

-- Ver último anchor creado
SELECT id, document_id, anchor_status, tx_hash, created_at
FROM anchors
WHERE blockchain = 'polygon'  -- o el nombre de columna correcto
ORDER BY created_at DESC
LIMIT 1;
```

**4. Verificar en Polygonscan:**

Copiar el `tx_hash` y buscarlo en:
https://polygonscan.com/tx/TX_HASH_AQUI

---

## 📊 Comandos útiles de debugging

```bash
# Ver logs del worker
supabase functions logs process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  --tail 50

# Invocar manualmente (testing)
supabase functions invoke process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw

# Ver variables de entorno
supabase secrets list --project-ref uiyojopjbhooxrmamaiw
```

---

## 🎯 TL;DR

**Causa raíz:** Cron job usaba `current_setting('app.settings.service_role_key')` que no existe.

**Fix:** Recrear cron con `service_role_key` hardcodeado en el SQL.

**Por qué funcionó antes:** Probablemente el setting existía antes de alguna migración/update de Supabase.

---

**Archivos creados:**
- ✅ `scripts/cleanup-legacy-polygon-pending.sql` - Limpiar documentos legacy
- ✅ `scripts/fix-polygon-cron-auth.sh` - Script automático para generar SQL
- ✅ `scripts/diagnose-polygon-anchoring.sql` - Diagnóstico completo
- ✅ `docs/ops/POLYGON_ANCHORING_DIAGNOSIS.md` - Documentación del diagnóstico
