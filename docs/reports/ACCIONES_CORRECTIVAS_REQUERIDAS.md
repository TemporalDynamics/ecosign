# ACCIONES CORRECTIVAS REQUERIDAS - Migración de Autoridad H6

**PRIORIDAD: CRÍTICO**
**Estado actual**: NO LISTO PARA DEPLOYMENT

---

## RESUMEN DE PROBLEMAS CRÍTICOS

**3 problemas críticos** que DEBEN corregirse antes de proceder:

1. 🔴 **Inconsistencia Deno Env vs PostgreSQL Settings** - Los flags no se sincronizan
2. 🔴 **Modificaciones a migraciones ya aplicadas** - Cambios no se aplicarán en PROD
3. 🔴 **set_config() no persiste** - Flags desaparecen después de la migración

---

## CHECKLIST DE CORRECCIONES

### ✅ Paso 1: Crear Sistema de Flags Persistente

**Archivo a crear**: `supabase/migrations/20260126170000_feature_flags_table.sql`

```sql
-- Crear tabla persistente para flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Poblar con flags iniciales (todos en FALSE = modo legacy)
INSERT INTO public.feature_flags (flag_name, enabled, description) VALUES
  ('D1_RUN_TSA_ENABLED', false, 'Controla ejecución de TSA via executor canónico'),
  ('D3_BUILD_ARTIFACT_ENABLED', false, 'Controla construcción de artifacts via executor'),
  ('D4_ANCHORS_ENABLED', false, 'Controla anclajes blockchain via executor'),
  ('D5_NOTIFICATIONS_ENABLED', false, 'Controla notificaciones via executor')
ON CONFLICT (flag_name) DO NOTHING;

-- Función para verificar flags (REEMPLAZAR la existente)
CREATE OR REPLACE FUNCTION public.is_decision_under_canonical_authority(decision_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  flag_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO flag_enabled
  FROM public.feature_flags
  WHERE flag_name = decision_id;

  RETURN COALESCE(flag_enabled, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para actualizar flags (nueva)
CREATE OR REPLACE FUNCTION public.set_feature_flag(
  p_flag_name TEXT,
  p_enabled BOOLEAN,
  p_updated_by TEXT DEFAULT 'system'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.feature_flags
  SET
    enabled = p_enabled,
    updated_at = NOW(),
    updated_by = p_updated_by
  WHERE flag_name = p_flag_name;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Flag % does not exist', p_flag_name;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;

COMMENT ON TABLE public.feature_flags IS 'Feature flags para transición controlada de autoridad legacy → executor canónico';
```

**Resultado esperado**:
- ✅ Flags persisten entre sesiones
- ✅ Función SQL lee de tabla en lugar de app.settings
- ✅ Función para actualizar flags disponible

---

### ✅ Paso 2: Actualizar Triggers Existentes (Crear Nuevas Migraciones)

**Archivo a crear**: `supabase/migrations/20260126180000_update_triggers_with_flag_checks.sql`

