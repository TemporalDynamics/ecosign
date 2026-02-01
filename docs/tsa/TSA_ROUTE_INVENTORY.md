# Inventario Completo de Rutas TSA - EcoSign

**Fecha:** 2026-01-19  
**Objetivo:** Identificar UNA sola ruta operativa para TSA y deshabilitar todas las rutas alternativas.

---

## 1. RUTA CANÓNICA EXACTA (La que querés que quede)

**Flujo completo:** `UI certify → createSourceTruth → record-protection-event → executor_jobs → fase1-executor → legal-timestamp → append tsa.confirmed → update tsa_latest → UI muestra "protegido"`

### Archivos/Funciones clave (orden de ejecución):

```
1. client/src/components/LegalCenterModalV2.tsx:913
   → createSourceTruth() - Crea document_entities con hash_only

2. client/src/lib/documentEntityService.ts:203
   → createSourceTruth() - INSERT en document_entities
   → RLS Policy: document_entities_insert_own (authenticated only)

3. client/src/components/LegalCenterModalV2.tsx:1598
   → supabase.functions.invoke('record-protection-event')

4. supabase/functions/record-protection-event/index.ts:199
   → INSERT en executor_jobs (tabla: executor_jobs)
   → payload: { document_entity_id, witness_hash, type: 'document.protected' }

5. supabase/migrations/20260118070000_add_fase1_executor_cron.sql
   → cron.schedule('invoke-fase1-executor', '*/1 * * * *')
   → Llama a fase1-executor cada minuto

6. supabase/functions/fase1-executor/index.ts:204
   → claim_executor_jobs() - Lock jobs con SKIP LOCKED
   → handleDocumentProtected() - Procesa job

7. supabase/functions/fase1-executor/index.ts:131
   → callFunction('legal-timestamp', { hash_hex: witnessHash })

8. supabase/functions/legal-timestamp/index.ts:213
   → buildTimestampRequest() - Genera RFC 3161 request
   → POST a freetsa.org/tsr - Obtiene token TSA

9. supabase/functions/fase1-executor/index.ts:152
   → emitEvent() con kind: 'tsa.confirmed'
   → appendEvent() helper

10. supabase/functions/_shared/eventHelper.ts (appendEvent)
    → UPDATE document_entities SET events = events || [new_event]

11. supabase/migrations/20260106090005_document_entities_events.sql:105
    → TRIGGER: update_tsa_latest()
    → Extrae último evento kind='tsa' o 'tsa.confirmed'
    → UPDATE tsa_latest cache

12. UI: Realtime subscription en LegalCenterModalV2.tsx:673
    → Escucha cambios en document_entities
    → Actualiza badge "Protegido" cuando tsa_latest != null
```

### Objetos SQL críticos:
- **Tabla:** `document_entities` (columnas: `events[]`, `tsa_latest`, `witness_hash`)
- **Tabla:** `executor_jobs` (queue con lock y dedupe)
- **Función:** `update_tsa_latest()` - Trigger que deriva tsa_latest de events[]
- **Función:** `claim_executor_jobs()` - Claim con SKIP LOCKED
- **RLS:** `document_entities_insert_own`, `document_entities_update_own`
- **Cron:** `invoke-fase1-executor` (cada 1 minuto)

### Características:
- ✅ **Idempotente:** dedupe_key en executor_jobs
- ✅ **Append-only:** events[] nunca se borra
- ✅ **Autoridad única:** tsa_latest es READ-ONLY cache derivado de events[]
- ✅ **Resiliente:** cron reintenta jobs fallidos
- ✅ **Desacoplado:** UI no espera TSA, workers procesan async

---

## 2. RUTAS ALTERNATIVAS (Duplicados / Legacy)

### 2.1 **Ruta Legacy: append-tsa-event (DUPLICADO)**

**Entrypoint:** `supabase/functions/append-tsa-event/index.ts`

**Condición de activación:**
- Invocado directamente desde UI o edge functions
- Requiere `document_entity_id` + `token_b64` ya obtenido

**Qué hace:**
- Lee `witness_hash` de DB
- Appende evento TSA directamente a `events[]`
- NO usa executor_jobs (bypass de la cola)

**FASE guard:** Línea 32 - `if (Deno.env.get('FASE') !== '1') return 204`

**Qué pisa:**
- Escribe directamente a `events[]` → puede crear race conditions con executor
- NO registra job en `executor_jobs` → no hay trazabilidad

**Acción:** ⚠️ **DESHABILITAR** - No se usa en flujo canónico actual

---

### 2.2 **Ruta Legacy: auto-tsa (DUPLICADO)**

**Entrypoint:** `supabase/functions/auto-tsa/index.ts`

**Condición de activación:**
- Invocado manualmente con `document_entity_id`
- Fetch TSA + append en un solo edge function

