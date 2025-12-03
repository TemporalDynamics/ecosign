# 📊 Guía de Logging Estructurado y Monitorización - EcoSign

**Fecha**: 2025-12-01
**Objetivo**: Implementar logging consistente y alertas centralizadas en todas las Edge Functions

---

## 🎯 Problema Actual

**Antes**:
```typescript
console.log('TX sent:', tx.hash);
console.error('Error:', error);
console.warn('⚠️ Gas estimation failed');
```

**Problemas**:
- ❌ No estructurado (difícil de parsear)
- ❌ Sin contexto (¿qué usuario? ¿qué función?)
- ❌ No integrado con sistemas de monitoreo
- ❌ Difícil rastrear errores en producción

---

## ✅ Solución: Logging Estructurado

### **Características**

1. **JSON estructurado**: Fácil de parsear con herramientas
2. **Contexto automático**: Función, usuario, timestamp
3. **Niveles de log**: debug, info, warn, error
4. **Integración con Sentry**: Errores enviados automáticamente
5. **Performance tracking**: Medir duración de operaciones

---

## 📚 Uso Básico

### **1. Importar el Logger**

```typescript
import { createLogger, createLoggerWithRequest } from '../_shared/logger.ts';
```

### **2. Crear una instancia**

```typescript
// Opción 1: Logger simple
const logger = createLogger('anchor-polygon');

// Opción 2: Logger con contexto de request (recomendado)
serve(async (req) => {
  const logger = createLoggerWithRequest('anchor-polygon', req);
  // ...
});
```

### **3. Usar el logger**

```typescript
// Información general
logger.info('Transaction submitted', {
  txHash: tx.hash,
  documentHash: documentHash,
  sponsorAddress: sponsorAddress
});

// Advertencias
logger.warn('Gas estimation failed, proceeding anyway', {
  error: estimateError.message
});

// Errores
logger.error('Failed to anchor document', {
  error: error.message,
  documentHash: documentHash,
  userId: userId
});

// Debug (solo en desarrollo)
logger.debug('RPC response', { response: rpcData });
```

---

## 📝 Ejemplo Completo: anchor-polygon

**Antes**:
```typescript
serve(async (req) => {
  try {
    const body = await req.json();
    console.log('Received request for', body.documentHash);

    // ...

    const tx = await contract.anchorDocument(hashBytes32);
    console.log('TX sent:', tx.hash);

    return new Response(JSON.stringify({
      success: true,
      txHash: tx.hash
    }));
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

**Después (con logging estructurado)**:
```typescript
import { createLoggerWithRequest } from '../_shared/logger.ts';
import { sendToSentry, measurePerformance } from '../_shared/monitoring.ts';

