# Guía de Bitcoin Anchoring - EcoSign

## ✅ Estado Actual (2025-11-30)

Las funciones de Bitcoin anchoring han sido actualizadas y desplegadas con las siguientes mejoras:

1. ✅ **Validación de hash** - `anchor-bitcoin` ahora valida que el hash sea de 64 caracteres hexadecimales
2. ✅ **Verificación mejorada** - `process-bitcoin-anchors` evita falsos positivos
3. ✅ **Cron programado** - El procesamiento automático se ejecuta cada 5 minutos
4. ✅ **Funciones desplegadas** - Ambas funciones están en producción

## Cómo Funciona el Flujo

### 1. Creación del Anchor (Estado: `queued`)

Cuando un usuario certifica un documento:

```typescript
// En el cliente
const response = await fetch('/functions/v1/anchor-bitcoin', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documentHash: "abc123...", // SHA-256 hex (64 chars)
    userEmail: "user@example.com",
    metadata: { source: "dashboard" }
  })
})
```

La función `anchor-bitcoin`:
- Valida que el hash sea de 64 caracteres hexadecimales
- Crea un registro en la tabla `anchors` con `anchor_status='queued'`
- Retorna el `anchor_id`

### 2. Procesamiento Automático (Estado: `queued` → `pending`)

Cada 5 minutos, el cron job ejecuta `process-bitcoin-anchors` que:

1. Busca todos los anchors con `anchor_status='queued'`
2. Para cada uno:
   - Crea un archivo `.ots` con el hash del documento
   - Lo envía al servicio OpenTimestamps
   - Guarda el proof OTS en la base de datos
   - Cambia el estado a `pending`

### 3. Confirmación en Bitcoin (Estado: `pending` → `confirmed`)

OpenTimestamps ancla los hashes en la blockchain de Bitcoin:

- **Tiempo estimado**: 1-6 horas (depende del siguiente bloque de Bitcoin)
- El cron sigue verificando anchors `pending`
- Cuando OpenTimestamps confirma:
  - Descarga el proof actualizado (con datos de Bitcoin)
  - Actualiza el estado a `confirmed`
  - Guarda `bitcoin_tx_id` y `bitcoin_block_height`
  - Envía notificación por email (si `RESEND_API_KEY` está configurada)

## Configuración del Cron

El cron job ya está configurado en tu base de datos. Para verificarlo:

```sql
-- Ver cron jobs activos
SELECT * FROM cron.job;

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details
WHERE jobname = 'process-bitcoin-anchors'
ORDER BY start_time DESC
LIMIT 10;
```

### SQL del Cron (ya ejecutado)

```sql
SELECT cron.schedule(
  'process-bitcoin-anchors',
  '*/5 * * * *',  -- Cada 5 minutos
  $$
    SELECT net.http_post(
      url := 'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    );
  $$
);
```

## Pruebas

### Opción 1: Script Automático de Prueba

He creado un script que prueba todo el flujo:

```bash
./test-bitcoin-anchoring.sh
```

El script:
1. Genera un hash de prueba
2. Crea un anchor
3. Procesa la cola manualmente
4. Verifica el estado en la base de datos
5. Muestra el resultado

### Opción 2: Prueba Manual con cURL

```bash
# 1. Generar hash de prueba (64 hex chars)
TEST_HASH=$(echo "mi-documento-$(date +%s)" | sha256sum | awk '{print $1}')
echo "Hash: $TEST_HASH"

# 2. Crear anchor
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"documentHash\":\"$TEST_HASH\",\"userEmail\":\"test@ecosign.app\"}" \
  https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/anchor-bitcoin

# 3. Procesar manualmente (o esperar 5 min al cron)
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-bitcoin-anchors

# 4. Ver estado en la base de datos
# (usar Dashboard de Supabase o SQL Editor)
```

### Opción 3: Desde Supabase CLI

```bash
# Invocar process-bitcoin-anchors manualmente
supabase functions invoke process-bitcoin-anchors

# Ver logs en tiempo real
supabase functions logs anchor-bitcoin
supabase functions logs process-bitcoin-anchors
```

## Validaciones Implementadas

### En `anchor-bitcoin`

```typescript
// Valida formato de hash (64 caracteres hexadecimales)
const isHex64 = /^[0-9a-f]{64}$/i;
if (!isHex64.test(documentHash.trim())) {
  return jsonResponse({
    error: 'Invalid documentHash. Must be 64 hex characters (SHA-256).'
  }, 400);
}
```

### En `process-bitcoin-anchors`

```typescript
// Solo marca como confirmed si el proof realmente cambió (fue upgraded)
const wasUpgraded = upgradedProof !== otsProof;

return {
  confirmed: wasUpgraded,
  upgradedProof: wasUpgraded ? upgradedProof : otsProof,
  bitcoinTxId: wasUpgraded ? 'pending-extraction' : undefined,
  blockHeight: wasUpgraded ? 0 : undefined
};
```

Esto evita falsos positivos donde el anchor se marcaba como `confirmed` cuando en realidad OpenTimestamps aún no había anclado en Bitcoin.

## Variables de Entorno Necesarias

