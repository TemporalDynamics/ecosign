# 🔧 FIX COMPLETO: BLOCKCHAIN ANCHORING (Polygon + Bitcoin)

**Fecha:** 2026-01-11
**Problema:** Cron jobs fallan por error de autenticación
**Impacto:** 65+ documentos legacy sin anclar (safe to skip)

---

## 🎯 RESUMEN EJECUTIVO

**Causa raíz identificada:**
```
ERROR: unrecognized configuration parameter "app.settings.service_role_key"
```

**Los cron jobs de Polygon y Bitcoin están fallando cada ejecución** porque intentan usar `current_setting('app.settings.service_role_key')` que ya no existe en la configuración de Supabase.

**Solución:** Recrear cron jobs con `service_role_key` hardcodeado.

---

## ⚡ FIX RÁPIDO (All-in-One)

### 1️⃣ Obtener service_role_key

**Dashboard Supabase → Settings → API**

Copiar: **service_role (secret)** - Empieza con `eyJhbGc...`

### 2️⃣ Ejecutar SQL de fix completo

**Dashboard Supabase → SQL Editor:**

Abrir archivo: `scripts/fix-all-blockchain-crons.sql`

**O copiar esto (reemplazando TU_KEY):**

```sql
-- Eliminar cron jobs que fallan
SELECT cron.unschedule('process-polygon-anchors');
SELECT cron.unschedule('process-bitcoin-anchors');

-- Recrear Polygon (cada 1 min)
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

-- Recrear Bitcoin (cada 5 min)
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer TU_SERVICE_ROLE_KEY_AQUI'
      )
    );
  $$
);

-- Verificar
SELECT jobname, schedule, active FROM cron.job
WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors');
```

### 3️⃣ Limpiar documentos legacy

**Opcional - Solo si querés limpiar los pendientes legacy:**

```sql
-- Limpiar Polygon + Bitcoin legacy (antes de hoy)
UPDATE user_documents
SET polygon_status = NULL,
    bitcoin_status = NULL,
    updated_at = NOW()
WHERE (polygon_status = 'pending' OR bitcoin_status = 'pending')
  AND created_at < '2026-01-10'::timestamp;

-- Verificar
SELECT
  COUNT(*) FILTER (WHERE polygon_status = 'pending') as polygon_pending,
  COUNT(*) FILTER (WHERE bitcoin_status = 'pending') as bitcoin_pending
FROM user_documents;
-- Ambos deberían ser 0
```

### 4️⃣ Verificar que funciona

**Esperar 5 minutos, luego:**

```sql
-- Ver últimas ejecuciones de Polygon
SELECT status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-polygon-anchors')
ORDER BY runid DESC
LIMIT 3;

-- Ver últimas ejecuciones de Bitcoin
SELECT status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-bitcoin-anchors')
ORDER BY runid DESC
LIMIT 3;
```

**Esperado:** `status = 'succeeded'` en ambos ✅

---

## 📊 DIAGNÓSTICO COMPLETO (Opcional)

Si querés ver el estado completo antes de arreglar:

### Polygon
```bash
# En Dashboard → SQL Editor
# Ejecutar: scripts/diagnose-polygon-anchoring.sql
```

### Bitcoin
```bash
# En Dashboard → SQL Editor
# Ejecutar: scripts/diagnose-bitcoin-anchoring.sql
```

---

## 🧪 TESTING POST-FIX

### Test 1: Proteger documento nuevo

1. Ir al frontend
2. Proteger un documento con Polygon + Bitcoin habilitados
3. Esperar 2 minutos
4. Verificar:

```sql
-- Ver tu documento más reciente
SELECT
  filename,
  polygon_status,
  bitcoin_status,
  protection_level,
  created_at
FROM user_documents
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:**
- `polygon_status` debería cambiar a `'confirmed'` en ~2 minutos
- `bitcoin_status` quedará `'pending'` por horas (normal con OpenTimestamps)

### Test 2: Ver anchor en blockchain

```sql
-- Obtener tx_hash de Polygon
SELECT id, tx_hash, anchor_status, created_at
FROM anchors
WHERE blockchain = 'polygon'
ORDER BY created_at DESC
LIMIT 1;
```

Copiar el `tx_hash` y verificar en:
https://polygonscan.com/tx/TX_HASH_AQUI

---

## 📁 ARCHIVOS CREADOS

### Scripts de Fix
- ✅ `scripts/fix-all-blockchain-crons.sql` - Fix all-in-one (RECOMENDADO)
- ✅ `scripts/cleanup-legacy-polygon-pending.sql` - Limpiar Polygon legacy
- ✅ `scripts/cleanup-legacy-bitcoin-pending.sql` - Limpiar Bitcoin legacy

### Scripts de Diagnóstico
- ✅ `scripts/diagnose-polygon-anchoring.sql` - Diagnóstico completo Polygon
- ✅ `scripts/diagnose-bitcoin-anchoring.sql` - Diagnóstico completo Bitcoin

### Documentación
- ✅ `POLYGON_FIX_STEPS.md` - Guía detallada Polygon
- ✅ `BITCOIN_QUICKCHECK.md` - Quick reference Bitcoin
- ✅ `docs/ops/POLYGON_ANCHORING_DIAGNOSIS.md` - Investigación completa
- ✅ `BLOCKCHAIN_ANCHORING_FIX.md` - Este archivo (resumen ejecutivo)

---

## ⏱️ TIMELINE ESPERADO

| Acción | Tiempo |
|--------|--------|
| Ejecutar SQL fix | 30 segundos |
| Primer cron Polygon exitoso | 1 minuto |
| Polygon confirma en blockchain | 30 segundos |
| Total Polygon end-to-end | ~2 minutos |
| Primer cron Bitcoin exitoso | 5 minutos |
| Bitcoin confirma (OpenTimestamps) | 2-6 horas |

---

## 🚨 TROUBLESHOOTING

### Si Polygon sigue fallando después del fix

```bash
# Ver logs de la Edge Function
supabase functions logs process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  --tail 50
```

**Posibles causas:**
- Edge Function no deployada: `supabase functions list`
- Variables de entorno faltantes: Verificar `POLYGON_RPC_URL`, `POLYGON_SPONSOR_PRIVATE_KEY`
- RPC endpoint caído: Probar URL manualmente

### Si Bitcoin sigue fallando

```bash
# Ver logs
supabase functions logs process-bitcoin-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  --tail 50
```

**Nota:** Bitcoin/OpenTimestamps puede tardar **horas** en confirmar. No es un error si permanece `'pending'` por mucho tiempo.

---

## 📞 NEXT STEPS

1. ✅ Ejecutar `fix-all-blockchain-crons.sql` con tu service_role_key
2. ✅ Limpiar documentos legacy (opcional)
3. ✅ Verificar ejecuciones exitosas (wait 5 min)
4. ✅ Probar con documento nuevo
5. ✅ Verificar tx en Polygonscan

---

**TL;DR:**
1. Copiar service_role_key del Dashboard
2. Ejecutar `fix-all-blockchain-crons.sql` (reemplazando TU_KEY)
3. Esperar 5 min y verificar que `status = 'succeeded'`
4. ¡Listo! 🎉

---

**Última actualización:** 2026-01-11
**Status:** ✅ FIX READY TO DEPLOY
