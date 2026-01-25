# Estado de Cron Jobs - Producción

## ✅ Cron Jobs Existentes y Funcionando

Según las migraciones aplicadas, estos cron jobs **YA deberían estar** configurados:

| Job Name | Schedule | Function | Status |
|----------|----------|----------|--------|
| `invoke-fase1-executor` | `*/1 * * * *` | Executor principal | ✅ Confirmado |
| `process-polygon-anchors` | `*/5 * * * *` | Procesar anchors Polygon | ✅ Confirmado |
| `process-bitcoin-anchors` | `*/10 * * * *` | Procesar anchors Bitcoin | ✅ Confirmado |
| `recover-orphan-anchors` | `0 * * * *` | Recuperar anchors huérfanos | ✅ Confirmado |

## ❌ Cron Job Faltante

| Job Name | Schedule | Function | Status |
|----------|----------|----------|--------|
| `send-pending-emails-job` | `*/5 * * * *` | Enviar emails pendientes | ❌ **NO CONFIGURADO** |

### Impacto del Job Faltante

Sin este cron job:
- ❌ Los emails de workflow NO se envían automáticamente
- ❌ Los signers NO reciben invitaciones
- ❌ Las notificaciones quedan en estado `pending` indefinidamente
- ✅ La función `send-pending-emails` **SÍ funciona** cuando se invoca manualmente

## 🔧 Cómo Configurarlo

### Método 1: Dashboard de Supabase (Recomendado)

1. Ir a: https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions

2. Click en **"Cron Jobs"** → **"+ New Cron Job"**

3. Configurar:
   ```
   Function: send-pending-emails
   Schedule: */5 * * * *
   Method: POST
   Headers:
     Authorization: Bearer <SERVICE_ROLE_KEY>
     x-cron-secret: <CRON_SECRET>
   ```

4. Save

**Tiempo estimado:** 2 minutos

### Método 2: SQL Manual

Ver instrucciones completas en: `scripts/setup-email-cron.md`

Ejecutar: `scripts/create-email-cron.sql` (después de reemplazar placeholders)

## ✅ Verificación

### 1. Verificar que existe el cron:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'send-pending-emails-job';
```

**Resultado esperado:** 1 fila con `active = true`

### 2. Verificar ejecuciones (después de 5-10 min):

```sql
SELECT job.jobname, details.status, details.start_time
FROM cron.job_run_details details
JOIN cron.job job ON job.jobid = details.jobid
WHERE job.jobname = 'send-pending-emails-job'
ORDER BY details.start_time DESC
LIMIT 5;
```

**Resultado esperado:** Múltiples filas con `status = 'succeeded'`

### 3. Verificar que los emails se envían:

```sql
SELECT
  recipient_email,
  notification_type,
  status,
  created_at,
  sent_at
FROM workflow_notifications
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Resultado esperado:** Status cambia de `pending` → `sent` automáticamente

## 📊 Estado Actual del Sistema

| Componente | Estado |
|------------|--------|
| Edge Function `send-pending-emails` | ✅ Deployada y funcional |
| CRON_SECRET | ✅ Configurado |
| SERVICE_ROLE_KEY | ✅ Configurado |
| Tabla `workflow_notifications` | ✅ Existente con datos |
| **Cron Job** | ❌ **FALTA CONFIGURAR** |

## 🎯 Resultado Esperado

Después de configurar el cron job:

✅ Sistema completamente automático
✅ Emails se envían cada 5 minutos sin intervención
✅ Notificaciones procesadas inmediatamente
✅ Workflow completo funcionando end-to-end

---

**Siguiente paso:** Configurar el cron job usando Método 1 (Dashboard)

**Tiempo total:** 2-3 minutos

**Beneficio:** Sistema 100% automático y funcional
