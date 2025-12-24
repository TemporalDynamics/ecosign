# 🚨 Manual Deployment Steps - Server-Side Anchoring

## ✅ Estado Actual

### Migraciones Aplicadas
- ✅ `20251221100000_blockchain_anchoring_trigger.sql` - **APLICADO**
  - Extension `pg_net` habilitada
  - Función `trigger_blockchain_anchoring()` creada
  - Trigger `on_user_documents_blockchain_anchoring` creado

### Migraciones Pendientes (Requieren Dashboard)
- ⏳ `20251221100001_configure_app_settings.sql` - **PENDIENTE**
  - Requiere privilegios de superadmin
  - Debe ejecutarse manualmente en Supabase Dashboard

- ⏳ `20251221100002_orphan_recovery_cron.sql` - **PENDIENTE**
  - Requiere extensión `pg_cron`
  - Debe ejecutarse manualmente en Supabase Dashboard

---

## 📋 Pasos Manuales (5 minutos)

### Paso 1: Configurar App Settings

**Ubicación**: Supabase Dashboard > SQL Editor

**SQL a ejecutar**:
```sql
-- 1. Configurar Supabase URL (ya conocida)
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uiyojopjbhooxrmamaiw.supabase.co';

-- 2. Configurar Service Role Key
-- ⚠️ IMPORTANTE: Copiar desde Project Settings > API > service_role key
ALTER DATABASE postgres SET app.settings.service_role_key = 'TU_SERVICE_ROLE_KEY_AQUI';

-- 3. Verificar configuración
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';

-- Debe mostrar:
-- app.settings.supabase_url          | https://uiyojopjbhooxrmamaiw.supabase.co
-- app.settings.service_role_key      | eyJhbG... (parcial)
```

**¿Dónde obtener el Service Role Key?**
1. Ir a Supabase Dashboard
2. Navegar a **Project Settings** (ícono de engranaje)
3. Ir a **API**
4. Sección **Project API keys**
5. Copiar el key `service_role` (NO el `anon`)
6. Pegarlo en el SQL de arriba

---

### Paso 2: Crear Cron Job de Recuperación

**Ubicación**: Supabase Dashboard > SQL Editor

**SQL a ejecutar** (copiar desde `supabase/migrations/20251221100002_orphan_recovery_cron.sql`):

```sql
-- Habilitar pg_cron si no está activo
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear función de recuperación
CREATE OR REPLACE FUNCTION detect_and_recover_orphan_anchors()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
-- [CÓDIGO COMPLETO EN EL ARCHIVO DE MIGRACIÓN]
$$;

-- Crear cron job (cada 5 minutos)
SELECT cron.schedule(
  'recover-orphan-anchors',
  '*/5 * * * *',
  $$SELECT detect_and_recover_orphan_anchors();$$
);
```

---

### Paso 3: Verificar Todo Funcionando

**3.1 Verificar trigger existe**:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'user_documents'::regclass 
  AND tgname = 'on_user_documents_blockchain_anchoring';

-- Debe retornar: on_user_documents_blockchain_anchoring | O (enabled)
```

**3.2 Verificar app settings**:
```sql
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';

-- Debe mostrar ambos settings configurados
```

**3.3 Verificar cron job**:
```sql
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'recover-orphan-anchors';

-- Debe retornar: recover-orphan-anchors | */5 * * * * | t
```

---

## 🧪 Testing Manual Post-Deploy

### Test 1: Certificar Documento Real

1. Ir a la aplicación web
2. Certificar un documento con Polygon activado
3. **Esperar 5 segundos** (tiempo de trigger + edge function)

### Test 2: Verificar Trigger Creó Anchor

```sql
-- Obtener último documento
SELECT id, document_name, polygon_status, bitcoin_status, created_at
FROM user_documents 
ORDER BY created_at DESC 
LIMIT 1;