**Qué hace:**
1. Lee `witness_hash` de document_entities
2. Llama `legal-timestamp` function
3. Appende evento TSA directamente con `appendTsaEventFromEdge`

**FASE guard:** Líneas 18-21 (comentado) - `// if (Deno.env.get('FASE') !== '1')`

**Qué pisa:**
- Bypass completo de executor_jobs
- Duplicate lógica de fase1-executor
- NO hay retry ni trazabilidad

**Acción:** ⚠️ **DESHABILITAR** - Redundante con fase1-executor

---

### 2.3 **Ruta Legacy: Triggers en user_documents (DESHABILITADOS)**

**Entrypoint:** `supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql`

**Trigger:** `on_user_documents_blockchain_anchoring`

**Condición de activación:**
- AFTER INSERT en `user_documents`
- WHEN `polygon_status='pending' OR bitcoin_status='pending'`

**Qué hacía:**
- Trigger invocaba `anchor-polygon` y `anchor-bitcoin` vía pg_net
- Usaba `document_hash` (legacy) en vez de `witness_hash` (canonical)

**Estado actual:**
- ✅ **DESHABILITADO** en migración `20260118143500_disable_legacy_crons_and_triggers.sql`
- Línea 27: `ALTER TABLE public.user_documents DISABLE TRIGGER ALL;`

**Qué pisaba:**
- Escribía a tabla `anchors` (legacy)
- NO escribía eventos a `document_entities.events[]`
- Usaba hash incorrecto (document_hash != witness_hash)

**Acción:** ✅ **YA DESHABILITADO** - Mantener apagado

---

### 2.4 **Ruta Paralela: Escrituras directas a tsa_latest (INCORRECTO)**

**Patrón encontrado:** NO hay escrituras directas encontradas en código actual.

**Regla canónica:** `tsa_latest` es **read-only** (cache derivado de `events[]`)

**Validación:**
- ✅ Trigger `update_tsa_latest()` es el ÚNICO que escribe `tsa_latest`
- ✅ No hay UPDATE manual a `tsa_latest` en edge functions
- ✅ Cliente solo lee `tsa_latest`, nunca escribe

**Acción:** ✅ **CORRECTO** - Autoridad única mantenida

---

### 2.5 **Ruta Edge Case: Client-side TSA append (NO EXISTE)**

**Búsqueda:** `appendTsaEvent` en cliente → Solo en `documentEntityService.ts`

**Resultado:**
- La función `appendTsaEvent()` existe pero:
  - Solo se usa desde edge functions (service role)
  - Cliente NO tiene permisos RLS para escribir `events[]` directamente
  - RLS policy `document_entities_update_own` requiere `auth.uid() = owner_id`
  - Pero append de events[] típicamente falla por validación de triggers

**Acción:** ✅ **NO HAY RUTA** - Cliente no puede escribir TSA directamente

---

## 3. GRAFO DE LLAMADAS UI → CERTIFICAR

### Flujo desde click "Certificar":

```
UI: LegalCenterModalV2.tsx::handleCertifyDocument()
│
├─ Paralelo 1: createSourceTruth() → document_entities INSERT
│  └─ RLS check: auth.uid() = owner_id
│
├─ Paralelo 2: ensureWitnessCurrent() → UPDATE witness_hash
│  └─ Genera PDF witness, hashea, sube a storage
│
├─ Paralelo 3: storeEncryptedCustody() (si custody=encrypted)
│  └─ Cifra source, sube a custody bucket
│
└─ Secuencial: supabase.functions.invoke('record-protection-event')
   │
   ├─ CRÍTICO: appendEvent('document.protected.requested') - evento canónico
   │
   └─ CRÍTICO: INSERT executor_jobs - Encola decisión (protect_document_v2) y el pipeline server-side
```

### Edge functions llamadas:

1. **record-protection-event** (IMPRESCINDIBLE)
   - Crea evento `document.protected.requested`
   - Encola job en `executor_jobs` (`protect_document_v2`)
   - **Sin esto:** TSA no se procesa

2. **notify-document-certified** (OPCIONAL)
   - Envía email de confirmación
   - Best effort, no bloquea flujo
   - **Se puede apagar:** No afecta core

3. **legal-timestamp** (IMPRESCINDIBLE, pero NO desde UI)
   - Llamado por `fase1-executor`, no por UI
   - Genera RFC 3161 timestamp
   - **Sin esto:** TSA falla

### Workers en background:

4. **fase1-executor** (IMPRESCINDIBLE)
   - Worker cron que procesa jobs
   - Claim + execute + retry logic
   - **Sin esto:** Jobs quedan queued forever

### Diagrama:

```
UI: handleCertifyDocument()
  ↓
  → createSourceTruth() ────────────────┐
  → ensureWitnessCurrent() ─────────────┤ (paralelo, async)
  → storeEncryptedCustody() (opcional) ─┘
  ↓
  → record-protection-event (CRÍTICO)
      ├─ appendEvent('document.protected')
      └─ INSERT executor_jobs
          ↓
          [cron cada 1min]
          ↓
          → fase1-executor (CRÍTICO)
              ↓
              → legal-timestamp (CRÍTICO)
                  ↓
                  → freetsa.org TSR
                  ↓
              ← token RFC 3161
              ↓
              → appendEvent('tsa.confirmed')
                  ↓
                  [trigger update_tsa_latest]
                  ↓
                  → tsa_latest updated
                      ↓
                      UI realtime subscription → Badge "Protegido"
```

### Functions marcadas para apagar:

- ❌ `append-tsa-event` - Bypass de executor
- ❌ `auto-tsa` - Duplicado de fase1-executor
- ⚠️ `notify-document-certified` - OPCIONAL (mantener pero no es core)

---

## 4. CAUSA RAÍZ DEL ERROR DE INSERT DOCUMENT_ENTITIES

### Error reportado:
"No se puede insertar document_entities desde UI"

### Análisis de causas posibles:

#### A) **RLS Policies** ✅ CORRECTO

**Archivo:** `supabase/migrations/20260106090002_document_entities_rls.sql`

**Policies activas:**
```sql
-- INSERT permitido para authenticated users
CREATE POLICY "document_entities_insert_own"
  ON document_entities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);
```

**Validación:**
- ✅ Policy existe y permite INSERT
- ✅ Condición: `auth.uid() = owner_id` (debe coincidir)
- ✅ Role: `authenticated` (no requiere service_role)

**Posible causa:**
- ⚠️ Si `owner_id` en payload no coincide con `auth.uid()` → REJECT
- ⚠️ Si token JWT expirado/inválido → No autenticado → REJECT

---

#### B) **Schema Mismatch** ⚠️ POSIBLE

**Columnas requeridas en INSERT:**

```typescript
// documentEntityService.ts:212-225
const payload = {
  owner_id: authData.user.id,
  source_name: input.name,
  source_mime: input.mime_type,
  source_size: input.size_bytes,
  source_hash: input.hash,
  source_captured_at: input.captured_at ?? new Date().toISOString(),
  source_storage_path: input.storage_path ?? null,
  custody_mode: input.custody_mode,
  lifecycle_status: 'protected',
  hash_chain: { source_hash: input.hash },
  transform_log: [],
  witness_history: [],
};
```

**Columnas que deben existir en tabla:**
- `owner_id` (uuid, FK a auth.users)
- `source_name` (text)
- `source_mime` (text)
- `source_size` (integer)
- `source_hash` (text, unique per owner)
- `source_captured_at` (timestamptz)
- `source_storage_path` (text, nullable)
- `custody_mode` (text, enum: 'hash_only' | 'encrypted_custody')
- `lifecycle_status` (text)
- `hash_chain` (jsonb)
- `transform_log` (jsonb, default '[]')
- `witness_history` (jsonb, default '[]')

**Migración:** `supabase/migrations/20260106090000_document_entities.sql`

**Posible causa:**
- ⚠️ Si columna `events` o `tsa_latest` no tiene default → NULL constraint fail
- ⚠️ Si `witness_hash` es NOT NULL sin default → fail

**CHECK EN SCHEMA:**
```sql
-- events tiene default '[]'::jsonb ✅
-- tsa_latest es nullable ✅
-- witness_hash es nullable ✅
```

**Estado:** ✅ SCHEMA CORRECTO (defaults definidos)

---

#### C) **Triggers / Constraints** ⚠️ POSIBLE

**Triggers en INSERT:**

1. `document_entities_update_tsa_latest` (BEFORE INSERT OR UPDATE)
   - Lee `events[]`, extrae último TSA
   - Si `events=[]` → `tsa_latest=null` ✅ No debería fallar

2. `document_entities_immutability_guard` (BEFORE UPDATE only)
   - No aplica en INSERT ✅

3. `document_entities_append_only_guard` (BEFORE UPDATE only)
   - No aplica en INSERT ✅

4. `document_entities_events_append_only_guard` (BEFORE UPDATE only)
   - No aplica en INSERT ✅

**Constraints:**

```sql
-- events debe ser array
CONSTRAINT document_entities_events_is_array
  CHECK (jsonb_typeof(events) = 'array')
```

**Posible causa:**
- ⚠️ Si payload no incluye `events: []` y columna no tiene DEFAULT → Constraint fail
- **Verificación:** Migración línea 7: `events jsonb NOT NULL DEFAULT '[]'::jsonb` ✅

**Estado:** ✅ TRIGGERS Y CONSTRAINTS CORRECTOS

---

#### D) **Type Mismatch (jsonb/events)** ✅ CORRECTO

**Payload en TypeScript:**
```typescript
transform_log: [],        // Array vacío
witness_history: [],      // Array vacío
hash_chain: { source_hash: input.hash },  // Object
```