```sql
-- ============================================
-- ACTUALIZAR TRIGGER: blockchain_anchoring
-- ============================================
CREATE OR REPLACE FUNCTION trigger_blockchain_anchoring()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url text;
  service_key text;
  polygon_request_id bigint;
  bitcoin_request_id bigint;
BEGIN
  IF (TG_OP != 'INSERT') THEN
    RETURN NEW;
  END IF;

  -- Check if D4 (anchors) decision is under canonical authority
  -- If so, this trigger should not execute (executor handles it)
  IF public.is_decision_under_canonical_authority('D4_ANCHORS_ENABLED') THEN
    RAISE NOTICE 'Blockchain anchoring trigger: D4 under canonical authority, skipping direct calls for document %', NEW.id;
    RETURN NEW;
  END IF;

  -- [RESTO DE LA LÓGICA ORIGINAL]
  BEGIN
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Blockchain anchoring trigger: Missing app settings';
      RETURN NEW;
  END;

  IF supabase_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Blockchain anchoring trigger: Settings are NULL';
    RETURN NEW;
  END IF;

  -- Trigger Polygon anchoring if status is pending
  IF NEW.polygon_status = 'pending' THEN
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-polygon',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', NEW.document_hash,
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
          'userEmail', (SELECT email FROM auth.users WHERE id = NEW.user_id),
          'metadata', jsonb_build_object(
            'source', 'database_trigger',
            'documentName', NEW.document_name
          )
        )
      ) INTO polygon_request_id;

      RAISE NOTICE 'Polygon anchor triggered for document %: request_id=%', NEW.id, polygon_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger Polygon anchor for document %: %', NEW.id, SQLERRM;
    END;
  END IF;

  -- Trigger Bitcoin anchoring if status is pending
  IF NEW.bitcoin_status = 'pending' THEN
    BEGIN
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/anchor-bitcoin',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'documentHash', NEW.document_hash,
          'documentId', NEW.id,
          'userDocumentId', NEW.id,
          'userId', NEW.user_id,
          'userEmail', (SELECT email FROM auth.users WHERE id = NEW.user_id),
          'metadata', jsonb_build_object(
            'source', 'database_trigger',
            'documentName', NEW.document_name
          )
        )
      ) INTO bitcoin_request_id;

      RAISE NOTICE 'Bitcoin anchor triggered for document %: request_id=%', NEW.id, bitcoin_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to trigger Bitcoin anchor for document %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- ACTUALIZAR TRIGGER: notify_signer_link
-- ============================================
CREATE OR REPLACE FUNCTION notify_signer_link()
RETURNS TRIGGER AS $$
DECLARE
  workflow_title TEXT;
  owner_name TEXT;
  owner_email TEXT;
  sign_link TEXT;
  expires_at_date TEXT;
BEGIN
  IF NEW.status IN ('pending', 'ready') AND TG_OP = 'INSERT' THEN

    -- Check if D5 (notifications) decision is under canonical authority
    IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
      RAISE NOTICE 'Notification trigger: D5 under canonical authority, skipping direct notifications for signer % (workflow %)', NEW.email, NEW.workflow_id;
      RETURN NEW;
    END IF;

    -- [RESTO DE LA LÓGICA ORIGINAL]
    SELECT
      sw.original_filename,
      u.email,
      COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    INTO workflow_title, owner_email, owner_name
    FROM signature_workflows sw
    LEFT JOIN auth.users u ON u.id = sw.owner_id
    WHERE sw.id = NEW.workflow_id;

    sign_link := COALESCE(
      current_setting('app.frontend_url', true),
      'https://app.ecosign.app'
    ) || '/sign/' || NEW.access_token_hash;

    expires_at_date := (NOW() + INTERVAL '30 days')::TEXT;

    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      signer_id,
      notification_type,
      subject,
      body_html,
      delivery_status
    ) VALUES (
      NEW.workflow_id,
      NEW.email,
      'signer',
      NEW.id,
      'your_turn_to_sign',
      '📄 Documento para firmar: ' || workflow_title,
      format(
        '<html><body><h2>Tenés un documento para firmar</h2><p>%s te envió el documento <strong>"%s"</strong> para que lo revises y firmes.</p><p><a href="%s" style="background-color: #111827; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">Revisar y firmar documento</a></p><p>Link: %s</p><p>Válido hasta: %s</p></body></html>',
        owner_name,
        workflow_title,
        sign_link,
        sign_link,
        to_char(NOW() + INTERVAL '30 days', 'DD/MM/YYYY')
      ),
      'pending'
    );

    RAISE NOTICE 'Notificación creada para signer % (workflow %)', NEW.email, NEW.workflow_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACTUALIZAR TRIGGER: notify_workflow_completed
-- ============================================
CREATE OR REPLACE FUNCTION notify_workflow_completed()
RETURNS TRIGGER AS $$
DECLARE
  signer_record RECORD;
  workflow_title TEXT;
  eco_file_download_url TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Check if D5 (notifications) decision is under canonical authority
    IF public.is_decision_under_canonical_authority('D5_NOTIFICATIONS_ENABLED') THEN
      RAISE NOTICE 'Notification trigger: D5 under canonical authority, skipping direct notifications for workflow %', NEW.id;
      RETURN NEW;
    END IF;

    -- [RESTO DE LA LÓGICA ORIGINAL - copiar desde el archivo original]
    workflow_title := NEW.original_filename;

    eco_file_download_url := COALESCE(
      current_setting('app.frontend_url', true),
      'https://app.ecosign.app'
    ) || '/download/' || NEW.id || '/eco';

    INSERT INTO workflow_notifications (
      workflow_id,
      recipient_email,
      recipient_type,
      notification_type,
      subject,
      body_html,
      delivery_status
    )
    SELECT
      NEW.id,
      u.email,
      'owner',
      'workflow_completed',
      '✅ Documento firmado completamente: ' || workflow_title,
      format(
        '<html><body><h2>¡Tu documento está completado!</h2><p>El documento <strong>"%s"</strong> fue firmado por todos los participantes.</p><p><a href="%s" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">Descargar certificado .ECO</a></p><p>Link de descarga: %s</p></body></html>',
        workflow_title,
        eco_file_download_url,
        eco_file_download_url
      ),
      'pending'
    FROM auth.users u
    WHERE u.id = NEW.owner_id;

    -- [CONTINUAR CON RESTO DE LA LÓGICA...]
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACTUALIZAR OTROS TRIGGERS SIMILARES
-- ============================================
-- [Agregar aquí on_signature_completed y on_signature_notify_creator]
```

