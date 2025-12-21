# 🎯 Implementación Server-Side: Blockchain Anchoring

**Fecha**: 2025-12-21  
**Objetivo**: Migrar anchoring de Polygon y Bitcoin de cliente a servidor

---

## ✅ Cambios Completados

### 1. Cliente - Código Eliminado
**Archivo**: `client/src/utils/documentStorage.ts`

**Removido** (-92 líneas):
- Invocaciones a `anchor-polygon` edge function
- Invocaciones a `anchor-bitcoin` edge function
- Manejo de errores HTTP 500
- Logs confusos en consola del usuario

**Agregado** (+16 líneas):
- Comentario documentando arquitectura server-side
- Referencia a migration SQL

**Resultado**:
```typescript
// Cliente solo guarda documento con status='pending'
// Database trigger se encarga del resto
// ✅ No más errores HTTP 500 en consola
// ✅ No más dependencia de cliente conectado
```

### 2. Database Trigger - Implementado
**Archivo**: `supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql`

**Funcionalidad**:
- Detecta INSERT en `user_documents` con `polygon_status='pending'` o `bitcoin_status='pending'`
- Invoca edge functions automáticamente usando `pg_net.http_post()`
- Corre con privilegios `SECURITY DEFINER` (acceso service role)
- Manejo de errores con `RAISE WARNING` (no bloquea certificación)

**Ventajas**:
- ✅ Funciona incluso si usuario cierra navegador
- ✅ Errores internos, no visibles al usuario
- ✅ Retry automático via edge function logic
- ✅ Separación limpia: cliente certifica, servidor ancla

### 3. App Settings - Configuración
**Archivo**: `supabase/migrations/20251221100001_configure_app_settings.sql`

**Requiere configuración MANUAL** (por seguridad):
```sql
-- 1. Configurar URL (ya configurado en migration)
ALTER DATABASE postgres SET app.settings.supabase_url = 
  'https://uiyojopjbhooxrmamaiw.supabase.co';

-- 2. Configurar Service Role Key (⚠️ MANUAL, SECRETO)
-- Obtener de: Supabase Dashboard > Project Settings > API > service_role
ALTER DATABASE postgres SET app.settings.service_role_key = 
  'eyJhbG...TU_SERVICE_ROLE_KEY_AQUI';
```

### 4. Recovery Cron - Safety Net
**Archivo**: `supabase/migrations/20251221100002_orphan_recovery_cron.sql`

**Funcionalidad**:
- Detecta "documentos huérfanos" (pending sin anchor en tabla `anchors`)
- Se ejecuta cada 5 minutos
- Solo procesa documentos <2 horas de antigüedad
- Límite de 10 documentos por run (evita sobrecarga)

**Casos cubiertos**:
- Trigger falló por algún motivo
- Edge function devolvió error temporal
- Timeout durante invocación inicial

---

## 📋 Pasos de Deployment

### Paso 1: Aplicar Migraciones
```bash
cd /home/manu/dev/ecosign

# Aplicar las 3 migraciones
supabase db push

# Verificar que se aplicaron correctamente
supabase db diff
```

### Paso 2: Configurar App Settings (MANUAL)
```bash
# 1. Ir a Supabase Dashboard
# 2. SQL Editor
# 3. Ejecutar:

ALTER DATABASE postgres SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY_AQUI';

# 4. Verificar:
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';

# Debe mostrar:
# app.settings.supabase_url          | https://uiyojopjbhooxrmamaiw.supabase.co
# app.settings.service_role_key      | eyJhbG... (parcial)
```

**⚠️ Obtener service_role_key**:
1. Supabase Dashboard
2. Project Settings
3. API
4. Sección "Project API keys"
5. Copiar `service_role` (NO `anon`)

### Paso 3: Verificar Extension pg_net
```sql
-- En SQL Editor, verificar que pg_net está habilitado
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Si NO aparece, habilitar:
CREATE EXTENSION pg_net;
```

### Paso 4: Deploy Frontend (sin anchoring)
```bash
# Build del cliente con código limpio
cd client
npm run build

# Deploy a Vercel
vercel --prod
```

---

## 🧪 Testing Plan

### Test 1: Certificación Básica (Solo TSA)
```
1. Ir a /inicio
2. Certificar documento SIN Polygon NI Bitcoin
3. Verificar:
   ✅ Certificación completa sin errores
   ✅ No aparecen logs de Polygon/Bitcoin
   ✅ Estado: "Protección Certificada (TSA)"
```

### Test 2: Certificación con Polygon
```
1. Certificar documento CON Polygon activado
2. Verificar en browser console:
   ✅ No aparece "🔗 Requesting Polygon anchor"
   ✅ No aparece "❌ Polygon anchoring failed"
   ✅ Certificación completa inmediatamente
3. Esperar 30 segundos
4. Refrescar página de Documentos
5. Verificar estado cambió a "Protección Reforzada"
```