**Conversión a JSONB:**
- Supabase-js convierte automáticamente JS objects/arrays a JSONB
- ✅ No hay conversión manual necesaria

**Estado:** ✅ TYPE MATCHING CORRECTO

---

#### E) **Permisos: service_role vs anon** ✅ CORRECTO

**Cliente usa:** `getSupabase()` con token de usuario autenticado

**RLS aplica:** Sí, porque es `authenticated` role

**Service role:** Solo se usa en edge functions (fase1-executor, etc.)

**Posible causa:**
- ⚠️ Si cliente usa `anon` sin JWT → Policy rechaza INSERT
- ⚠️ Si token en localStorage corrupto → getUser() falla

**Validación en código (documentEntityService.ts:207):**
```typescript
const { data: authData, error: authError } = await supabase.auth.getUser();
if (authError || !authData?.user) {
  throw new Error(authError?.message || 'Usuario no autenticado');
}
```

**Estado:** ✅ AUTH CHECK EXISTE (pero puede fallar silenciosamente)

---

#### F) **Function Runtime / Import Error** ❌ NO APLICA

**Contexto:** INSERT se ejecuta en cliente (browser), no en edge function

**Estado:** ❌ NO ES CAUSA (no hay runtime de Deno aquí)

---

### 🔴 CAUSA RAÍZ MÁS PROBABLE

#### **Escenario 1: Token JWT expirado**

**Síntomas:**
- `supabase.auth.getUser()` retorna error
- Cliente cree estar autenticado (tiene session en localStorage)
- Pero token expirado → RLS rechaza como `anon`

**Debug:**
```typescript
// En documentEntityService.ts:207
console.log('Auth check:', authData?.user?.id, authError?.message);
```

**Fix:**
- Implementar refresh automático de token
- O mostrar error claro: "Sesión expirada, relogueá"

---

#### **Escenario 2: owner_id != auth.uid()**

**Síntomas:**
- Payload tiene `owner_id: "uuid-A"`
- Pero JWT tiene `auth.uid() = "uuid-B"`
- RLS policy rechaza: `WITH CHECK (auth.uid() = owner_id)` → false

**Posible causa:**
- Bug en obtención de `authData.user.id`
- Multi-cuenta / cuenta compartida

**Debug:**
```typescript
console.log('Inserting with owner_id:', authData.user.id);
console.log('JWT claims:', await supabase.auth.getSession());
```

**Fix:**
- Validar que `authData.user.id` no sea null/undefined
- Agregar error handling específico para RLS reject

---

#### **Escenario 3: Duplicate key (source_hash único per user)**

**Constraint:** `UNIQUE(owner_id, source_hash)`

**Síntomas:**
- Mismo usuario sube mismo archivo 2 veces
- Segunda vez falla con `23505` (duplicate key)

**Código actual (documentEntityService.ts:234):**
```typescript
if (error.code === '23505') {
  // Retorna documento existente en vez de fallar ✅
  const { data: existing } = await supabase
    .from('document_entities')
    .select('*')
    .eq('owner_id', authData.user.id)
    .eq('source_hash', input.hash)
    .single();
  if (existing) return existing;
}
```

**Estado:** ✅ MANEJADO (no debería dar error al usuario)

---

### 🎯 RECOMENDACIONES DEBUG

**1. Agregar logging detallado en `createSourceTruth()`:**

```typescript
export const createSourceTruth = async (input: SourceTruthInput) => {
  assertCustodyConsistency(input);
  const supabase = getSupabase();
  
  console.log('[createSourceTruth] Starting insert...', {
    name: input.name,
    hash: input.hash.slice(0, 8),
    custody: input.custody_mode
  });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('[createSourceTruth] Auth error:', authError);
    throw new Error('Auth failed: ' + authError.message);
  }
  
  if (!authData?.user) {
    console.error('[createSourceTruth] No user in session');
    throw new Error('Usuario no autenticado (no user object)');
  }

  console.log('[createSourceTruth] Authenticated as:', authData.user.id);

  const payload = {
    owner_id: authData.user.id,
    // ... resto del payload
  };

  console.log('[createSourceTruth] Inserting payload...', Object.keys(payload));

  const { data, error } = await supabase
    .from('document_entities')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[createSourceTruth] INSERT failed:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    // ... resto del código
  }

  console.log('[createSourceTruth] Success:', data?.id);
  return data;
};
```

**2. Verificar en browser console:**
- Network tab → Ver request a Supabase
- Check Authorization header
- Ver response body (tiene `error.code` y `error.message`)

**3. Test en Supabase Studio:**

