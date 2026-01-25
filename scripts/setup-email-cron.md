# Setup Email Cron Job

## Estado Actual

✅ Función `send-pending-emails` deployada y funcionando
✅ `CRON_SECRET` configurado en secrets
✅ `SUPABASE_SERVICE_ROLE_KEY` disponible
❌ **Cron job NO configurado** (por eso los emails no se envían automáticamente)

## Opción A: Dashboard (Recomendado) - 2 minutos

1. Ir a **Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions
   ```

2. Click en **"Cron Jobs"** (tab superior)

3. Click en **"+ New Cron Job"**

4. Configurar:
   - **Function:** `send-pending-emails`
   - **Schedule:** `*/5 * * * *` (cada 5 minutos)
   - **HTTP Method:** POST
   - **Headers:**
     ```
     Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
     x-cron-secret: <CRON_SECRET>
     ```
     (Usar los valores de `supabase secrets list`)

5. Click **"Save"**

## Opción B: SQL Manual

Si preferís usar SQL directo, ejecutá esto reemplazando los placeholders:

```sql
SELECT cron.schedule(
  'send-pending-emails-job',
  '*/5 * * * *',
  format(
    $cmd$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s", "x-cron-secret": "%s"}'::jsonb,
      body := '{}'::jsonb
    );
    $cmd$,
    '<SUPABASE_SERVICE_ROLE_KEY>',  -- Reemplazar con el valor real
    '<CRON_SECRET>'                  -- Reemplazar con el valor real
  )
);
```

## Verificar que funcionó

### 1. Verificar que el cron existe:

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname LIKE '%mail%';
```

Debería retornar 1 fila con `send-pending-emails-job`.

### 2. Verificar ejecuciones:

Esperá 5-10 minutos, luego:

```sql
SELECT
  job.jobname,
  details.status,
  details.start_time,
  details.end_time,
  details.return_message
FROM cron.job_run_details details
JOIN cron.job job ON job.jobid = details.jobid
WHERE job.jobname = 'send-pending-emails-job'
ORDER BY details.start_time DESC
LIMIT 10;
```

Deberías ver ejecuciones cada 5 minutos con `status = 'succeeded'`.

### 3. Verificar que los emails se enviaron:

```sql
SELECT
  id,
  notification_type,
  recipient_email,
  status,
  created_at,
  sent_at
FROM workflow_notifications
WHERE status IN ('pending', 'sent')
ORDER BY created_at DESC
LIMIT 20;
```

Los registros `pending` deberían cambiar a `sent` automáticamente cada 5 minutos.

## Troubleshooting

### El cron no aparece en `cron.job`

→ Revisá que lo creaste correctamente en el Dashboard o con SQL.

### El cron aparece pero no se ejecuta

→ Verificá:
```sql
SELECT jobid, jobname, active FROM cron.job WHERE jobname = 'send-pending-emails-job';
```

Si `active = false`, activalo:
```sql
UPDATE cron.job SET active = true WHERE jobname = 'send-pending-emails-job';
```

### El cron se ejecuta pero falla

→ Verificá los logs:
```sql
SELECT return_message, start_time
FROM cron.job_run_details
JOIN cron.job ON cron.job.jobid = cron.job_run_details.jobid
WHERE cron.job.jobname = 'send-pending-emails-job'
  AND status = 'failed'
ORDER BY start_time DESC
LIMIT 5;
```

Si el error es de autenticación, revisá que los headers estén correctos.

## Resultado Esperado

Después de configurar el cron:

✅ Cada 5 minutos, `send-pending-emails` se ejecuta automáticamente
✅ Los emails pendientes en `workflow_notifications` se procesan y envían
✅ El status cambia de `pending` → `sent`
✅ No necesitás hacer nada manual

## Verificación Final (1 prueba real)

1. Crear un workflow de prueba con un email real
2. Esperá máximo 5 minutos
3. Verificá tu inbox

Si recibís el email → **Sistema completo funcionando** 🎉
