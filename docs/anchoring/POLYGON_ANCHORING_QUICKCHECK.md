# 🚨 POLYGON ANCHORING - QUICK DIAGNOSTIC

**Fecha:** 2026-01-10
**Problema:** Anchoring funcionó Dec 1, 2025. No funciona desde entonces.

---

## ⚡ QUICK CHECKS (Ejecutar en orden)

### 1️⃣ ¿Está el cron job configurado?

**Dashboard Supabase → SQL Editor:**
```sql
SELECT jobname, schedule, active, jobid
FROM cron.job
WHERE jobname = 'process-polygon-anchors';
```

**Resultado esperado:** 1 fila con `active = true`

**🔴 Si resultado vacío:** El cron NO está configurado (causa más probable)
**🟢 Si active = true:** Continuar con check #2
**🟡 Si active = false:** Reactivar con `UPDATE cron.job SET active = true WHERE jobname = 'process-polygon-anchors';`

---

### 2️⃣ ¿Se está ejecutando el cron?

```sql
SELECT jobname, status, start_time, return_message
FROM cron.job_run_details
WHERE jobname = 'process-polygon-anchors'
ORDER BY start_time DESC
LIMIT 10;
```

**Resultado esperado:** Ejecuciones recientes (últimos 5-10 minutos)

**🔴 Si vacío o antiguo:** Cron no se ejecuta (problema de configuración)
**🟢 Si hay ejecuciones recientes con status='succeeded':** Continuar con check #3
**🔴 Si status='failed':** Ver `return_message` para error

---

### 3️⃣ ¿Hay documentos pendientes de procesar?

```sql
SELECT COUNT(*) as pending_docs,
       MIN(created_at) as oldest_pending,
       MAX(created_at) as newest_pending
FROM user_documents
WHERE polygon_status = 'pending';
```

**Resultado esperado:** `pending_docs = 0` (todos procesados)

**🔴 Si pending_docs > 0:** Los documentos NO se están procesando
**🟢 Si pending_docs = 0:** No hay pendientes (o no se están marcando como pending)

---

### 4️⃣ ¿Se están creando anchors?

```sql
SELECT COUNT(*) as total_polygon_anchors,
       MAX(created_at) as last_anchor_created
FROM anchors
WHERE chain_type = 'polygon';
```

**Resultado esperado:** `last_anchor_created` debería ser reciente (hoy o ayer)

**🔴 Si last_anchor_created es Dec 1, 2025:** Confirma que NO se crean anchors desde entonces
**🟢 Si hay anchors recientes:** El sistema funciona

---

## 🔧 FIX RÁPIDO (Si cron no está configurado)

**Dashboard Supabase → SQL Editor:**
```sql
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
```

**Verificar que funcionó:**
```sql
SELECT jobname, active FROM cron.job WHERE jobname = 'process-polygon-anchors';
-- Debe retornar: process-polygon-anchors | true
```

**Esperar 2 minutos y verificar ejecuciones:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'process-polygon-anchors'
ORDER BY start_time DESC
LIMIT 5;
```

---

## 🎯 DIAGNÓSTICO COMPLETO

Para diagnóstico exhaustivo, ejecutar:
📄 **`scripts/diagnose-polygon-anchoring.sql`**

Para documentación completa:
📄 **`docs/ops/POLYGON_ANCHORING_DIAGNOSIS.md`**

---

## 📞 LOGS DE EDGE FUNCTION (Terminal)

```bash
# Ver logs recientes
supabase functions logs process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  --tail 100

# Invocar manualmente para testing
supabase functions invoke process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw
```

---

**TL;DR:** La causa más probable es que el cron job de `process-polygon-anchors` no está configurado en la base de datos. El código existe, pero los workers no se ejecutan automáticamente sin el cron job.