-- Copiar el ID del documento de arriba
-- Verificar que trigger creó anchor
SELECT a.id, a.anchor_type, a.anchor_status, a.created_at
FROM anchors a
WHERE a.user_document_id = 'PEGAR_ID_AQUI';

-- Debe mostrar 1-2 anchors (Polygon y/o Bitcoin) con status='pending'
```

### Test 3: Esperar Confirmación Polygon (~60s)

```sql
-- Esperar 60 segundos
-- Verificar que Polygon confirmó
SELECT 
  id,
  document_name,
  polygon_status,
  protection_level,
  polygon_confirmed_at
FROM user_documents 
WHERE id = 'PEGAR_ID_DOCUMENTO';

-- Debe mostrar:
-- polygon_status: 'confirmed'
-- protection_level: 'REINFORCED'
-- polygon_confirmed_at: timestamp reciente
```

---

## ✅ Checklist Completo

- [ ] **Paso 1**: App settings configurados (Supabase URL + Service Role Key)
- [ ] **Paso 2**: Cron job creado (`recover-orphan-anchors`)
- [ ] **Paso 3.1**: Trigger verificado (existe y está enabled)
- [ ] **Paso 3.2**: App settings verificados (ambos presentes)
- [ ] **Paso 3.3**: Cron job verificado (activo)
- [ ] **Test 1**: Documento certificado con Polygon
- [ ] **Test 2**: Anchor creado en tabla `anchors` (~5s)
- [ ] **Test 3**: Polygon confirmado + protection_level=REINFORCED (~60s)

---

## 🚨 Troubleshooting

### Error: "Trigger no crea anchors"

**Diagnóstico**:
```sql
-- Verificar que app settings están configurados
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.settings.%';
```

**Solución**: Volver a Paso 1 y configurar app settings.

### Error: "Polygon no confirma"

**Diagnóstico**:
```sql
-- Ver logs de anchor
SELECT 
  anchor_status,
  error_message,
  created_at,
  updated_at
FROM anchors 
WHERE anchor_type = 'polygon'
ORDER BY created_at DESC 
LIMIT 5;
```

**Posibles causas**:
1. Wallet sin fondos POL
2. RPC URL incorrecta
3. Contract address incorrecto
4. Service role key incorrecto

**Solución**: Verificar variables en Supabase Secrets.

### Error: "Cron job no corre"

**Diagnóstico**:
```sql
-- Verificar cron job existe
SELECT * FROM cron.job WHERE jobname = 'recover-orphan-anchors';

-- Ejecutar manualmente
SELECT detect_and_recover_orphan_anchors();
```

**Solución**: Si no existe, volver a Paso 2.

---

## 📊 Métricas de Éxito (24h post-deploy)

```sql
-- Documentos huérfanos (debe ser 0)
SELECT COUNT(*) as orphan_count
FROM user_documents ud
LEFT JOIN anchors a ON a.user_document_id = ud.id
WHERE (ud.polygon_status = 'pending' OR ud.bitcoin_status = 'pending')
  AND a.id IS NULL
  AND ud.created_at < NOW() - INTERVAL '5 minutes';

-- Tasa de éxito de Polygon (debe ser >95%)
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN polygon_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  ROUND(100.0 * SUM(CASE WHEN polygon_status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
FROM user_documents
WHERE polygon_status IN ('pending', 'confirmed', 'failed')
  AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## 📝 Notas Importantes

- ⚠️ **Service Role Key es SECRETO**: Nunca compartir ni commitear
- ⏱️ **Tiempos normales**: 
  - Trigger: ~2-5 segundos
  - Polygon confirmación: ~30-120 segundos
  - Bitcoin pending: ~5-10 minutos
  - Bitcoin confirmación: 4-24 horas
- 🔄 **Recovery automático**: Cron job detecta y repara orphans cada 5 minutos
- 📊 **Monitoring**: Revisar métricas cada 24h durante primera semana

---

**Próximo paso**: Ejecutar Paso 1 en Supabase Dashboard → SQL Editor
