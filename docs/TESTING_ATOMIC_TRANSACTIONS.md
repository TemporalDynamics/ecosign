# Testing Atomic Transactions - Guía Completa

Esta guía te ayudará a probar las nuevas funcionalidades implementadas: transacciones atómicas, carpetas de documentos y regeneración de certificados.

## 📋 Resumen de Cambios

### 1. Transacciones Atómicas en Bitcoin Anchoring
- Función `anchor_atomic_tx()` que actualiza 4 tablas de forma atómica:
  - `anchors` (estado del anclaje)
  - `bitcoin_ots_files` (archivo OTS binario)
  - `user_documents` (estado del documento)
  - `audit_logs` (trazabilidad completa)

### 2. Sistema de Carpetas
- Crear carpetas para organizar documentos
- Mover documentos entre carpetas
- Filtrar documentos por carpeta

### 3. Regeneración de Certificados
- Solicitar regeneración de archivos .ECO
- Solicitar generación de archivos .ECOX
- Sistema de cola para procesar solicitudes

---

## 🧪 Plan de Pruebas

### Test 1: Verificar que las Migraciones se Aplicaron Correctamente

```bash
# Verificar que todas las migraciones están sincronizadas
supabase migration list

# Debe mostrar todas las migraciones con Local y Remote alineados
# Especialmente estas nuevas:
# 20251208090000 | 20251208090000 | anchor_atomic_tx
# 20251208100000 | 20251208100000 | create_bitcoin_ots_files
# 20251208110000 | 20251208110000 | document_folders_and_privacy
# 20251208110001 | 20251208110001 | nda_templates_events
# 20251208113000 | 20251208113000 | document_folder_functions
```

**✅ Esperado:** Todas las migraciones deben estar en estado `Local | Remote` (sincronizadas).

---

### Test 2: Verificar las Funciones RPC en la Base de Datos

Crea un archivo `scripts/test-atomic-functions.sql` con:

```sql
-- Test 1: Verificar que la función anchor_atomic_tx existe
SELECT
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'anchor_atomic_tx';

-- Test 2: Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'bitcoin_ots_files',
  'document_folders',
  'nda_templates',
  'nda_events',
  'certificate_regeneration_requests'
)
ORDER BY table_name;

-- Test 3: Verificar que las funciones RPC de carpetas existen
SELECT
  proname as function_name
FROM pg_proc
WHERE proname IN (
  'create_document_folder',
  'rename_document_folder',
  'delete_document_folder',
  'move_documents_to_folder',
  'request_certificate_regeneration'
)
ORDER BY proname;

-- Test 4: Verificar políticas RLS
SELECT
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('document_folders', 'bitcoin_ots_files', 'nda_templates')
ORDER BY tablename, policyname;
```

Ejecuta:
```bash
supabase db execute --file scripts/test-atomic-functions.sql
```

**✅ Esperado:**
- `anchor_atomic_tx` debe aparecer con 6 argumentos
- Las 5 tablas deben existir
- Las 5 funciones RPC deben existir
- Cada tabla debe tener al menos 1 política RLS

---

### Test 3: Probar el Sistema de Carpetas (Frontend)

#### 3.1 Crear una Carpeta

1. Abre la aplicación en el navegador
2. Ve a la página de Documentos
3. Busca el botón "Nueva Carpeta" o similar
4. Crea una carpeta llamada "Test Folder"

**Verificar en la base de datos:**
```bash
# Buscar la carpeta creada
supabase db execute --sql "SELECT id, name, user_id, created_at FROM document_folders ORDER BY created_at DESC LIMIT 5;"
```

**✅ Esperado:** Debe aparecer la carpeta "Test Folder" con tu user_id.

#### 3.2 Mover un Documento a una Carpeta

1. Selecciona un documento existente
2. Usa la opción "Mover a carpeta" o similar
3. Selecciona "Test Folder"

**Verificar:**
```bash
supabase db execute --sql "SELECT id, document_name, folder_id FROM user_documents WHERE folder_id IS NOT NULL LIMIT 5;"
```

**✅ Esperado:** El documento debe tener `folder_id` apuntando a la carpeta creada.

---

### Test 4: Probar la Regeneración de Certificados

#### 4.1 Solicitar Regeneración de .ECO

1. Busca un documento que tenga `eco_hash` pero el archivo no esté disponible
2. Haz clic en "Regenerar .ECO"
3. Verifica que aparezca un mensaje de confirmación

