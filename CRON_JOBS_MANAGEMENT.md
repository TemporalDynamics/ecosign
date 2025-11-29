# Gestión de Cron Jobs para Send Pending Emails

## Estado Actual

El sistema usa **Supabase pg_cron** para ejecutar automáticamente `send-pending-emails`.

### Ventajas de pg_cron
- ✅ Todo dentro de Supabase (no requiere servicios externos)
- ✅ No expone claves API en GitHub o servicios terceros
- ✅ Ejecución confiable y predecible
- ✅ Logs integrados en Supabase
- ✅ Sin necesidad de servidores adicionales

---

## Comandos Útiles

### 1. Ver todos los cron jobs activos

```sql
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  database,
  username
FROM cron.job
ORDER BY jobname;
```

### 2. Ver historial de ejecuciones

```sql
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-pending-emails')
ORDER BY start_time DESC
LIMIT 20;
```

### 3. Eliminar un cron job

```sql
-- Eliminar 'send-pending-mails' (el job que nunca se ejecutó)
SELECT cron.unschedule('send-pending-mails');

-- Verificar que se eliminó
SELECT jobname FROM cron.job;
```

### 4. Crear el cron job definitivo

```sql
-- OPCIÓN 1: Invocar Edge Function via HTTP (Recomendado)
SELECT cron.schedule(
  'send-pending-emails',     -- Nombre del job
  '*/5 * * * *',             -- Cada 5 minutos (ajustar según necesidad)
  $$
  SELECT net.http_post(
    url := (SELECT current_setting('app.supabase_url', true) || '/functions/v1/send-pending-emails'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.service_role_key', true))
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- NOTA: Asegúrate de que app.supabase_url y app.service_role_key estén configurados:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://PROJECT_REF.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';
```

### 5. Pausar/reanudar un cron job

```sql
-- Pausar (marca como inactivo)
UPDATE cron.job SET active = false WHERE jobname = 'send-pending-emails';

-- Reanudar
UPDATE cron.job SET active = true WHERE jobname = 'send-pending-emails';
```

### 6. Modificar la frecuencia

```sql
-- Cambiar a cada 10 minutos
UPDATE cron.job
SET schedule = '*/10 * * * *'
WHERE jobname = 'send-pending-emails';
```

---

## Frecuencias Recomendadas

| Frecuencia | Cron Expression | Uso Recomendado |
|------------|----------------|-----------------|
| Cada 1 minuto | `* * * * *` | Testing/Development |
| Cada 5 minutos | `*/5 * * * *` | **Producción (Recomendado)** |
| Cada 10 minutos | `*/10 * * * *` | Bajo volumen de emails |
| Cada 30 minutos | `*/30 * * * *` | Muy bajo volumen |
| Cada hora | `0 * * * *` | Notificaciones no urgentes |

---

## Limpieza de Cron Jobs Duplicados

### Paso 1: Identificar jobs existentes

Ejecuta en SQL Editor:
```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
ORDER BY jobname;
```

### Paso 2: Eliminar duplicados

Si tienes estos dos jobs:
- `send-pending-mails` (nunca se ejecutó)
- `send_emails_pending_job` (funcionando)

**Opción A**: Eliminar solo el que no funciona
```sql
SELECT cron.unschedule('send-pending-mails');
```

**Opción B**: Eliminar ambos y crear uno limpio
```sql
SELECT cron.unschedule('send-pending-mails');
SELECT cron.unschedule('send_emails_pending_job');

-- Luego crear el job definitivo (ver sección 4)
```

### Paso 3: Verificar

```sql
SELECT jobname, schedule, active FROM cron.job;
```

---

## Configuración de Variables de Entorno para pg_cron

Si usas `current_setting()` en el cron job, necesitas configurar las variables:

```sql
-- Configurar URL de Supabase
ALTER DATABASE postgres
SET app.supabase_url = 'https://uiyojopjbhooxrmamaiw.supabase.co';

-- Configurar Service Role Key (¡mantén esto secreto!)
ALTER DATABASE postgres
SET app.service_role_key = 'eyJ...tu_service_role_key_aqui';

-- Verificar configuración
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'app.%';
```

**IMPORTANTE**: Estas variables son específicas de la base de datos. Si reseteas la BD local, tendrás que reconfigurarlas.

---

## Monitoreo y Debugging

### Ver últimas ejecuciones exitosas

```sql
SELECT
  job_pid,
  status,
  return_message,
  start_time,
  end_time,
  (end_time - start_time) as duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-pending-emails')
  AND status = 'succeeded'
ORDER BY start_time DESC
LIMIT 10;
```

### Ver últimas ejecuciones fallidas

```sql
SELECT
  job_pid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-pending-emails')
  AND status = 'failed'
ORDER BY start_time DESC
LIMIT 10;
```

### Verificar que el cron está funcionando

```sql
-- Ver la próxima ejecución programada
SELECT
  jobname,
  schedule,
  active,
  (SELECT max(start_time) FROM cron.job_run_details WHERE jobid = job.jobid) as last_run,
  (SELECT count(*) FROM cron.job_run_details WHERE jobid = job.jobid AND start_time > now() - interval '1 hour') as runs_last_hour
FROM cron.job as job
WHERE jobname = 'send-pending-emails';
```

---

## Troubleshooting

### Problema: El cron no se ejecuta

**Solución**:
1. Verificar que `active = true`:
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'send-pending-emails';
   ```

2. Verificar que las variables de entorno estén configuradas:
   ```sql
   SELECT setting FROM pg_settings WHERE name = 'app.supabase_url';
   ```

3. Revisar logs de ejecución:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-pending-emails')
   ORDER BY start_time DESC LIMIT 5;
   ```

### Problema: El cron se ejecuta pero no envía emails

**Solución**:
1. Verificar que hay emails pendientes:
   ```sql
   SELECT count(*) FROM workflow_notifications WHERE delivery_status = 'pending';
   ```

2. Revisar logs de la Edge Function en Supabase Dashboard → Functions → send-pending-emails → Logs

3. Verificar variables de entorno en la Edge Function (RESEND_API_KEY, etc.)

---

## Recomendación Final

**Configuración Óptima para Producción**:

1. Un solo cron job: `send-pending-emails`
2. Frecuencia: `*/5 * * * *` (cada 5 minutos)
3. Activo: `true`
4. Método: Invocar Edge Function via HTTP

Esta configuración balancea:
- ✅ Rapidez en la entrega (emails salen en <5 min)
- ✅ Bajo consumo de recursos
- ✅ Facilidad de monitoreo
- ✅ Seguridad (todo dentro de Supabase)
