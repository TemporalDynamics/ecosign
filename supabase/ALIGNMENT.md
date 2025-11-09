# Alineación: Netlify Functions ↔ Supabase Schema

Este documento verifica que los nombres de columnas y tablas en el código TypeScript coinciden con el schema SQL.

---

## ✅ Verificación de Nombres

### Tabla: `documents`

| Campo TypeScript | Campo SQL | Status |
|------------------|-----------|--------|
| `id` | `id` | ✅ |
| `owner_id` | `owner_id` | ✅ |
| `title` | `title` | ✅ |
| `eco_hash` | `eco_hash` | ✅ |
| `ecox_hash` | `ecox_hash` | ✅ |
| `status` | `status` | ✅ |
| `created_at` | `created_at` | ✅ |

**Usado en**: `generate-link.ts` (línea 74)

---

### Tabla: `links`

| Campo TypeScript | Campo SQL | Status |
|------------------|-----------|--------|
| `id` | `id` | ✅ |
| `document_id` | `document_id` | ✅ |
| `token_hash` | `token_hash` | ✅ |
| `expires_at` | `expires_at` | ✅ |
| `revoked_at` | `revoked_at` | ✅ |
| `require_nda` | `require_nda` | ✅ |
| `created_at` | `created_at` | ✅ |

**Usado en**:
- `generate-link.ts` (línea 95)
- `verify-access.ts` (línea 50)

---

### Tabla: `recipients`

| Campo TypeScript | Campo SQL | Status |
|------------------|-----------|--------|
| `id` | `id` | ✅ |
| `document_id` | `document_id` | ✅ |
| `email` | `email` | ✅ |
| `recipient_id` | `recipient_id` | ✅ |
| `created_at` | `created_at` | ✅ |

**Usado en**:
- `generate-link.ts` (línea 85)
- `verify-access.ts` (línea 77)

---

### Tabla: `nda_acceptances`

| Campo TypeScript | Campo SQL | Status |
|------------------|-----------|--------|
| `id` | `id` | ✅ |
| `recipient_id` | `recipient_id` | ✅ |
| `eco_nda_hash` | `eco_nda_hash` | ✅ |
| `accepted_at` | `accepted_at` | ✅ |
| `ip_address` | `ip_address` | ✅ |
| `user_agent` | `user_agent` | ✅ |
| `signature_data` | `signature_data` | ✅ |

**Usado en**: `verify-access.ts` (línea 95)

---

### Tabla: `access_events`

| Campo TypeScript | Campo SQL | Status |
|------------------|-----------|--------|
| `id` | `id` | ✅ |
| `recipient_id` | `recipient_id` | ✅ |
| `event_type` | `event_type` | ✅ |
| `timestamp` | `timestamp` | ✅ |
| `ip_address` | `ip_address` | ✅ |
| `user_agent` | `user_agent` | ✅ |
| `country` | `country` | ✅ |
| `session_id` | `session_id` | ✅ |

**Usado en**: `log-event.ts` (línea 60)

---

### Tabla: `anchors`

| Campo TypeScript | Campo SQL | Status |
|------------------|-----------|--------|
| `id` | `id` | ✅ |
| `document_id` | `document_id` | ✅ |
| `chain` | `chain` | ✅ |
| `tx_id` | `tx_id` | ✅ |
| `proof_url` | `proof_url` | ✅ |
| `anchored_at` | `anchored_at` | ✅ |

**Usado en**: `anchor.ts` (existente)

---

## ✅ Verificación de Types

### Event Types

**TypeScript** (`validation.ts:145`):
```typescript
type EventType = 'view' | 'download' | 'forward';
```

**SQL** (`001_core_schema.sql:53`):
```sql
CHECK (event_type IN ('view', 'download', 'forward'))
```

✅ **Alineados**

---

### Document Status

**TypeScript** (implícito en `generate-link.ts:75`):
```typescript
.eq('status', 'active')
```

**SQL** (`001_core_schema.sql:21`):
```sql
CHECK (status IN ('active', 'revoked', 'archived'))
```

✅ **Alineados**

---

### Chain Types

**SQL** (`001_core_schema.sql:77`):
```sql
CHECK (chain IN ('bitcoin', 'polygon', 'ethereum'))
```

✅ **Definido (usar en anchor.ts)**

---

## ✅ Verificación de Indexes

Todos los índices optimizan queries reales en las Functions:

| Index | Usado en Function | Query |
|-------|-------------------|-------|
| `idx_links_token` | `verify-access.ts:50` | `.eq('token_hash', tokenHash)` |
| `idx_recipients_document` | `generate-link.ts:85` | `.eq('document_id', document_id)` |
| `idx_access_events_recipient` | Dashboard (futuro) | Listar eventos por recipient |
| `idx_documents_owner` | Dashboard | Listar docs del usuario |

✅ **Todos justificados**

---

## ✅ Verificación de RLS

### generate-link.ts → RLS

**Código** (línea 74):
```typescript
.eq('owner_id', document.owner_id)  // Implícito vía RLS
```

**SQL**:
```sql
CREATE POLICY "Owners can view their documents"
USING (auth.uid() = owner_id);
```

✅ **Protegido por RLS**

---

### verify-access.ts → Service Role

**Código** (línea 95):
```typescript
// Usa getSupabaseClient() con service_role_key
await supabase.from('nda_acceptances').insert(...)
```

**SQL**:
```sql
-- No policy needed, service_role bypasses RLS
GRANT ALL ON nda_acceptances TO service_role;
```

✅ **Service role tiene permisos**

---

## ✅ Verificación de Storage Paths

### eco-files

**TypeScript** (`storage.ts:55` y `verify-access.ts:117`):
```typescript
const filePath = `${owner_id}/${document_id}/certificate.eco`;
```

**SQL Policy**:
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

✅ **Path format coincide**

---

## 🎯 Resumen

| Componente | Status | Notas |
|------------|--------|-------|
| Nombres de tablas | ✅ | Todos coinciden |
| Nombres de columnas | ✅ | 100% alineados |
| Types/Enums | ✅ | event_type, status, chain |
| Índices | ✅ | Optimizan queries reales |
| RLS Policies | ✅ | Protegen correctamente |
| Storage Policies | ✅ | Path format correcto |

---

## 📝 Próximos Pasos

1. **Ejecutar migrations** en Supabase Dashboard
2. **Crear buckets** en Storage
3. **Configurar Auth** (SMTP + templates)
4. **Testear Functions** localmente con `netlify dev`

---

**Última verificación**: 2025-11-09
**Versión Schema**: 1.0.0
**Versión Functions**: 1.0.0