### Test 3: Verificar Trigger Funciona
```sql
-- En SQL Editor después de certificar:

-- 1. Verificar que documento se creó con pending
SELECT id, document_name, polygon_status, bitcoin_status 
FROM user_documents 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Verificar que trigger creó anchor
SELECT a.id, a.anchor_type, a.anchor_status, a.polygon_status
FROM anchors a
JOIN user_documents ud ON a.user_document_id = ud.id
WHERE ud.id = 'DOCUMENT_ID_DEL_PASO_1'
ORDER BY a.created_at DESC;

-- Debe mostrar anchor(s) creados por trigger
```

### Test 4: Verificar Logs del Trigger
```sql
-- Ver logs de PostgreSQL (si están habilitados)
-- Buscar mensajes tipo:
-- NOTICE: Polygon anchor triggered for document <UUID>: request_id=<ID>
-- NOTICE: Bitcoin anchor triggered for document <UUID>: request_id=<ID>
```

### Test 5: Cerrar Navegador Antes de Confirmar
```
1. Certificar documento con Polygon
2. CERRAR NAVEGADOR inmediatamente
3. Esperar 2 minutos
4. Abrir navegador, ir a Documentos
5. Verificar:
   ✅ Documento existe
   ✅ Estado "Protección Reforzada" (Polygon confirmó)
   
Esto prueba que anchoring NO depende del cliente
```

---

## 🔍 Troubleshooting

### Problema: Trigger no se dispara

**Síntoma**: Documento queda en `pending` eternamente, no se crea anchor

**Causas posibles**:
1. App settings no configurados
2. Extension pg_net no habilitada
3. Trigger no creado correctamente

**Debug**:
```sql
-- 1. Verificar trigger existe
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'user_documents'::regclass 
  AND tgname = 'on_user_documents_blockchain_anchoring';

-- 2. Verificar función existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'trigger_blockchain_anchoring';

-- 3. Verificar settings
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';

-- 4. Test manual del trigger
SELECT trigger_blockchain_anchoring();
```

### Problema: Edge function retorna 500

**Síntoma**: Logs muestran `WARNING: Failed to trigger Polygon anchor`

**Causas posibles**:
1. Service role key incorrecto
2. Edge function no deployed
3. Secrets faltantes (POLYGON_RPC_URL, etc)

**Debug**:
```bash
# 1. Verificar edge functions deployed
supabase functions list

# 2. Ver logs de edge function
supabase functions logs anchor-polygon --tail 50

# 3. Verificar secrets
supabase secrets list
```

### Problema: Recovery cron no corre

**Síntoma**: Documentos huérfanos no se recuperan

**Debug**:
```sql
-- Verificar cron job existe
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'recover-orphan-anchors';

-- Ver logs de cron jobs (si disponibles)
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'recover-orphan-anchors')
ORDER BY start_time DESC 
LIMIT 10;

-- Ejecutar manualmente
SELECT detect_and_recover_orphan_anchors();
```

---

## 📊 Métricas de Éxito

Después de 24 horas en producción:

### ✅ Cliente
- [ ] 0 errores HTTP 500 de anchoring en Sentry
- [ ] 0 logs rojos de Polygon/Bitcoin en console
- [ ] Certificaciones completas <3 segundos (sin esperar blockchain)

### ✅ Server-Side
- [ ] 100% de documentos con `pending` tienen anchor en tabla `anchors`
- [ ] 0 documentos huérfanos >5 minutos de antigüedad
- [ ] Polygon confirma en <2 minutos (promedio)
- [ ] Bitcoin pasa a `pending` en <10 minutos

### Query para validar:
```sql
-- Documentos sin anchor (deben ser 0 después de 5 min)
SELECT COUNT(*) as orphan_count
FROM user_documents ud
LEFT JOIN anchors a ON a.user_document_id = ud.id
WHERE (ud.polygon_status = 'pending' OR ud.bitcoin_status = 'pending')
  AND a.id IS NULL
  AND ud.created_at < NOW() - INTERVAL '5 minutes';

-- Debe retornar: orphan_count = 0
```

---

## 💬 Resumen Ejecutivo

### Antes (Cliente)
```
❌ Errores HTTP 500 visibles al usuario
❌ Dependencia de cliente conectado
❌ Logs confusos durante certificación
❌ Timeouts bloquean UX
```

### Después (Servidor)
```
✅ Certificación completa en <3s (solo TSA)
✅ Anchoring asíncrono server-side
✅ Errores internos, no visibles
✅ Recovery automático si falla
✅ Usuario puede cerrar navegador
```

### Arquitectura Final
```
Usuario certifica
  ↓
Cliente guarda documento (polygon_status='pending')
  ↓
[FIN ROL CLIENTE] ← Usuario cierra navegador
  ↓
Database Trigger detecta INSERT
  ↓
Trigger invoca anchor-polygon edge function
  ↓
Edge function crea registro en anchors
  ↓
Worker process-polygon-anchors procesa
  ↓
Blockchain confirma → upgrade_protection_level()
  ↓
Realtime subscription actualiza UI (si está abierta)
```

**Estado del documento en cada fase**:
1. Post-certificación: "Protección Certificada (TSA)"
2. Post-Polygon (~60s): "Protección Reforzada"
3. Post-Bitcoin (4-24h): "Protección Total"

---

**Próximo paso**: Aplicar migraciones y testear flujo completo 🚀