**Resultado esperado**:
- ✅ Triggers en PROD tendrán los checks de flags
- ✅ No se modifican migraciones ya ejecutadas

---

### ✅ Paso 3: Corregir Lógica Faltante en Executor

**Archivo a modificar**: `supabase/functions/fase1-executor/index.ts`

**Buscar esta sección** (alrededor de línea 340):
```typescript
// ENCONE JOB PARA ANCLAJE BITCOIN
if (bitcoinShouldEnqueue) {
```

**AGREGAR ANTES de ese bloque**:
```typescript
// ENCONE JOB PARA ANCLAJE POLYGON
if (polygonShouldEnqueue) {
  await enqueueExecutorJob(
    supabase,
    SUBMIT_ANCHOR_POLYGON_JOB_TYPE,
    documentEntityId,
    payload['document_id'] ? String(payload['document_id']) : null,
    `${documentEntityId}:${SUBMIT_ANCHOR_POLYGON_JOB_TYPE}`,
  );
}
```

**Resultado esperado**:
- ✅ Anclaje de Polygon se encola correctamente cuando D4 está activo

---

### ✅ Paso 4: Sincronizar Flags entre Deno y PostgreSQL

**Archivo a crear**: `supabase/functions/_shared/flagSync.ts`

```typescript
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Sincroniza flags entre Deno Env y PostgreSQL
 */
export async function syncFlagsToDatabase(supabase: SupabaseClient) {
  const flags = {
    'D1_RUN_TSA_ENABLED': Deno.env.get("ENABLE_D1_CANONICAL") === "true",
    'D3_BUILD_ARTIFACT_ENABLED': Deno.env.get("ENABLE_D3_CANONICAL") === "true",
    'D4_ANCHORS_ENABLED': Deno.env.get("ENABLE_D4_CANONICAL") === "true",
    'D5_NOTIFICATIONS_ENABLED': Deno.env.get("ENABLE_D5_CANONICAL") === "true",
  };

  for (const [flagName, enabled] of Object.entries(flags)) {
    await supabase.rpc('set_feature_flag', {
      p_flag_name: flagName,
      p_enabled: enabled,
      p_updated_by: 'deno-sync'
    });
  }
}

/**
 * Verifica si flags están sincronizados
 */
export async function checkFlagSync(supabase: SupabaseClient): Promise<{synced: boolean, mismatches: string[]}> {
  const denoFlags = {
    'D1_RUN_TSA_ENABLED': Deno.env.get("ENABLE_D1_CANONICAL") === "true",
    'D3_BUILD_ARTIFACT_ENABLED': Deno.env.get("ENABLE_D3_CANONICAL") === "true",
    'D4_ANCHORS_ENABLED': Deno.env.get("ENABLE_D4_CANONICAL") === "true",
    'D5_NOTIFICATIONS_ENABLED': Deno.env.get("ENABLE_D5_CANONICAL") === "true",
  };

  const { data: dbFlags } = await supabase
    .from('feature_flags')
    .select('flag_name, enabled');

  const mismatches: string[] = [];

  for (const dbFlag of (dbFlags || [])) {
    const denoValue = denoFlags[dbFlag.flag_name as keyof typeof denoFlags];
    if (denoValue !== dbFlag.enabled) {
      mismatches.push(dbFlag.flag_name);
    }
  }

  return {
    synced: mismatches.length === 0,
    mismatches
  };
}
```