Verifica que estén configuradas en Supabase Secrets:

```bash
supabase secrets list | grep -E "BITCOIN_OTS|RESEND_API"
```

Requeridas:
- ✅ `BITCOIN_OTS_CALENDAR` - URL del calendario OpenTimestamps
- ⚠️ `RESEND_API_KEY` - (Opcional) Para enviar notificaciones por email

Si falta `RESEND_API_KEY`, el flujo funciona pero no envía emails.

## Próximas Mejoras (TODO)

### 1. Parseo Real de OTS para Extraer txid/blockHeight

Actualmente, cuando un proof se confirma, guardamos:
- `bitcoin_tx_id: 'pending-extraction'`
- `bitcoin_block_height: 0`

**Mejora necesaria**: Parsear el proof OTS para extraer los valores reales.

Ubicación: `supabase/functions/process-bitcoin-anchors/index.ts` en la función `verifyOpenTimestamps`

Opciones:
1. **Usar librería JavaScript**: `javascript-opentimestamps`
2. **Llamar a un microservicio externo** que use el cliente oficial de Python
3. **Parsear manualmente** el formato binario OTS

#### Ejemplo con `javascript-opentimestamps`:

```typescript
import { DetachedTimestampFile } from 'javascript-opentimestamps';

async function verifyOpenTimestamps(otsProof: string): Promise<{
  confirmed: boolean;
  upgradedProof?: string;
  bitcoinTxId?: string;
  blockHeight?: number;
}> {
  try {
    const otsBytes = Uint8Array.from(Buffer.from(otsProof, 'hex'));
    const detached = DetachedTimestampFile.deserialize(otsBytes);

    // Intentar upgrade
    const upgraded = await OpenTimestamps.upgrade(detached);

    if (upgraded) {
      // Parsear attestations para extraer Bitcoin data
      const attestations = detached.timestamp.allAttestations();

      for (const att of attestations) {
        if (att instanceof BitcoinBlockHeaderAttestation) {
          return {
            confirmed: true,
            upgradedProof: Buffer.from(detached.serialize()).toString('hex'),
            bitcoinTxId: att.getTxId(), // Método depende de la lib
            blockHeight: att.height
          };
        }
      }
    }

    return { confirmed: false };
  } catch (error) {
    console.error('OTS verification error:', error);
    return { confirmed: false };
  }
}
```

### 2. Notificaciones por Email

Ubicación: `supabase/functions/process-bitcoin-anchors/index.ts` línea ~180

Actualmente:
```typescript
if (resendApiKey) {
  await sendEmail({
    to: userEmail,
    subject: 'Bitcoin Anchor Confirmed',
    // ...
  });
}
```

Mejora: Usar plantillas de email más completas con:
- Link al block explorer de Bitcoin
- Información del bloque y timestamp
- Instrucciones para verificar independientemente

### 3. Monitoreo y Alertas

Agregar métricas:
- Tiempo promedio de confirmación
- Tasa de fallos en OpenTimestamps
- Alertas si la cola `queued` crece demasiado

## Troubleshooting

### El anchor se queda en `queued`

**Posibles causas:**
1. El cron no está configurado o no se está ejecutando
2. `BITCOIN_OTS_CALENDAR` no está configurada o es incorrecta
3. El servicio OpenTimestamps está caído

**Solución:**
```bash
# Verificar cron
SELECT * FROM cron.job WHERE jobname = 'process-bitcoin-anchors';

# Verificar secreto
supabase secrets list | grep BITCOIN_OTS_CALENDAR

# Ejecutar manualmente para ver errores
supabase functions invoke process-bitcoin-anchors
supabase functions logs process-bitcoin-anchors
```

### El anchor se queda en `pending` por mucho tiempo

**Normal:** OpenTimestamps puede tardar 1-6 horas en anclar en Bitcoin (depende de cuándo se mine el siguiente bloque).

**Anormal:** Si pasa más de 24 horas:
```bash
# Ver logs
supabase functions logs process-bitcoin-anchors

# Verificar el proof manualmente en https://opentimestamps.org/
# Descarga el proof de la base de datos y súbelo ahí
```

### Error: "Invalid documentHash"

El hash debe ser exactamente 64 caracteres hexadecimales (SHA-256).

```javascript
// ✅ Correcto
const hash = await crypto.subtle.digest('SHA-256', data)
  .then(buf => Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(''));

// ❌ Incorrecto
const hash = "abc123"; // Muy corto
const hash = "xyz..."; // No hexadecimal
```

## Recursos

- [OpenTimestamps Website](https://opentimestamps.org/)
- [OpenTimestamps GitHub](https://github.com/opentimestamps/opentimestamps-client)
- [JavaScript OpenTimestamps](https://github.com/opentimestamps/javascript-opentimestamps)
- [Bitcoin Block Explorers](https://blockstream.info/)

## Contacto

Si encuentras problemas o tienes preguntas:
1. Revisa los logs: `supabase functions logs process-bitcoin-anchors`
2. Verifica el estado del cron: `SELECT * FROM cron.job_run_details`
3. Ejecuta el script de prueba: `./test-bitcoin-anchoring.sh`