**Verificar en la base de datos:**
```bash
supabase db execute --sql "SELECT id, document_id, request_type, status, created_at FROM certificate_regeneration_requests ORDER BY created_at DESC LIMIT 5;"
```

**✅ Esperado:** Debe aparecer una solicitud con `request_type = 'eco'` y `status = 'pending'`.

#### 4.2 Solicitar Generación de .ECOX

1. Busca un documento que no tenga archivo .ECOX
2. Haz clic en "Solicitar .ECOX"
3. Verifica que aparezca un mensaje de confirmación

**Verificar:**
```bash
supabase db execute --sql "SELECT id, document_id, request_type, status, created_at FROM certificate_regeneration_requests WHERE request_type = 'ecox' ORDER BY created_at DESC LIMIT 5;"
```

**✅ Esperado:** Debe aparecer una solicitud con `request_type = 'ecox'` y `status = 'pending'`.

---

### Test 5: Probar Transacciones Atómicas (Anclaje Bitcoin)

Este test requiere tener un anclaje pendiente en la base de datos.

#### 5.1 Crear un Anclaje de Prueba (Manual)

```sql
-- Crear un anclaje de prueba
INSERT INTO anchors (
  user_id,
  document_hash,
  anchor_type,
  anchor_status,
  ots_proof,
  ots_calendar_url,
  user_email
) VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Usa tu user_id
  'test_hash_' || gen_random_uuid()::text,
  'opentimestamps',
  'pending',
  'test_ots_base64_proof_here',
  'https://a.pool.opentimestamps.org',
  'tu-email@example.com'
) RETURNING id, document_hash;
```

Guarda el `id` del anclaje creado.

#### 5.2 Simular Confirmación con Transacción Atómica

```sql
-- Llamar a la función atómica para confirmar el anclaje
SELECT anchor_atomic_tx(
  _anchor_id := 'ANCLAJE_ID_AQUI'::uuid,
  _anchor_user_id := (SELECT user_id FROM anchors WHERE id = 'ANCLAJE_ID_AQUI'::uuid),
  _ots := decode('dGVzdF9vdHNfZGF0YQ==', 'base64'), -- bytes de prueba
  _metadata := '{"bitcoin_tx": "test_tx_123", "block": 800000, "confirmed_at": "2025-12-02T12:00:00Z"}'::jsonb,
  _user_document_updates := NULL,
  _bitcoin_attempts := 1
);
```

#### 5.3 Verificar el Resultado

```bash
# Verificar que el anclaje se actualizó
supabase db execute --sql "SELECT id, anchor_status, bitcoin_tx_id, bitcoin_block_height, confirmed_at FROM anchors WHERE id = 'ANCLAJE_ID_AQUI'::uuid;"

# Verificar que se guardó el archivo OTS
supabase db execute --sql "SELECT anchor_id, length(ots_content) as ots_size, created_at FROM bitcoin_ots_files WHERE anchor_id = 'ANCLAJE_ID_AQUI'::uuid;"

# Verificar que se creó el audit_log
supabase db execute --sql "SELECT action, metadata FROM audit_logs WHERE metadata->>'anchor_id' = 'ANCLAJE_ID_AQUI' ORDER BY created_at DESC LIMIT 1;"
```

**✅ Esperado:**
- `anchors.anchor_status` = `'confirmed'`
- `anchors.bitcoin_tx_id` = `'test_tx_123'`
- `bitcoin_ots_files` debe tener un registro con el contenido OTS
- `audit_logs` debe tener un registro con `action = 'bitcoin_anchor_finalized'`

---

### Test 6: Probar la Edge Function con Transacciones Atómicas

#### 6.1 Invocar la Función Manualmente

```bash
# Obtener el SERVICE_ROLE_KEY desde .env o Supabase Dashboard
export SERVICE_ROLE_KEY="tu_service_role_key_aqui"

# Invocar la función
supabase functions invoke process-bitcoin-anchors \
  --project-ref uiyojopjbhooxrmamaiw \
  --headers "Authorization: Bearer $SERVICE_ROLE_KEY" \
  --body '{}'
```

#### 6.2 Ver los Logs

```bash
# Ver logs en tiempo real
supabase functions logs process-bitcoin-anchors --tail

# Buscar en los logs:
# ✅ "Anchor XXXXX atomically confirmed in Bitcoin!"
# ✅ "Atomic transaction failed" (si hay errores)
```

