# DIAGNÓSTICO: POLYGON ANCHORING NO FUNCIONA DESDE DEC 1, 2025

**Fecha:** 2026-01-10
**Status:** 🔴 INVESTIGACIÓN EN PROGRESO
**Síntoma:** Polygon anchoring funcionó el 1 de diciembre, 2025. Desde entonces no se crean anchors a pesar de proteger muchos documentos.

---

## 🔍 HALLAZGOS DE LA INVESTIGACIÓN

### 1. ✅ Código de Stamping Existe y Está Completo

**Archivos verificados:**
- ✅ `supabase/functions/_legacy/anchor-polygon/index.ts` - Edge Function que envía tx a Polygon
- ✅ `supabase/functions/_legacy/process-polygon-anchors/index.ts` - Worker que confirma tx
- ✅ `client/src/lib/polygonAnchor.ts` - Client wrapper
- ✅ `client/src/utils/documentStorage.ts` - Lógica de `polygon_status='pending'`

### 2. ✅ Configuración por Defecto es Correcta

**`client/src/components/LegalCenterModalV2.tsx:235-241`**
```typescript
const [forensicEnabled, setForensicEnabled] = useState(true);
const [forensicConfig, setForensicConfig] = useState<ForensicConfig>({
  useLegalTimestamp: true,    // RFC 3161 TSA
  usePolygonAnchor: true,      // ← ✅ TRUE POR DEFECTO
  useBitcoinAnchor: true       // Bitcoin
});
```

**`client/src/utils/documentStorage.ts:261`**
```typescript
const polygonStatus = hasPolygonAnchor ? 'pending' : null;
```

**`client/src/components/LegalCenterModalV2.tsx:1462`**
```typescript
const savedDoc = await saveUserDocument(fileToProcess, ecoData, {
  hasPolygonAnchor: forensicEnabled && forensicConfig.usePolygonAnchor, // ← ✅ DEBERÍA SER TRUE
  // ...
});
```

**Conclusión:** El frontend DEBERÍA estar guardando `polygon_status='pending'` en cada certificación.

### 3. 🔴 Arquitectura Cambió a 100% Server-Side

**`client/src/components/LegalCenterModalV2.tsx:1556-1561`**
```typescript
// ✅ ARCHITECTURE: Blockchain anchoring ahora es 100% server-side
// - Polygon: process-polygon-anchors worker (cron 30s) detecta polygon_status='pending'
// - Bitcoin: process-bitcoin-anchors worker (cron 1h) detecta bitcoin_status='pending'
// - Workers llaman upgrade_protection_level() tras confirmación
// - UI refleja cambios vía realtime subscription (líneas 318-376)
// - NO más triggers frontend - confiabilidad server-side garantizada
```

**Flujo esperado:**
```
1. Usuario protege documento
   ↓
2. saveUserDocument() guarda con polygon_status='pending'
   ↓
3. Cron job cada 1 minuto invoca process-polygon-anchors
   ↓
4. Worker detecta polygon_status='pending' en user_documents
   ↓
5. Worker crea registro en tabla 'anchors'
   ↓
6. Worker invoca anchor-polygon Edge Function
   ↓
7. Edge Function envía tx a Polygon
   ↓
8. Worker confirma tx y actualiza a polygon_status='confirmed'
```

### 4. ⚠️ Posibles Puntos de Falla

Basado en la arquitectura, el problema puede estar en:

**Opción A: Cron job NO está configurado**
- El cron job `process-polygon-anchors` no existe en la DB
- SQL Script: `scripts/setup-all-crons.sql` (líneas 10-21)
- **Verificación:** `SELECT * FROM cron.job WHERE jobname = 'process-polygon-anchors';`

**Opción B: Cron job está inactivo**
- El cron job existe pero `active = false`
- **Verificación:** `SELECT jobname, active FROM cron.job WHERE jobname = 'process-polygon-anchors';`

**Opción C: Cron job falla silenciosamente**
- El cron job se ejecuta pero genera errores
- **Verificación:** `SELECT * FROM cron.job_run_details WHERE jobname = 'process-polygon-anchors' ORDER BY start_time DESC LIMIT 20;`

**Opción D: Edge Function no está deployada**
- La función `process-polygon-anchors` no existe en Supabase
- **Verificación:** `supabase functions list --project-ref uiyojopjbhooxrmamaiw`

**Opción E: RPC URL o variables de entorno cambiaron**
- `POLYGON_RPC_URL` o `POLYGON_SPONSOR_PRIVATE_KEY` no están configurados
- **Verificación:** `supabase secrets list --project-ref uiyojopjbhooxrmamaiw`

**Opción F: Frontend NO está guardando polygon_status='pending'**
- Algún código sobreescribe la configuración o hay un bug
- **Verificación:** Ver documentos recientes en DB

---

## 🔧 PLAN DE DIAGNÓSTICO

### PASO 1: Ejecutar Query de Diagnóstico

**Archivo:** `scripts/diagnose-polygon-anchoring.sql`

Ejecutar en **Supabase Dashboard → SQL Editor**:

```bash
# Copiar el contenido de scripts/diagnose-polygon-anchoring.sql
# Pegarlo en SQL Editor
# Ejecutar
```

Este script verifica:
1. ✅ Cron jobs configurados y activos
2. ✅ Historial de ejecuciones del cron
3. ✅ Documentos con `polygon_status='pending'`
4. ✅ Registros en tabla `anchors`
5. ✅ Últimos anchors creados
6. ✅ Distribución de documentos por fecha
7. ✅ Configuración forensicConfig en documentos recientes

### PASO 2: Revisar Logs de Edge Function

```bash
# Ver logs de process-polygon-anchors (últimos 100)
supabase functions logs process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  --tail 100

# Filtrar solo errores
supabase functions logs process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  | grep -i error
```

### PASO 3: Verificar que Edge Function está deployada

```bash
supabase functions list --project-ref uiyojopjbhooxrmamaiw
```

**Esperado:** Debe aparecer `process-polygon-anchors` en la lista.

### PASO 4: Invocar Edge Function manualmente

```bash
supabase functions invoke process-polygon-anchors \
  --project-ref uiyojopjbhooxrmamaiw
```

**Esperado:** Debería procesar documentos pendientes (si existen).

### PASO 5: Verificar Variables de Entorno

```bash
supabase secrets list --project-ref uiyojopjbhooxrmamaiw
```

**Esperado:** Deben existir:
- `POLYGON_RPC_URL`
- `POLYGON_SPONSOR_PRIVATE_KEY`
- `POLYGON_CONTRACT_ADDRESS`

---

## 🎯 HIPÓTESIS PRINCIPAL

> **"El código de anchoring no se está ejecutando"** (Hypothesis #1 del usuario)

Basado en la arquitectura server-side, la causa más probable es:

**🔴 El cron job NO está configurado o NO está activo**

**Por qué:**
- El script `setup-all-crons.sql` existe pero debe ejecutarse MANUALMENTE en Supabase Dashboard
- No hay deploy automático de cron jobs
- Si el cron job no existe, los workers NUNCA se ejecutan
- Los documentos quedan con `polygon_status='pending'` para siempre

**Evidencia que lo confirmaría:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-polygon-anchors';
-- Si resultado es vacío → CRON NO CONFIGURADO ✅ Confirmed
```

---

## 🚀 SOLUCIÓN PROBABLE

Si el diagnóstico confirma que el cron job no está configurado:

### 1. Ejecutar setup-all-crons.sql

**Dashboard Supabase → SQL Editor:**
```sql
-- Copiar SOLO la sección de process-polygon-anchors
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

### 2. Verificar que quedó activo

```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'process-polygon-anchors';
```

**Esperado:** `active = true`

### 3. Esperar 1-2 minutos y verificar ejecución

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'process-polygon-anchors'
ORDER BY start_time DESC
LIMIT 5;
```

**Esperado:** Ver ejecuciones recientes con `status = 'succeeded'`

### 4. Verificar que documentos pendientes se procesan

```sql
-- ANTES (debería haber documentos pendientes)
SELECT COUNT(*) FROM user_documents WHERE polygon_status = 'pending';

-- DESPUÉS de 2-3 minutos (deberían procesarse)
SELECT COUNT(*) FROM user_documents WHERE polygon_status = 'pending';
-- Debería ser 0 o mucho menor

-- Ver anchors creados
SELECT * FROM anchors WHERE chain_type = 'polygon' ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 DATOS CONOCIDOS

**Último anchor exitoso:** Dec 1, 2025 (según screenshot del usuario)

**TX Hash exitosa:** `0x1286ab12f55d98ea54bcb49e97604f35a99c1adb2afdd9e03b5a3dc0e8b05e01`

**Documentos protegidos desde entonces:** Muchos (según usuario)

**Polygon status de esos documentos:** Probablemente `pending` (a verificar con diagnóstico)

---

## 🔄 PRÓXIMOS PASOS

1. ✅ Ejecutar `scripts/diagnose-polygon-anchoring.sql` en Supabase Dashboard
2. ✅ Revisar logs de `process-polygon-anchors`
3. ✅ Verificar que Edge Function está deployada
4. ⚠️ **Si cron no existe:** Ejecutar `setup-all-crons.sql`
5. ⚠️ **Si cron existe pero falla:** Revisar logs de errores
6. ⚠️ **Si Edge Function no existe:** Deploy manual desde `supabase/functions/_legacy/process-polygon-anchors/`

---

## 📚 REFERENCIAS

- `scripts/setup-all-crons.sql` - Configuración de cron jobs
- `supabase/functions/_legacy/process-polygon-anchors/index.ts` - Worker de confirmación
- `supabase/functions/_legacy/anchor-polygon/index.ts` - Edge Function de anchoring
- `client/src/utils/documentStorage.ts:261` - Lógica de `polygon_status='pending'`
- `client/src/components/LegalCenterModalV2.tsx:1556-1561` - Comentario sobre arquitectura server-side

---

**Última actualización:** 2026-01-10
**Investigador:** Claude Code
**Usuario:** Manu