**Modificar `fase1-executor/index.ts`** para sincronizar al inicio:
```typescript
import { syncFlagsToDatabase } from '../_shared/flagSync.ts';

// En la función principal, ANTES de procesar jobs:
try {
  await syncFlagsToDatabase(supabase);
} catch (error) {
  console.warn('Failed to sync flags to database:', error);
  // Continuar de todos modos
}
```

**Resultado esperado**:
- ✅ Flags de Deno Env se sincronizan automáticamente a PostgreSQL
- ✅ Triggers SQL leen el estado correcto

---

### ✅ Paso 5: REVERTIR Cambios a Migraciones Existentes

**Acción requerida**: Ejecutar git checkout para DESHACER modificaciones a archivos de migraciones ya aplicadas:

```bash
git checkout HEAD -- supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql
git checkout HEAD -- supabase/migrations/20251126000000_guest_signature_workflow_automation.sql
git checkout HEAD -- supabase/migrations/20251127000000_ecox_audit_trail_and_creator_notification.sql
```

**Resultado esperado**:
- ✅ Archivos de migraciones vuelven a su estado original
- ✅ Las actualizaciones se aplicarán via nuevas migraciones (Paso 2)

---

### ✅ Paso 6: ELIMINAR Migración Inválida

**Archivo a eliminar**: `supabase/migrations/20260126160000_feature_flags_default_config.sql`

**Razón**: Usa `set_config()` que no persiste. Reemplazado por tabla en Paso 1.

```bash
git rm supabase/migrations/20260126160000_feature_flags_default_config.sql
```

**Resultado esperado**:
- ✅ Migración inválida eliminada
- ✅ Configuración de flags se hace via tabla (Paso 1)

---

## ORDEN DE EJECUCIÓN DE CORRECCIONES

**IMPORTANTE**: Ejecutar en este orden exacto:

1. ✅ Paso 5: REVERTIR cambios a migraciones existentes
2. ✅ Paso 6: ELIMINAR migración inválida
3. ✅ Paso 1: Crear tabla de flags persistente
4. ✅ Paso 2: Crear nuevas migraciones para actualizar triggers
5. ✅ Paso 3: Corregir lógica de Polygon en executor
6. ✅ Paso 4: Agregar sincronización de flags

---

## VALIDACIÓN POST-CORRECCIÓN

Después de aplicar todas las correcciones, verificar:

### Check #1: Tabla de Flags Existe
```sql
SELECT * FROM public.feature_flags;
```
Debe retornar 4 filas (D1, D3, D4, D5) todas con `enabled = false`.

### Check #2: Función SQL Funciona
```sql
SELECT public.is_decision_under_canonical_authority('D1_RUN_TSA_ENABLED');
```
Debe retornar `false` (modo legacy por defecto).

### Check #3: Triggers Tienen Checks
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'trigger_blockchain_anchoring';
```
Debe mostrar el código con `IF public.is_decision_under_canonical_authority(...)`.

### Check #4: Flags Se Sincronizan
1. Cambiar `ENABLE_D1_CANONICAL=true` en Supabase secrets
2. Re-deploy executor
3. Ejecutar:
```sql
SELECT * FROM public.feature_flags WHERE flag_name = 'D1_RUN_TSA_ENABLED';
```
Debe mostrar `enabled = true`.

---

## DESPUÉS DE LAS CORRECCIONES

Una vez completadas TODAS las correcciones y validaciones:

1. Commit de cambios:
```bash
git add -A
git commit -m "fix: corregir sistema de feature flags para migración de autoridad

- Crear tabla persistente para flags (elimina dependencia de set_config)
- Actualizar triggers con checks de flags via nuevas migraciones
- Agregar sincronización automática Deno Env → PostgreSQL
- Corregir lógica faltante de enqueue para Polygon
- Revertir modificaciones a migraciones ya aplicadas"
```

2. Desplegar en staging
3. Ejecutar validaciones del Check list anterior
4. Proceder con plan de validación en `docs/VALIDACION_STAGING_MIGRACION_AUTORIDAD.md`

---

**Fecha**: 2026-01-26
**Status**: ACCIONES CORRECTIVAS PENDIENTES
**Próximo paso**: Ejecutar Paso 5 (REVERTIR cambios)
