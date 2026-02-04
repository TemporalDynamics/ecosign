# 📊 ANÁLISIS PROFUNDO: RLS POLICIES EN SUPABASE

**Fecha:** 2026-02-04  
**Scope:** Row Level Security policies para document_entities y tablas críticas  
**Estado:** Parcialmente implementadas, debugging en proceso

---

## 📈 RESUMEN EJECUTIVO

### Estado Actual
- ✅ **RLS Enabled:** Habilitado en document_entities, anchors, notifications
- ❌ **INSERT Policies:** Bloqueando inserts en tests (service_role)
- ⚠️ **Test Status:** 6 tests SKIPPED en tsaEvents.test.ts
- 🔴 **Error:** "Document creation failed (RLS policy may be blocking)"

### Crítico para Canary
- ❌ **Bloqueante:** RLS policies pueden romper signature flow en producción
- ⚠️ **Riesgo:** INSERT policies demasiado restrictivas
- ⚠️ **Validación:** No hay auditoría completa de policies

---

## 🔍 EL PROBLEMA ESPECÍFICO

### Ubicación del Error
```
File: tests/integration/tsaEvents.test.ts
Line: 68
Error: "Document creation failed (RLS policy may be blocking)"

Context:
  1. Test intenta crear document_entities usando ANON_KEY (authenticated user)
  2. Insert falla silenciosamente
  3. docData es null
  4. Error no es capturado
```

### El Test que Falla
```typescript
// tests/integration/tsaEvents.test.ts:43-68
const { data: docData, error: docError } = await supabase
  .from('document_entities')
  .insert({
    owner_id: testUserId,
    source_name: 'tsa-test.pdf',
    source_mime: 'application/pdf',
    source_size: 1024,
    source_hash: 'a'.repeat(64),
    source_captured_at: new Date().toISOString(),
    custody_mode: 'hash_only',
    lifecycle_status: 'witness_ready',
    witness_current_hash: 'b'.repeat(64),
    witness_current_mime: 'application/pdf',
    witness_current_status: 'generated',
    witness_hash: 'b'.repeat(64),
    hash_chain: {
      source_hash: 'a'.repeat(64),
      witness_hash: 'b'.repeat(64),
    },
    events: [],
  })
  .select('id')
  .single();

if (docError) throw docError;
if (!docData) throw new Error('Document creation failed (RLS policy may be blocking)');
//                          ❌ THIS LINE - docData is null
```

### Por Qué Falla Silenciosamente
1. INSERT tiene RLS policy restrictiva
2. Policy bloquea al user autenticado
3. Supabase retorna `{ data: null, error: null }`
4. No hay error explícito, solo data vacío
5. Test no detecta la diferencia entre "no creó" vs "error"

---

## 🏗️ ARQUITECTURA RLS ACTUAL

### Tablas con RLS Habilitado

**document_entities:**
```sql
-- Estado: RLS ENABLED + FORCE
-- Propósito: Proteger documentos por propietario
-- Policies esperadas:
  - SELECT: owner_id = auth.uid()
  - INSERT: owner_id = auth.uid()
  - UPDATE: owner_id = auth.uid()
  - DELETE: owner_id = auth.uid()
```

**anchors:**
```sql
-- Estado: RLS ENABLED
-- Propósito: Proteger anchors (Polygon/Bitcoin)
-- Policies: Similar a document_entities
```

**notifications:**
```sql
-- Estado: RLS ENABLED
-- Propósito: Notificaciones por usuario
-- Policies: recipient_id = auth.uid()
```

**workflow_fields:**
```sql
-- Estado: RLS ENABLED
-- Propósito: Proteger campos de firma
-- Policies: owner_id = auth.uid()
```

### Queries de Audit Disponibles

Ya existen en `docs/security/rls/`:
1. **rls_audit.sql** - Verificar estado RLS
2. **rls_audit_fix.sql** - Arreglar policies
3. **rls_audit_role.sql** - Verificar roles
4. **rls_audit_service.sql** - Service_role test
5. **rls_tests_fixed*.sql** - Tests variados (5 versiones)
6. **TSA_VERIFICATION_QUERIES.sql** - TSA-specific checks

---

## 🔴 PROBLEMAS IDENTIFICADOS

### Problema #1: INSERT Policy Bloqueando Authenticated Users

**Síntoma:**
```
docData = null (sin error)
→ RLS policy está silenciosamente bloqueando INSERT
```

**Causa Probable:**
```sql
-- Posible policy incorrecta:
CREATE POLICY "insert_own_documents" ON document_entities
  FOR INSERT
  WITH CHECK (owner_id = auth.uid())  -- ✅ Esto es correcto

-- PERO: Policy podría no existir → All inserts denied by default
-- O: Policy existe pero tiene condición incorrecta
```

