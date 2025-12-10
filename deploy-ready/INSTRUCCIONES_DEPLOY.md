# 🚀 INSTRUCCIONES DE DEPLOY MANUAL - EDGE FUNCTIONS

## 📋 Archivos Listos para Deploy

En esta carpeta tienes 4 archivos `.ts` listos para copiar y pegar en el dashboard de Supabase:

1. `anchor-bitcoin.ts` (5.5 KB)
2. `anchor-polygon.ts` (5.3 KB)
3. `process-bitcoin-anchors.ts` (25 KB)
4. `process-polygon-anchors.ts` (7.3 KB)

---

## 🔧 PASO A PASO

### 1️⃣ Acceder al Dashboard de Supabase

```
https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions
```

*(Reemplaza con tu project ID si es diferente)*

---

### 2️⃣ Deploy de anchor-bitcoin

1. En el dashboard, busca la función `anchor-bitcoin` en la lista
2. Click en el nombre para editarla
3. Borra todo el código actual
4. Abre el archivo `anchor-bitcoin.ts` de esta carpeta
5. Copia TODO el contenido (Ctrl+A, Ctrl+C)
6. Pega en el editor del dashboard (Ctrl+V)
7. Click en **"Deploy"** o **"Save"**

**Cambios principales en esta función:**
- ✅ Marca `overall_status='pending_anchor'` al encolar
- ✅ Garantiza `document_id` y `user_email` para notificaciones
- ✅ Marca `download_enabled=false` mientras Bitcoin procesa

---

### 3️⃣ Deploy de anchor-polygon

1. En el dashboard, busca la función `anchor-polygon`
2. Click en el nombre para editarla
3. Borra todo el código actual
4. Abre el archivo `anchor-polygon.ts` de esta carpeta
5. Copia TODO el contenido
6. Pega en el editor del dashboard
7. Click en **"Deploy"**

**Cambios principales:**
- ✅ Garantiza `document_id` y `user_email` para notificaciones

---

### 4️⃣ Deploy de process-polygon-anchors

1. En el dashboard, busca la función `process-polygon-anchors`
2. Click en el nombre para editarla
3. Borra todo el código actual
4. Abre el archivo `process-polygon-anchors.ts` de esta carpeta
5. Copia TODO el contenido
6. Pega en el editor del dashboard
7. Click en **"Deploy"**

**Cambios principales:**
- ✅ Actualiza `user_documents.has_polygon_anchor=true`
- ✅ Marca `overall_status='certified'` (Política 1)
- ✅ Habilita `download_enabled=true` inmediatamente

---

### 5️⃣ Deploy de process-bitcoin-anchors (IMPORTANTE)

1. En el dashboard, busca la función `process-bitcoin-anchors`
2. Click en el nombre para editarla
3. Borra todo el código actual
4. Abre el archivo `process-bitcoin-anchors.ts` de esta carpeta
5. Copia TODO el contenido
6. Pega en el editor del dashboard
7. Click en **"Deploy"**

**Cambios principales:**
- ✅ `MAX_VERIFY_ATTEMPTS = 288` (24 horas)
- ✅ Alertas a las 20 horas
- ✅ **Política 1**: Si Bitcoin falla pero Polygon está OK → `overall_status='certified'`
- ✅ Si ambos fallan → `overall_status='failed'`

---

## ⚠️ IMPORTANTE: Variables de Entorno

Antes de deployar, verifica que estas variables estén configuradas en:
**Dashboard → Settings → Edge Functions → Secrets**

### Para Polygon:
```
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/...
POLYGON_PRIVATE_KEY=0x...
POLYGON_CONTRACT_ADDRESS=0x...
```

### Para Bitcoin:
```
MEMPOOL_API_URL=https://mempool.space/api (opcional)
```

### Para Email:
```
RESEND_API_KEY=re_...
DEFAULT_FROM=EcoSign <no-reply@email.ecosign.app> (opcional)
```

### Para Supabase:
```
SUPABASE_URL=https://... (automático)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (automático)
```

---

## ✅ VERIFICACIÓN POST-DEPLOY

Después de deployar las 4 funciones:

### 1. Verificar que los crons están activos

En el dashboard: **Database → Cron Jobs**