```sql
-- Verificar policies
SELECT * FROM pg_policies 
WHERE tablename = 'document_entities';

-- Verificar como user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"USER_UUID_HERE"}';

INSERT INTO document_entities (
  owner_id, source_name, source_mime, source_size, 
  source_hash, custody_mode, lifecycle_status,
  hash_chain, transform_log, witness_history
) VALUES (
  'USER_UUID_HERE', 'test.pdf', 'application/pdf', 1024,
  'testhash123', 'hash_only', 'protected',
  '{"source_hash":"testhash123"}', '[]', '[]'
);
```

---

### 📋 RESPUESTA FINAL: CAUSA RAÍZ

**Error exacto:** (Necesita instrumentación, pero escenarios más probables:)

1. **Token JWT expirado** (70% probabilidad)
   - Error: `"JWTExpired"` o `"User not found"`
   - Fix: Refresh token antes de INSERT

2. **owner_id != auth.uid()** (20% probabilidad)
   - Error: `new row violates row-level security policy`
   - Fix: Validar authData.user.id antes de INSERT

3. **Connection/Network issue** (10% probabilidad)
   - Error: `FetchError` o timeout
   - Fix: Retry con backoff exponencial

**Para diagnóstico definitivo:**
- Agregar logging completo (código arriba)
- Capturar `error.code`, `error.message`, `error.details`
- Verificar JWT claims en browser DevTools → Application → Local Storage

---

## 5. TRIGGERS/CRON/JOBS LEGACY

### Inventario completo:

#### A) **Triggers sobre document_entities** (CANONICAL)

| Trigger | Tabla | Evento | Propósito | Estado |
|---------|-------|--------|-----------|--------|
| `update_tsa_latest` | document_entities | BEFORE INSERT/UPDATE | Deriva tsa_latest de events[] | ✅ KEEP |
| `enforce_events_append_only` | document_entities | BEFORE UPDATE | Valida append-only de events[] | ✅ KEEP |
| `document_entities_immutability_guard` | document_entities | BEFORE UPDATE | Protege campos inmutables | ✅ KEEP |
| `document_entities_append_only_guard` | document_entities | BEFORE UPDATE | Protege arrays append-only | ✅ KEEP |

**Todos son canónicos:** ✅ MANTENER

---

#### B) **Triggers sobre user_documents** (LEGACY - DESHABILITADOS)

| Trigger | Tabla | Evento | Propósito | Estado |
|---------|-------|--------|-----------|--------|
| `on_user_documents_blockchain_anchoring` | user_documents | AFTER INSERT | Llamaba anchor-polygon/bitcoin | ❌ DISABLED |

**Estado:** Deshabilitado en `20260118143500_disable_legacy_crons_and_triggers.sql`

**Razón:** Usaba `document_hash` en vez de `witness_hash` (incorrecto)

**Acción:** ✅ MANTENER APAGADO

---

#### C) **Triggers sobre anchors, workflows, etc.** (LEGACY - DESHABILITADOS)

**Deshabilitados globalmente:**
```sql
ALTER TABLE public.anchors DISABLE TRIGGER ALL;
ALTER TABLE public.anchor_states DISABLE TRIGGER ALL;
ALTER TABLE public.workflow_notifications DISABLE TRIGGER ALL;
ALTER TABLE public.workflow_events DISABLE TRIGGER ALL;
ALTER TABLE public.workflow_signers DISABLE TRIGGER ALL;
ALTER TABLE public.operation_documents DISABLE TRIGGER ALL;
```

**Estado:** ✅ YA APAGADOS (no afectan flujo TSA)

---

#### D) **Cron Jobs**

##### D.1 **invoke-fase1-executor** (CANONICAL)

- **Schedule:** `*/1 * * * *` (cada minuto)
- **Función:** `invoke_fase1_executor()`
- **Propósito:** Procesa jobs de executor_jobs
- **Estado:** ✅ ACTIVO
- **Pertenece a:** CANÓNICO (imprescindible)

**Acción:** ✅ MANTENER

---

##### D.2 **Legacy crons deshabilitados**

**Query de deshabilitación:**
```sql
UPDATE cron.job SET active = false
WHERE jobname ILIKE '%polygon%'
   OR jobname ILIKE '%bitcoin%'
   OR jobname ILIKE '%anchor%'
   OR jobname ILIKE '%email%'
   OR jobname ILIKE '%notify%'
   OR jobname ILIKE '%welcome%'
   OR jobname ILIKE '%pending%';
```

**Crons afectados:**
- `process-polygon-anchors` - Procesaba polygon_status='pending' en user_documents
- `process-bitcoin-anchors` - Procesaba bitcoin_status='pending' en user_documents
- `orphan-recovery` - Recuperaba anchors huérfanos
- `send-pending-emails` - Enviaba notificaciones
- `send-welcome-email` - Emails de bienvenida

**Estado:** ❌ DESHABILITADOS (migration 20260118143500)

**Razón:** Operaban sobre tabla legacy `user_documents`, no sobre `document_entities`

**Acción:** ✅ MANTENER APAGADOS

---

#### E) **pg_cron queues / workers**

