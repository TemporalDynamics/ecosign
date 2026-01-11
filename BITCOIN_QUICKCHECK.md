# 🚨 BITCOIN ANCHORING - QUICK DIAGNOSTIC

**Fecha:** 2026-01-11
**Propósito:** Verificar estado de Bitcoin/OpenTimestamps anchoring

---

## ⚡ QUICK CHECKS (Ejecutar en orden)

### 1️⃣ ¿Está el cron job configurado?

**Dashboard Supabase → SQL Editor:**
```sql
SELECT jobname, schedule, active, jobid
FROM cron.job
WHERE jobname = 'process-bitcoin-anchors';
```

**Resultado esperado:** 1 fila con `active = true`, schedule = `*/5 * * * *` (cada 5 min)

**🔴 Si resultado vacío:** El cron NO está configurado
**🟢 Si active = true:** Continuar con check #2
**🟡 Si active = false:** Reactivar el cron

---

### 2️⃣ ¿Se está ejecutando el cron?

```sql
SELECT jobid, status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-bitcoin-anchors')
ORDER BY runid DESC
LIMIT 10;
```

**Resultado esperado:** Ejecuciones cada 5 minutos

**🔴 Si status='failed':** Ver `return_message` (probablemente el mismo error de auth que Polygon)
**🟢 Si status='succeeded':** Continuar con check #3

---

### 3️⃣ ¿Hay documentos pendientes de procesar?

```sql
SELECT COUNT(*) as pending_docs,
       MIN(created_at) as oldest_pending,
       MAX(created_at) as newest_pending
FROM user_documents
WHERE bitcoin_status = 'pending';
```

**Resultado esperado:** `pending_docs = 0` (todos procesados)

**🔴 Si pending_docs > 0:** Los documentos NO se están procesando

---

### 4️⃣ ¿Se están creando anchors de Bitcoin?

```sql
SELECT COUNT(*) as total_bitcoin_anchors,
       MAX(created_at) as last_anchor_created
FROM anchors
WHERE blockchain = 'bitcoin';
```

**Resultado esperado:** `last_anchor_created` debería ser reciente

**🔴 Si antiguo o NULL:** No se crean anchors de Bitcoin

---

## 🔧 FIX PROBABLE (Si tiene el mismo error de auth)

Si el cron job falla con el mismo error que Polygon:
```
ERROR: unrecognized configuration parameter "app.settings.service_role_key"
```

**Solución:**

```sql
-- Eliminar cron actual
SELECT cron.unschedule('process-bitcoin-anchors');

-- Recrear con service_role_key correcto
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',  -- Cada 5 minutos (Bitcoin es más lento)
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
SELECT jobname, active FROM cron.job WHERE jobname = 'process-bitcoin-anchors';
```

---

## 🧹 LIMPIAR LEGACY (Si hay pendientes)

```sql
-- Ver cuántos hay
SELECT COUNT(*) FROM user_documents WHERE bitcoin_status = 'pending';

-- Limpiar legacy (anterior a hoy)
UPDATE user_documents
SET bitcoin_status = NULL
WHERE bitcoin_status = 'pending'
  AND created_at < '2026-01-10'::timestamp;
```

---

## 📊 DIAGNÓSTICO COMPLETO

Para diagnóstico exhaustivo:
📄 **`scripts/diagnose-bitcoin-anchoring.sql`**

---

## ⚠️ NOTAS IMPORTANTES

**Bitcoin/OpenTimestamps es diferente a Polygon:**

1. **Confirmación más lenta:** Bitcoin puede tardar **horas** en confirmar (vs 30 seg de Polygon)
2. **Cron menos frecuente:** Se ejecuta cada **5 minutos** (vs 1 minuto de Polygon)
3. **No requiere gas fees:** OpenTimestamps es gratuito (usa aggregation)
4. **Confirmación final:** Solo cuando Bitcoin confirma el bloque (~10 min + aggregation)

**Por esto:**
- Es normal ver `bitcoin_status='pending'` por varias horas
- No es alarmante como con Polygon
- Pero si hay documentos pendientes por **días**, entonces sí hay problema

---

**TL;DR:** Probablemente tiene el mismo error de autenticación que Polygon. Ejecutá el check #2 primero para confirmar.