Debe haber estos crons activos:
- `process-polygon-anchors` - Cada 1 minuto (`*/1 * * * *`)
- `process-bitcoin-anchors` - Cada 5 minutos (`*/5 * * * *`)

Si no están, ejecuta desde SQL Editor:
```sql
-- Ver crons existentes
SELECT jobname, schedule, active
FROM cron.job
ORDER BY jobname;
```

### 2. Ver logs en tiempo real

Dashboard → Edge Functions → [Nombre de función] → Logs

Busca estos mensajes:
- ✅ "Document {id} certified with Polygon"
- ✅ "Anchor {id} has been pending for..."
- ⚠️ Warnings de Bitcoin >20 horas
- ❌ Errores si algo falla

### 3. Testing básico

Desde la UI de EcoSign:
1. Firma un documento
2. Inicia certificación/blindaje
3. Espera 30-60 segundos
4. Verifica que:
   - Estado cambia a "Certificado"
   - Puede descargar .ECO
   - Timeline muestra Polygon OK

---

## 🎯 RESUMEN DE LOS CAMBIOS

### Arquitectura de Estados (Política 1 - Mínimo garantizado)

```
Usuario inicia certificación
         ↓
    overall_status = 'pending_anchor'
    download_enabled = false
         ↓
    [30-60 segundos]
         ↓
    Polygon confirma ✅
         ↓
    overall_status = 'certified'
    download_enabled = true
         ↓
    Usuario puede descargar .ECO
         ↓
    [4-24 horas después]
         ↓
    ┌───────────────┬────────────────┐
    ↓               ↓                ↓
Bitcoin ✅      Bitcoin ❌      Bitcoin ❌
                Polygon ✅       Polygon ❌

overall =       overall =        overall =
'certified'     'certified'      'failed'
(sin cambios)   (sin cambios)
```

### Mensajes al Usuario

**Cuando Polygon confirma:**
> ✅ Tu certificado está listo
>
> Tu documento ya está protegido y sellado legalmente.
> Puedes descargar tu archivo .ECO ahora mismo.
>
> 🔄 Protección adicional en proceso (opcional)
> La verificación en la red Bitcoin continúa en segundo plano.

**Cuando Bitcoin confirma:**
> 🚀 Protección reforzada completada
>
> Tu certificado ahora incluye verificación en la red Bitcoin.

**Cuando Bitcoin falla:**
> ✅ Tu certificado está listo y es completamente válido
>
> La verificación opcional en Bitcoin no se completó,
> pero tu certificado sigue siendo válido con Polygon.

---

## 🆘 TROUBLESHOOTING

### Problema: No se actualizan los estados

**Causa:** Crons no activos o variables de entorno faltantes

**Solución:**
1. Verifica crons en Dashboard → Database → Cron Jobs
2. Verifica variables en Dashboard → Settings → Edge Functions → Secrets
3. Revisa logs de las funciones

### Problema: Bitcoin siempre falla

**Causa:** MAX_VERIFY_ATTEMPTS muy bajo (era 30, ahora es 288)

**Solución:**
- Verifica que se deployó `process-bitcoin-anchors.ts` con `MAX_VERIFY_ATTEMPTS = 288`
- Revisa logs para ver si llega a los 24 hours

### Problema: No se pueden descargar .ECO

**Causa:** `download_enabled` sigue en `false`

**Solución:**
- Verifica que se deployó `process-polygon-anchors.ts` con el update de `download_enabled: true`
- Verifica en DB: `SELECT download_enabled FROM user_documents WHERE id = '...'`

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa los logs en Dashboard → Edge Functions → Logs
2. Ejecuta queries SQL de diagnóstico (ver abajo)
3. Contacta a soporte

### Queries de diagnóstico:

```sql
-- Ver estado de documentos recientes
SELECT
  id,
  file_name,
  overall_status,
  bitcoin_status,
  has_polygon_anchor,
  download_enabled,
  created_at
FROM user_documents
ORDER BY created_at DESC
LIMIT 10;

-- Ver anchors pendientes
SELECT
  id,
  anchor_type,
  anchor_status,
  bitcoin_attempts,
  polygon_attempts,
  created_at
FROM anchors
WHERE anchor_status IN ('pending', 'queued', 'processing')
ORDER BY created_at DESC;

-- Ver crons activos
SELECT
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;
```

---

¡Listo para deployar! 🚀