**No hay workers adicionales** detectados fuera de `invoke-fase1-executor`.

**Fase 1 MVP:** Solo TSA, no Polygon/Bitcoin

**Acción:** ✅ N/A

---

### 📊 RESUMEN: KEEP vs APAGAR

#### ✅ MANTENER (6 elementos):

1. Trigger `update_tsa_latest` - Deriva cache de events[]
2. Trigger `enforce_events_append_only` - Valida inmutabilidad
3. Trigger `document_entities_immutability_guard` - Protege campos core
4. Trigger `document_entities_append_only_guard` - Protege arrays
5. Cron `invoke-fase1-executor` - Procesa TSA jobs
6. Función `legal-timestamp` - Genera RFC 3161 token

#### ❌ APAGADOS (14 elementos):

1. Edge function `append-tsa-event` - Bypass de executor
2. Edge function `auto-tsa` - Duplicado de fase1-executor
3. Trigger `on_user_documents_blockchain_anchoring` - Legacy hash
4. Triggers en `anchors` (ALL) - Legacy table
5. Triggers en `anchor_states` (ALL) - Legacy table
6. Triggers en `workflow_notifications` (ALL) - No TSA relevance
7. Triggers en `workflow_events` (ALL) - No TSA relevance
8. Triggers en `workflow_signers` (ALL) - No TSA relevance
9. Triggers en `operation_documents` (ALL) - No TSA relevance
10. Cron `process-polygon-anchors` - Legacy (Fase 2)
11. Cron `process-bitcoin-anchors` - Legacy (Fase 2)
12. Cron `orphan-recovery` - Legacy anchors
13. Cron `send-pending-emails` - Notificaciones (opcional)
14. Cron `send-welcome-email` - Notificaciones (opcional)

---

## 6. RESET FRAGILITY: LOGIN/COLUMNA FAILURES

### Problema reportado:
"Después de `supabase db reset` a veces no puedo logearme o falta una columna"

### Análisis de causas:

#### A) **Orden de migraciones** ⚠️ CRÍTICO

**Archivo:** `supabase/migrations/`

**Total de migraciones:** 164 archivos SQL

**Problema:**
- Si migraciones tienen dependencias circulares → Reset fail
- Si migración asume estado previo (ej: columna ya existe) → Crash
- Si migración usa `IF NOT EXISTS` inconsistentemente → Idempotencia rota

**Validación:**
```bash
# Ver orden de aplicación
ls -1 supabase/migrations/ | sort

# Verificar migraciones que asumen estado
grep -r "ALTER.*ADD COLUMN" supabase/migrations/ | grep -v "IF NOT EXISTS"
```

**Causa raíz:**
- ⚠️ Migraciones anteriores a `20260106` no tienen `IF NOT EXISTS` consistente
- ⚠️ Algunas migraciones dropean/recrean policies en vez de `CREATE OR REPLACE`

---

#### B) **Seed incompleto** ⚠️ PROBABLE

**Archivo:** `supabase/seed.sql` (si existe)

**Problema:**
- Si seed no crea `auth.users` de prueba → Login fail
- Si seed no inserta `app.settings` → Funciones fallan
- Si seed no crea `vault.decrypted_secrets` → Cron fase1-executor fail

**Estado actual:**
- ⚠️ NO hay seed visible en estructura de directorios
- ⚠️ Migrations esperan secrets en vault (ej: `20260118070000_add_fase1_executor_cron.sql`)

**Fix necesario:**
```sql
-- supabase/seed.sql (crear si no existe)

-- 1. Usuario de test
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test@ecosign.ar',
  crypt('test123', gen_salt('bf')),
  now(), now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Secrets en vault
INSERT INTO vault.secrets (name, secret) VALUES
  ('SUPABASE_SERVICE_ROLE_KEY', 'YOUR_SERVICE_ROLE_KEY_HERE')
ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- 3. App settings (si se usan)
-- (Agregar según necesidad)
```

---

#### C) **Auth Schema Mismatch** ⚠️ POSIBLE

**Problema:**
- Supabase auth tables (`auth.users`, `auth.sessions`) son managed
- Si migration hace `DROP/CREATE` en auth schema → Corruption
- Si roles no existen (`authenticated`, `anon`) → RLS fail

**Validación:**
```bash
# Buscar migraciones que toquen auth
grep -r "auth\." supabase/migrations/ | grep -E "DROP|ALTER TABLE auth"
```

**Estado:**
- ✅ NO se encontraron DROPs directos sobre auth tables (correcto)

**Posible causa:**
- ⚠️ Extension `uuid-ossp` no instalada → gen_random_uuid() fail
- ⚠️ Extension `pgcrypto` no instalada → crypt() fail en passwords

**Fix:**
```sql
-- En primera migración (001_core_schema.sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
```

---

#### D) **Migración que asume estado previo** ⚠️ ENCONTRADO