**Diagnóstico Necesario:**
```sql
-- ¿Existe policy INSERT?
SELECT * FROM pg_policies 
WHERE tablename = 'document_entities' 
  AND cmd = 'INSERT';

-- ¿INSERT policy está activo?
SELECT * FROM pg_policies 
WHERE tablename = 'document_entities' 
  AND cmd = 'INSERT' 
  AND permissive = true;
```

### Problema #2: service_role Insert También Falla

**Evidencia del test:**
```
tests/security/rls-debug.test.ts > Debug: Can service_role insert documents?
2. Attempting insert with service_role...
3. Result: { "data": [], ...}  ← Debería ser data.id, no array vacío
```

**Esto es extraño porque:**
- `service_role` debería BYPASS RLS
- El hecho de que retorne `[]` sugiere:
  1. Policy existe pero es MÁS restrictiva que esperado
  2. O tabla tiene trigger/constraint que rechaza inserts
  3. O `select()` después de insert está vacío

**Problema Específico:**
```typescript
.insert({...})
.select('id')  // ← Si insert retorna [], select() también
.single()
```

Si el insert retorna 0 filas, `.single()` falla.

### Problema #3: Tests Están Skipped

**Estado:**
```
✓ tests/integration/tsaEvents.test.ts (6 tests | 6 skipped) 17ms
  ↓ appends TSA event successfully
  ↓ auto-updates tsa_latest on TSA append
  ↓ rejects TSA event with mismatched witness_hash
  ↓ rejects TSA event without token_b64
  ↓ enforces events append-only (cannot shrink)
  ↓ allows multiple TSA events
```

**Causa:**
- Test falla en `beforeAll()` al crear document
- RLS policy bloquea, docData es null
- Excepción es lanzada
- Todos los tests son skipped

---

## 🔧 SOLUCIONES POSIBLES

### Opción A: Verificar RLS Policy Exists

**Paso 1:** Ejecutar rls_audit.sql
```bash
# En Supabase console SQL editor:
-- A1: RLS status
select n.nspname as schema, 
       c.relname as table,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c 
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('document_entities', 'anchors', 'notifications', 'workflow_fields')
order by 1,2;

-- Expected output:
-- public | document_entities | true | false
-- public | anchors           | true | false
-- public | notifications     | true | false
-- public | workflow_fields   | true | false
```

**Paso 2:** Verificar policies INSERT específicamente
```sql
-- A2: Dump de policies
select schemaname, 
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       coalesce(qual::text,'') as using_expr,
       coalesce(with_check::text,'') as with_check_expr
from pg_policies 
where schemaname = 'public'
  and tablename = 'document_entities'
  and cmd = 'INSERT'
order by tablename, cmd, policyname;

-- Expected: Al menos UNA policy with permissive=true
```

**Paso 3:** Si falta INSERT policy, crearla
```sql
CREATE POLICY "insert_own_documents" ON document_entities
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());
```

### Opción B: Debug service_role Insert

```javascript
// tests/security/rls-debug.test.ts - ya existe parcialmente

// 1. Crear con anon
const { data: anonResult, error: anonError } = await anonClient
  .from('document_entities')
  .insert({ owner_id: userId, ... })
  .select('id')
  .single();

console.log('Anon insert result:', { anonResult, anonError });

// 2. Crear con service_role
const { data: srResult, error: srError } = await serviceRoleClient
  .from('document_entities')
  .insert({ owner_id: userId, ... })
  .select('id')
  .single();

console.log('Service role insert result:', { srResult, srError });

// 3. Si ambos fallan → problema con tabla/triggers, no RLS
// 4. Si solo anon falla → RLS policy está correcta (así debe ser)
```

### Opción C: Comprobar Triggers/Constraints

```sql
-- Ver si hay triggers que rechacen inserts
SELECT 
  t.trigger_name,
  t.event_object_table,
  t.trigger_timing,
  t.trigger_events
FROM information_schema.triggers t
WHERE t.event_object_schema = 'public'
  AND t.event_object_table = 'document_entities';

-- Ver constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'document_entities';
```

---

## 📋 CHECKLIST DE VALIDACIÓN RLS

### Antes de Canary

- [ ] **RLS Status Check**
  ```sql
  -- Verificar que RLS está enabled en todas las tablas críticas
  SELECT * FROM pg_class WHERE relname = 'document_entities' AND relrowsecurity = true;
  ```

- [ ] **INSERT Policy Exists**
  ```sql
  -- Verificar que INSERT policy existe y es permissive
  SELECT * FROM pg_policies 
  WHERE tablename = 'document_entities' AND cmd = 'INSERT' AND permissive = true;
  ```