**✅ Esperado:**
- La función debe ejecutarse sin errores
- Los logs deben mostrar confirmaciones atómicas
- No debe haber mensajes de "Failed to update user_documents"

---

### Test 7: Probar Rollback en Caso de Error

Este test verifica que si algo falla, toda la transacción se revierte.

#### 7.1 Crear un Escenario de Error

```sql
-- Crear un anclaje con user_document_id inválido
INSERT INTO anchors (
  user_id,
  document_hash,
  anchor_type,
  anchor_status,
  user_document_id -- ID que no existe
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'test_rollback_' || gen_random_uuid()::text,
  'opentimestamps',
  'pending',
  '00000000-0000-0000-0000-000000000000'::uuid -- ID inválido
) RETURNING id;
```

#### 7.2 Intentar Confirmar con Transacción Atómica

```sql
SELECT anchor_atomic_tx(
  _anchor_id := 'ANCLAJE_ID_AQUI'::uuid,
  _anchor_user_id := (SELECT user_id FROM anchors WHERE id = 'ANCLAJE_ID_AQUI'::uuid),
  _ots := decode('dGVzdA==', 'base64'),
  _metadata := '{"bitcoin_tx": "test_tx"}'::jsonb,
  _user_document_updates := '{"document_id": "00000000-0000-0000-0000-000000000000", "bitcoin_status": "confirmed"}'::jsonb,
  _bitcoin_attempts := 1
);
```

**✅ Esperado:**
- Debe fallar con un error (documento no encontrado)
- `anchors.anchor_status` NO debe cambiar (todavía `'pending'`)
- NO debe haber registro en `bitcoin_ots_files`
- NO debe haber registro en `audit_logs`

Esto demuestra que la transacción atómica funciona correctamente: si una parte falla, todo se revierte.

---

## 🎯 Resumen de Resultados Esperados

| Test | Componente | Resultado Esperado |
|------|------------|-------------------|
| 1 | Migraciones | Todas sincronizadas Local ↔ Remote |
| 2 | Funciones RPC | 5 funciones + 5 tablas + políticas RLS |
| 3 | Carpetas Frontend | Crear/mover carpetas funciona |
| 4 | Regeneración Frontend | Solicitudes se crean correctamente |
| 5 | Transacción Atómica | 4 tablas se actualizan juntas |
| 6 | Edge Function | Logs muestran confirmaciones atómicas |
| 7 | Rollback | Error revierte toda la transacción |

---

## 🐛 Troubleshooting

### Error: "function anchor_atomic_tx does not exist"
**Solución:** Ejecuta `supabase db push` para aplicar las migraciones.

### Error: "permission denied for function anchor_atomic_tx"
**Solución:** Verifica que estás usando `service_role` key, no `anon` key.

### No aparece el botón "Regenerar .ECO"
**Solución:** El botón solo aparece si `eco_hash` existe pero el archivo no está disponible. Verifica que `eco_storage_path` sea NULL o apunte a un archivo inexistente.

### La transacción atómica falla con "anchor not found"
**Solución:** Verifica que el `anchor_id` existe en la tabla `anchors` antes de llamar a `anchor_atomic_tx()`.

---

## 📝 Notas Importantes

1. **Service Role Key:** Guarda tu `SERVICE_ROLE_KEY` de forma segura, nunca la expongas en el frontend.

2. **Audit Logs:** Todos los anclajes confirmados ahora dejan un rastro en `audit_logs` con `action = 'bitcoin_anchor_finalized'`.

3. **Binary Storage:** Los archivos OTS ahora se almacenan en formato binario (`bytea`) en lugar de base64, lo que reduce el tamaño en ~33%.

4. **Rollback Automático:** Si cualquier parte de la transacción atómica falla, PostgreSQL revierte TODOS los cambios automáticamente.

---

## ✅ Checklist Final

- [ ] Test 1: Migraciones sincronizadas
- [ ] Test 2: Funciones RPC verificadas
- [ ] Test 3: Sistema de carpetas funcional
- [ ] Test 4: Regeneración de certificados funcional
- [ ] Test 5: Transacción atómica funciona
- [ ] Test 6: Edge Function usa transacciones atómicas
- [ ] Test 7: Rollback funciona correctamente

Una vez completados todos los tests, las transacciones atómicas estarán listas para producción.