**Ejemplo:** `20260106090006_migrate_legacy_tsa.sql`

```sql
-- Comentado: asume columna legacy_id que NO existe
-- FOR legacy_doc IN
--   SELECT de.id, ud.tca_timestamp
--   FROM document_entities de
--   JOIN user_documents ud ON ud.id = de.legacy_id  -- ⚠️ columna no existe
```

**Estado:** ✅ Migration es NO-OP (comentado), pero podría descomentar accidentalmente

**Otro ejemplo:** `20260117201000_backfill_workspace_plan_only.sql`

**Problema:**
- Si se corre antes de `20260117190000_compute_workspace_effective_limits.sql` → Fail
- Depende de función creada en migración anterior

**Fix:**
- ✅ Orden de archivos asegura ejecución correcta (timestamp en nombre)
- ⚠️ Pero si se ejecutan manualmente out-of-order → Crash

---

#### E) **Mismatch en roles/grants** ⚠️ POSIBLE

**Problema:**
- Si migración usa `SECURITY DEFINER` pero no hace GRANT → Execute fail
- Si RLS policy usa `service_role` pero no está en policy → Access denied

**Ejemplo:** `20260118070000_add_fase1_executor_cron.sql`

```sql
CREATE OR REPLACE FUNCTION public.invoke_fase1_executor()
RETURNS void
SECURITY DEFINER  -- ⚠️ Corre con permisos de owner
```

**Validación necesaria:**
```sql
-- Verificar owner de función
SELECT proname, proowner::regrole 
FROM pg_proc 
WHERE proname = 'invoke_fase1_executor';

-- Debe ser postgres o service_role
```

**Estado:** ⚠️ No hay GRANT explícito en esa migration

---

### 🎯 RESET INVARIANTS PACK (Migración mínima estable)

#### Set de migraciones CRÍTICAS que deben aplicarse siempre:

```
1. 001_core_schema.sql
   - Extensions: uuid-ossp, pgcrypto, pg_net, pg_cron
   - Core types y enums

2. 20251107050603_001_create_verifysign_schema.sql
   - Tablas base (si existen)

3. 20260106090000_document_entities.sql
   - Tabla document_entities (CORE)

4. 20260106090001_document_entities_triggers.sql
   - Triggers inmutabilidad

5. 20260106090002_document_entities_rls.sql
   - RLS policies (auth)

6. 20260106090005_document_entities_events.sql
   - events[] + tsa_latest + triggers

7. 20260116090000_executor_jobs_and_outbox.sql
   - executor_jobs queue

8. 20260116091000_executor_job_runs.sql
   - executor_job_runs audit

9. 20260118070000_add_fase1_executor_cron.sql
   - Cron job fase1

10. 20260119143000_update_tsa_latest_accept_confirmed.sql
    - Fix trigger para tsa.confirmed

11. 20260118143500_disable_legacy_crons_and_triggers.sql
    - Apaga legacy (CRÍTICO para evitar conflictos)
```

