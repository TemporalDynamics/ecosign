# Bitcoin Anchoring Worker

Esta función procesa la cola de anclajes de Bitcoin utilizando OpenTimestamps.

## Funcionalidad

1. **Procesa anchors en estado `queued`**: Los envía a los servidores de OpenTimestamps
2. **Verifica anchors en estado `pending` o `processing`**: Chequea si ya se confirmaron en Bitcoin
3. **Envía notificaciones por email**: Cuando un anclaje se confirma en la blockchain

## Configuración

### 1. Deploy de la función

```bash
supabase functions deploy process-bitcoin-anchors --project-ref <tu-project-ref>
```

### 2. Variables de entorno

Configurar en Supabase Dashboard → Project Settings → Edge Functions:

```bash
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
RESEND_API_KEY=tu-resend-api-key  # Opcional, para notificaciones
```

### 3. Configurar Cron Job

Opción A: **Supabase Cron** (recomendado)

```sql
-- En el SQL Editor de Supabase
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',  -- Cada 5 minutos
  $$
    SELECT net.http_post(
      url := 'https://tu-proyecto.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
```

Opción B: **Servicio externo** (Cron-job.org, GitHub Actions, etc.)

Configurar para hacer POST a:
```
https://tu-proyecto.supabase.co/functions/v1/process-bitcoin-anchors
```

Con header:
```
Authorization: Bearer <service-role-key>
```

## Flujo del proceso

### Estado de los anchors:

1. **`queued`**: Recién creado, esperando ser enviado a OpenTimestamps
2. **`pending`**: Enviado a OpenTimestamps, esperando confirmación en Bitcoin
3. **`processing`**: Esperando que el bloque se confirme en Bitcoin (puede tardar horas)
4. **`confirmed`**: ✅ Confirmado en blockchain de Bitcoin
5. **`failed`**: ❌ Error en el proceso

### Timeline típico:

- **0 min**: Usuario solicita anclaje → estado `queued`
- **~5 min**: Worker procesa → envía a OpenTimestamps → estado `pending`
- **4-24 horas**: OpenTimestamps espera confirmación de Bitcoin
- **~4-24h**: Worker detecta confirmación → estado `confirmed` → envía email

## Monitoreo

Verificar logs en Supabase Dashboard → Edge Functions → process-bitcoin-anchors → Logs

```bash
# También puedes invocar manualmente para testing
supabase functions invoke process-bitcoin-anchors --project-ref <ref>
```

## Troubleshooting

### Los anchors se quedan en "queued"
- Verificar que el cron job esté configurado
- Verificar logs de la función

### Los anchors se quedan en "pending" mucho tiempo
- **Normal**: Bitcoin puede tardar 4-24 horas en confirmar
- Verificar que el worker esté corriendo cada 5-15 minutos

### No llegan emails de notificación
- Verificar `RESEND_API_KEY` en las variables de entorno
- Verificar que los anchors tengan `user_email` guardado
- Verificar logs de Resend en https://resend.com/logs