serve(async (req) => {
  const logger = createLoggerWithRequest('anchor-polygon', req);

  try {
    const body = await req.json();

    logger.info('Anchoring request received', {
      documentHash: body.documentHash,
      userId: body.userId
    });

    // Medir performance
    const result = await measurePerformance(
      'polygon-anchor',
      async () => {
        // ... lógica de anclaje ...
        const tx = await contract.anchorDocument(hashBytes32);

        logger.info('Transaction submitted successfully', {
          txHash: tx.hash,
          documentHash: body.documentHash,
          sponsorAddress: sponsorAddress
        });

        return tx;
      },
      { documentHash: body.documentHash }
    );

    return new Response(JSON.stringify({
      success: true,
      txHash: result.hash
    }));

  } catch (error) {
    logger.error('Failed to anchor document', {
      error: error.message,
      stack: error.stack,
      documentHash: body?.documentHash
    });

    // Enviar a Sentry
    await sendToSentry(error, {
      function: 'anchor-polygon',
      documentHash: body?.documentHash
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## 🔍 Salida de Logs

### **Log de información**
```json
{
  "level": "info",
  "message": "Transaction submitted successfully",
  "timestamp": "2025-12-01T10:30:45.123Z",
  "context": {
    "function": "anchor-polygon",
    "userId": "a1b2c3d4-...",
    "email": "user@example.com",
    "requestId": "req-xyz-123"
  },
  "data": {
    "txHash": "0x5d1ce517a8e8816069ed1ab28807f86f7eda681119056ebf58a2575882deec6e",
    "documentHash": "a1b2c3d4e5f67890...",
    "sponsorAddress": "0x44da5bc78a316231af82Ec7dC1778b4041f6ff05"
  }
}
```

### **Log de error**
```json
{
  "level": "error",
  "message": "Failed to anchor document",
  "timestamp": "2025-12-01T10:30:50.456Z",
  "context": {
    "function": "anchor-polygon",
    "userId": "a1b2c3d4-...",
    "requestId": "req-xyz-123"
  },
  "data": {
    "error": "Insufficient POL for gas fees",
    "documentHash": "a1b2c3d4e5f67890...",
    "stack": "Error: Insufficient POL\n  at ..."
  }
}
```

---

## 🚨 Integración con Sentry

### **1. Configurar Sentry DSN**

```bash
# Obtener DSN desde https://sentry.io/settings/projects/your-project/keys/
supabase secrets set SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

### **2. Enviar errores automáticamente**

```typescript
import { sendToSentry } from '../_shared/monitoring.ts';

try {
  // ... código que puede fallar ...
} catch (error) {
  logger.error('Operation failed', { error: error.message });

  // Enviar a Sentry
  await sendToSentry(error, {
    function: 'my-function',
    userId: userId,
    documentId: documentId
  });

  throw error;
}
```

### **3. Enviar alertas críticas**

```typescript
import { sendCriticalAlert } from '../_shared/monitoring.ts';

// Cuando se detecta un problema crítico
if (balance < costWithMargin) {
  await sendCriticalAlert(
    'Polygon wallet low on POL',
    'Sponsor wallet has insufficient balance for gas fees',
    {
      currentBalance: balanceInPol,
      requiredBalance: requiredInPol,
      sponsorAddress: sponsorAddress
    }
  );
}
```

---

## ⏱️ Performance Tracking

### **Medir operaciones**

```typescript
import { measurePerformance } from '../_shared/monitoring.ts';

// Medir cuánto tarda una operación
const result = await measurePerformance(
  'fetch-bitcoin-block',
  async () => {
    return await fetch(`${mempoolApiUrl}/tx/${txid}`);
  },
  {
    txid: txid,
    provider: 'mempool.space'
  }
);

// Log automático:
// {
//   "type": "performance",
//   "operation": "fetch-bitcoin-block",
//   "durationMs": 234.56,
//   "timestamp": "2025-12-01T10:30:00.000Z",
//   "txid": "abc123...",
//   "provider": "mempool.space",
//   "success": true
// }
```

---

## 🎛️ Child Loggers (Contexto Anidado)

Para operaciones con múltiples pasos:

```typescript
const logger = createLogger('process-bitcoin-anchors');

// Crear child logger con contexto adicional
const anchorLogger = logger.child({
  anchorId: anchor.id,
  documentHash: anchor.document_hash
});

anchorLogger.info('Starting OTS verification');
anchorLogger.info('Calendar server responded', { server: 'alice.btc...' });
anchorLogger.info('Verification complete', { confirmed: true });
```

---

## 📊 Monitoreo en Producción

### **Visualizar logs en Supabase Dashboard**

1. Ir a **Logs Explorer** en Supabase Dashboard
2. Filtrar por función: `function == "anchor-polygon"`
3. Buscar errores: `level == "error"`
4. Ver métricas de performance: `type == "performance"`

### **Alertas recomendadas en Sentry**

1. **Error rate > 5%**: Alerta si más del 5% de requests fallan
2. **Response time > 10s**: Alerta si una función tarda más de 10s
3. **Specific errors**: Alerta para errores críticos como:
   - "Insufficient POL"
   - "All OTS calendars failed"
   - "Database connection failed"

---

## 📋 Checklist de Migración

Para migrar una función existente:

- [ ] Importar `createLogger` o `createLoggerWithRequest`
- [ ] Reemplazar `console.log` con `logger.info`
- [ ] Reemplazar `console.warn` con `logger.warn`
- [ ] Reemplazar `console.error` con `logger.error`
- [ ] Agregar `sendToSentry` en catch blocks
- [ ] Envolver operaciones críticas con `measurePerformance`
- [ ] Agregar `sendCriticalAlert` para condiciones críticas
- [ ] Testear que los logs se vean correctamente en Dashboard

---

## 🚀 Próximos Pasos

### **Fase 1: Implementación básica** (Ahora)
- ✅ Crear módulos de logging y monitoring
- ⏳ Migrar 1-2 funciones críticas como ejemplo
- ⏳ Configurar Sentry DSN

### **Fase 2: Rollout completo** (Próximas semanas)
- ⏳ Migrar todas las Edge Functions
- ⏳ Configurar alertas en Sentry
- ⏳ Crear dashboard de métricas

### **Fase 3: Optimización** (Largo plazo)
- ⏳ Integrar con Datadog/New Relic para métricas avanzadas
- ⏳ Crear dashboards personalizados
- ⏳ Configurar auto-scaling basado en métricas

---

## 💡 Tips y Mejores Prácticas

1. **Usa niveles apropiados**:
   - `debug`: Solo para desarrollo, información muy detallada
   - `info`: Operaciones normales (TX enviadas, emails enviados)
   - `warn`: Problemas no críticos (fallbacks usados, retries)
   - `error`: Fallos que requieren atención

2. **Incluye contexto útil**:
   ```typescript
   // ❌ Mal
   logger.error('Failed');

   // ✅ Bien
   logger.error('Failed to anchor document', {
     error: err.message,
     documentHash: hash,
     userId: userId,
     attempt: 3
   });
   ```

3. **No logees información sensible**:
   ```typescript
   // ❌ MAL - nunca logear claves privadas o tokens
   logger.info('Using key', { privateKey: key });

   // ✅ Bien - solo logear direcciones públicas
   logger.info('Using sponsor', { sponsorAddress: address });
   ```

4. **Usa child loggers para operaciones largas**:
   - Evita repetir contexto en cada log
   - Más fácil rastrear flujos completos

---

## 🔗 Referencias

- [Supabase Logs Explorer](https://supabase.com/docs/guides/platform/logs)
- [Sentry Documentation](https://docs.sentry.io/)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)