- [ ] **service_role Can Insert**
  ```sql
  -- Verificar que service_role puede bypass RLS
  -- (ya existe en rls_audit_service.sql)
  ```

- [ ] **Authenticated User Can Insert Own**
  ```javascript
  // En test:
  const client = createClient(url, anonKey);
  await client.auth.signUp({email, password});
  const insert = await client.from('document_entities').insert({owner_id: uid, ...});
  // Should succeed
  ```

- [ ] **Authenticated User Cannot Insert Others**
  ```javascript
  // En test:
  const insert = await client.from('document_entities').insert({owner_id: differentUid, ...});
  // Should be silently blocked (RLS behavior)
  ```

- [ ] **TSA Events Test Passes**
  ```bash
  npm run test -- tests/integration/tsaEvents.test.ts
  # Should NOT skip, should have 6 passed tests
  ```

---

## 🎯 RECOMENDACIÓN PARA HOY

### Acción Inmediata

1. **Ejecutar Audit en Supabase Local**
   ```bash
   # Ir a Supabase dashboard (local) > SQL editor
   # Copiar y ejecutar: docs/security/rls/rls_audit.sql
   # Copiar y ejecutar: docs/security/rls/rls_audit_fix.sql (si hay problemas)
   ```

2. **Verificar Específicamente INSERT Policies**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'document_entities' AND cmd = 'INSERT';
   ```

3. **Si INSERT policy falta:**
   ```sql
   CREATE POLICY "insert_own_documents" ON document_entities
     FOR INSERT
     WITH CHECK (owner_id = auth.uid());
   ```

4. **Rerun Tests**
   ```bash
   npm run test -- tests/integration/tsaEvents.test.ts
   ```

### Si Tests Siguen Fallando

- Revisar si hay TRIGGER o CONSTRAINT bloqueando inserts
- Ejecutar rls-debug.test.ts para más detalles
- Verificar que document_entities columns que se insertan existen
- Checkear tipos de datos (ej: custody_mode es string válido)

---

## 📊 MATRIZ DE RLS POLICIES ESPERADAS

| Tabla | SELECT | INSERT | UPDATE | DELETE | Status |
|-------|--------|--------|--------|--------|--------|
| document_entities | ✓ | ? | ✓ | ? | 🔴 INSERT MISSING? |
| anchors | ✓ | ? | ? | ? | 🟡 UNKNOWN |
| notifications | ✓ | ? | ? | ✓ | 🟡 UNKNOWN |
| workflow_fields | ✓ | ? | ? | ? | 🟡 UNKNOWN |

**Legend:**
- ✓ = Policy existe y funciona
- ? = Desconocido, necesita audit
- 🔴 = Problema identificado
- 🟡 = Necesita verificación

---

## 🔐 NOTAS DE SEGURIDAD

### RLS es Crítico Para:
1. **Seguridad multi-tenant** - Un usuario no puede ver otros documentos
2. **Compliance** - Cumplir GDPR (data isolation)
3. **Production safety** - Prevenir data leaks por bugs de código

### Riesgos Si RLS está mal configurado:
- 🔴 **CRITICAL:** User A puede ver User B's documents
- 🔴 **CRITICAL:** User A puede modificar User B's data
- 🟡 **HIGH:** INSERT policy bloqueando usuarios legítimos
- 🟡 **HIGH:** Tests fallan porque policies están mal

### Mejor Práctica:
- ✅ Policies debe ser RESTRICTIVA by default (deny all)
- ✅ Luego PERMITIR específicas operaciones necesarias
- ✅ Audit regularmente con queries de `rls_audit.sql`
- ✅ Test con múltiples usuarios para validar aislamiento

---

## 📚 RECURSOS DISPONIBLES

En tu repo existe:
- `docs/security/rls/rls_audit.sql` - Query de verificación
- `docs/security/rls/rls_audit_fix.sql` - Fixes automáticas
- `docs/security/rls/rls_tests_fixed*.sql` - Tests (5 versiones)
- `tests/security/rls-debug.test.ts` - Debug test
- `tests/integration/tsaEvents.test.ts` - El test que falla

---

## 💡 CONCLUSIÓN

El problema es **RLS policy faltante o demasiado restrictiva**:

1. Test intenta INSERT en document_entities
2. RLS policy bloquea (o no existe)
3. Supabase retorna `{ data: null, error: null }`
4. Test detecta null y lanza error
5. TSA tests están todos skipped

**Próxima acción:** Ejecutar `rls_audit.sql` en Supabase local para ver estado actual de policies.