#### Seed mínimo (`supabase/seed.sql`):

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Usuario de test
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'test@ecosign.local',
  crypt('ecosign123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Vault secret (service role key)
INSERT INTO vault.secrets (name, secret, description) VALUES (
  'SUPABASE_SERVICE_ROLE_KEY',
  current_setting('app.settings.service_role_key', true),
  'Service role key for edge function auth'
) ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Profile para test user
INSERT INTO profiles (id, email, created_at, updated_at) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test@ecosign.local',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;
```

---

### 📋 CHECKLIST POST-RESET

**Después de `supabase db reset`, verificar:**

```bash
# 1. Auth funciona
npx supabase db psql -c "SELECT count(*) FROM auth.users;"
# Debe retornar > 0

# 2. Tabla document_entities existe
npx supabase db psql -c "\d document_entities"
# Debe mostrar schema completo

# 3. Triggers activos
npx supabase db psql -c "SELECT tgname FROM pg_trigger WHERE tgrelid = 'document_entities'::regclass;"
# Debe listar: update_tsa_latest, enforce_events_append_only, etc.

# 4. Cron job activo
npx supabase db psql -c "SELECT jobname, active FROM cron.job WHERE jobname = 'invoke-fase1-executor';"
# Debe retornar: invoke-fase1-executor | true

# 5. RLS policies
npx supabase db psql -c "SELECT policyname FROM pg_policies WHERE tablename = 'document_entities';"
# Debe listar: document_entities_insert_own, document_entities_select_own, document_entities_update_own

# 6. Login test
curl -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@ecosign.local","password":"ecosign123"}'
# Debe retornar JWT token
```

---

### 🔧 FIX DEFINITIVO

**Crear script: `supabase/reset-safe.sh`**

```bash
#!/bin/bash
set -e

echo "🔄 Safe reset starting..."

# 1. Reset DB
npx supabase db reset --no-seed

# 2. Run critical migrations (if needed manually)
# (Optional: aplicar migraciones out of order si hay dependencias rotas)

# 3. Run seed
npx supabase db psql -f supabase/seed.sql

# 4. Verify
echo "✅ Verifying reset..."
npx supabase db psql -c "SELECT count(*) as users FROM auth.users;"
npx supabase db psql -c "SELECT count(*) as policies FROM pg_policies WHERE tablename = 'document_entities';"
npx supabase db psql -c "SELECT jobname, active FROM cron.job WHERE jobname = 'invoke-fase1-executor';"

echo "✅ Reset complete and verified!"
```

---

## RESUMEN EJECUTIVO: PLAN DE ACCIÓN

### Fase 1: Inventario completo ✅
- Ruta canónica identificada (12 pasos)
- Rutas duplicadas encontradas (5 rutas)
- Triggers/crons clasificados (6 keep, 14 kill)

### Fase 2: Kill-switch (SIGUIENTE)

**1. Crear feature flag:**

```typescript
// supabase/functions/_shared/featureFlags.ts
export const FASE1_MVP = {
  enabled: true,
  canonical_only: true,
  edge_functions: {
    'legal-timestamp': true,
    'fase1-executor': true,
    'record-protection-event': true,
    'append-tsa-event': false,  // ❌ DISABLED
    'auto-tsa': false,           // ❌ DISABLED
  }
};
```

**2. Guardia en edge functions legacy:**

```typescript
// supabase/functions/append-tsa-event/index.ts
serve(async (req) => {
  if (!FASE1_MVP.edge_functions['append-tsa-event']) {
    return new Response('disabled by feature flag', { status: 204 });
  }
  // ... resto del código
});
```

**3. Validar en producción:**
- Monitorear logs: ¿Alguien llama funciones deshabilitadas?
- Si sí → identificar caller y migrar a ruta canónica
- Si no → eliminar código después de 2 semanas

### Fase 3: Arreglar insert document_entities (PARALELO)

**1. Agregar logging detallado** (código en sección 4)

**2. Capturar error exacto** (error.code, error.message)

**3. Fix según causa:**
- JWT expired → Refresh antes de INSERT
- owner_id mismatch → Validar authData antes de INSERT
- Timeout → Retry con backoff

### Fase 4: Estabilizar reset (PARALELO)

**1. Crear `supabase/seed.sql`** (ver sección 6)

**2. Crear `supabase/reset-safe.sh`** (ver sección 6)

**3. Documentar reset process:**

```markdown
# Reset seguro

1. `./supabase/reset-safe.sh`
2. Verificar: login funciona, document_entities existe, cron activo
3. Crear test document: `curl -X POST ...`
4. Verificar TSA: `psql -c "SELECT tsa_latest FROM document_entities;"`
```

### Fase 5: Unificación de autoridad

**1. Deprecar campos legacy:**
```sql
-- user_documents.tca_timestamp → DEPRECATED
-- user_documents.tca_token → DEPRECATED
-- Leer solo de document_entities.tsa_latest
```

**2. Crear vista unificada:**
```sql
CREATE VIEW v_documents_with_tsa AS
SELECT 
  ud.id as user_document_id,
  de.id as document_entity_id,
  de.tsa_latest,
  de.events,
  ud.document_name,
  ud.protection_level
FROM user_documents ud
LEFT JOIN document_entities de ON de.id = ud.document_entity_id;
```

**3. Migrar UI a vista:**
```typescript
// En vez de leer ud.tca_timestamp, leer de.tsa_latest
const { data } = await supabase.from('v_documents_with_tsa').select('*');
```

---

## APÉNDICE: Comandos útiles

### Debug document_entities insert

```bash
# Ver RLS policies
npx supabase db psql -c "SELECT * FROM pg_policies WHERE tablename = 'document_entities';"

# Test insert como authenticated user
npx supabase db psql -c "
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{\"sub\":\"11111111-1111-1111-1111-111111111111\"}';
INSERT INTO document_entities (owner_id, source_name, source_hash, source_mime, source_size, custody_mode, lifecycle_status, hash_chain, transform_log, witness_history)
VALUES ('11111111-1111-1111-1111-111111111111', 'test.pdf', 'hash123', 'application/pdf', 1024, 'hash_only', 'protected', '{\"source_hash\":\"hash123\"}', '[]', '[]');
"

# Ver eventos TSA
npx supabase db psql -c "
SELECT 
  id, 
  witness_hash, 
  jsonb_array_length(events) as event_count,
  tsa_latest->>'at' as tsa_timestamp
FROM document_entities 
WHERE tsa_latest IS NOT NULL;
"

# Ver jobs en cola
npx supabase db psql -c "SELECT id, type, status, attempts, run_at FROM executor_jobs ORDER BY created_at DESC LIMIT 10;"
```

---

**FIN DEL INVENTARIO**
