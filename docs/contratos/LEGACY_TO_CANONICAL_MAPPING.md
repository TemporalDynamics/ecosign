# Mapeo Legacy → Canónico: Documentos

## Fecha
27 de enero de 2026

## Propósito
Definir inequívocamente cómo se mapean los campos y conceptos legacy al modelo canónico basado en `document_entities`.

---

## 🗺️ Tabla de Mapeo Completa

### Tabla `user_documents` → `document_entities`

| Campo Legacy (`user_documents`) | Campo Canónico (`document_entities`) | Estrategia | Destino |
|--------------------------------|--------------------------------------|------------|---------|
| `id` | `id` | Migrar | Persistir (UUID) |
| `user_id` | `owner_id` | Migrar | Persistir (UUID) |
| `document_hash` | `source_hash` | Migrar | Persistir (hash original) |
| `document_name` | `events[]` | Migrar a evento | Persistir como evento `document.created` |
| `document_size` | `events[]` | Migrar a evento | Persistir como evento `document.created` |
| `document_type` | `events[]` | Migrar a evento | Persistir como evento `document.created` |
| `pdf_storage_path` | `events[]` | Migrar a evento | Persistir como evento `document.stored` |
| `eco_hash` | `witness_hash` | Migrar | Persistir (hash con evidencia) |
| `eco_storage_path` | `events[]` | Migrar a evento | Persistir como evento `artifact.completed` |
| `tsa_token` | `events[]` | Migrar a evento | Persistir como evento `tsa.confirmed` |
| `tsa_confirmed_at` | `events[]` | Migrar a evento | Persistir como evento `tsa.confirmed` |
| `polygon_tx_hash` | `events[]` | Migrar a evento | Persistir como evento `anchor.confirmed` |
| `polygon_confirmed_at` | `events[]` | Migrar a evento | Persistir como evento `anchor.confirmed` |
| `polygon_status` | `lifecycle_status` | Derivar | Eliminar de legacy, derivar de eventos |
| `bitcoin_tx_hash` | `events[]` | Migrar a evento | Persistir como evento `anchor.confirmed` |
| `bitcoin_confirmed_at` | `events[]` | Migrar a evento | Persistir como evento `anchor.confirmed` |
| `bitcoin_status` | `lifecycle_status` | Derivar | Eliminar de legacy, derivar de eventos |
| `status` | `lifecycle_status` | Derivar | Eliminar de legacy, derivar de eventos |
| `overall_status` | `lifecycle_status` | Derivar | Eliminar de legacy, derivar de eventos |
| `eco_data` | Generado desde `events[]` | Regenerar | Eliminar de legacy, generar desde eventos |
| `eco_json` | Generado desde `events[]` | Regenerar | Eliminar de legacy, generar desde eventos |
| `eco_xml` | Generado desde `events[]` | Regenerar | Eliminar de legacy, generar desde eventos |
| `protection_level` | `lifecycle_status` | Derivar | Eliminar de legacy, derivar de eventos |
| `created_at` | `created_at` | Migrar | Persistir |
| `updated_at` | `updated_at` | Migrar | Persistir |

### Tabla `documents` → `document_entities`

| Campo Legacy (`documents`) | Campo Canónico (`document_entities`) | Estrategia | Destino |
|----------------------------|--------------------------------------|------------|---------|
| `id` | `id` | Migrar | Persistir (UUID) |
| `user_id` | `owner_id` | Migrar | Persistir (UUID) |
| `document_hash` | `source_hash` | Migrar | Persistir (hash original) |
| `filename` | `events[]` | Migrar a evento | Persistir como evento `document.created` |
| `file_size` | `events[]` | Migrar a evento | Persistir como evento `document.created` |
| `file_type` | `events[]` | Migrar a evento | Persistir como evento `document.created` |
| `storage_path` | `events[]` | Migrar a evento | Persistir como evento `document.stored` |
| `status` | `lifecycle_status` | Derivar | Eliminar de legacy, derivar de eventos |
| `eco_data` | Generado desde `events[]` | Regenerar | Eliminar de legacy, generar desde eventos |
| `created_at` | `created_at` | Migrar | Persistir |
| `updated_at` | `updated_at` | Migrar | Persistir |

---

## 🔄 Estrategias de Migración

### 1. **Migrar** (Persistir)
- **Objetivo**: Campo esencial que debe existir en modelo canónico
- **Acción**: Copiar valor directamente al campo canónico correspondiente
- **Ejemplos**: `id`, `owner_id`, `source_hash`, `created_at`

### 2. **Migrar a Evento** (Transformar)
- **Objetivo**: Información que debe existir como parte de la historia
- **Acción**: Convertir campo en evento canónico en `events[]`
- **Ejemplos**: `pdf_storage_path` → evento `document.stored`, `tsa_token` → evento `tsa.confirmed`

### 3. **Derivar** (Calcular)
- **Objetivo**: Estado que se puede calcular desde eventos
- **Acción**: Eliminar campo de legacy, calcular desde `events[]`
- **Ejemplos**: `status`, `overall_status`, `protection_level`

### 4. **Regenerar** (Generar)
- **Objetivo**: Datos que se pueden recrear desde eventos
- **Acción**: Eliminar de legacy, generar desde `events[]` cuando se necesite
- **Ejemplos**: `eco_data`, `eco_json`, `eco_xml`

### 5. **Eliminar** (Descartar)
- **Objetivo**: Campos duplicados o innecesarios
- **Acción**: Eliminar completamente
- **Ejemplos**: Campos calculables que se persistieron

---

## 📋 Checklist de Mapeo Completo

### Campos de `user_documents` (verificados):
- [x] `id` → `document_entities.id`
- [x] `user_id` → `document_entities.owner_id`
- [x] `document_hash` → `document_entities.source_hash`
- [x] `document_name` → `document_entities.events[]` (evento `document.created`)
- [x] `document_size` → `document_entities.events[]` (evento `document.created`)
- [x] `document_type` → `document_entities.events[]` (evento `document.created`)
- [x] `pdf_storage_path` → `document_entities.events[]` (evento `document.stored`)
- [x] `eco_hash` → `document_entities.witness_hash`
- [x] `eco_storage_path` → `document_entities.events[]` (evento `artifact.completed`)
- [x] `tsa_token` → `document_entities.events[]` (evento `tsa.confirmed`)
- [x] `tsa_confirmed_at` → `document_entities.events[]` (evento `tsa.confirmed`)
- [x] `polygon_tx_hash` → `document_entities.events[]` (evento `anchor.confirmed`)
- [x] `polygon_confirmed_at` → `document_entities.events[]` (evento `anchor.confirmed`)
- [x] `polygon_status` → derivar de `document_entities.events[]`
- [x] `bitcoin_tx_hash` → `document_entities.events[]` (evento `anchor.confirmed`)
- [x] `bitcoin_confirmed_at` → `document_entities.events[]` (evento `anchor.confirmed`)
- [x] `bitcoin_status` → derivar de `document_entities.events[]`
- [x] `status` → derivar de `document_entities.events[]`
- [x] `overall_status` → derivar de `document_entities.events[]`
- [x] `eco_data` → generar desde `document_entities.events[]`
- [x] `eco_json` → generar desde `document_entities.events[]`
- [x] `eco_xml` → generar desde `document_entities.events[]`
- [x] `protection_level` → derivar de `document_entities.events[]`
- [x] `created_at` → `document_entities.created_at`
- [x] `updated_at` → `document_entities.updated_at`

### Campos de `documents` (verificados):
- [x] `id` → `document_entities.id`
- [x] `user_id` → `document_entities.owner_id`
- [x] `document_hash` → `document_entities.source_hash`
- [x] `filename` → `document_entities.events[]` (evento `document.created`)
- [x] `file_size` → `document_entities.events[]` (evento `document.created`)
- [x] `file_type` → `document_entities.events[]` (evento `document.created`)
- [x] `storage_path` → `document_entities.events[]` (evento `document.stored`)
- [x] `status` → derivar de `document_entities.events[]`
- [x] `eco_data` → generar desde `document_entities.events[]`
- [x] `created_at` → `document_entities.created_at`
- [x] `updated_at` → `document_entities.updated_at`

---

## 🚫 Campos que NO Tienen Destino Canónico

### Estos campos se eliminan completamente:
- `user_documents.eco_data` → se genera desde eventos
- `user_documents.eco_json` → se genera desde eventos
- `user_documents.eco_xml` → se genera desde eventos
- `user_documents.status` → se deriva de eventos
- `user_documents.overall_status` → se deriva de eventos
- `user_documents.polygon_status` → se deriva de eventos
- `user_documents.bitcoin_status` → se deriva de eventos
- `user_documents.protection_level` → se deriva de eventos
- `documents.status` → se deriva de eventos
- `documents.eco_data` → se genera desde eventos

---

## 🧩 Eventos Canónicos Equivalentes

### Eventos para reemplazar campos legacy:

| Campo Legacy | Evento Canónico | Payload |
|--------------|-----------------|---------|
| `pdf_storage_path` | `document.stored` | `{ storage_path: "...", document_size: 12345 }` |
| `tsa_token` + `tsa_confirmed_at` | `tsa.confirmed` | `{ token_b64: "...", confirmed_at: "..." }` |
| `polygon_tx_hash` + `polygon_confirmed_at` | `anchor.confirmed` | `{ network: "polygon", tx_hash: "...", confirmed_at: "..." }` |
| `bitcoin_tx_hash` + `bitcoin_confirmed_at` | `anchor.confirmed` | `{ network: "bitcoin", tx_hash: "...", confirmed_at: "..." }` |
| `eco_storage_path` | `artifact.completed` | `{ storage_path: "...", artifact_type: "eco" }` |

---

## 🔄 Flujo de Transformación

### Para cada documento legacy:
1. **Extraer campos** del modelo legacy
2. **Convertir campos** a eventos canónicos
3. **Crear entidad canónica** con campos obligatorios
4. **Agregar eventos** con datos legacy transformados
5. **Derivar estado** desde eventos (eliminar campos derivados de legacy)

### Ejemplo de transformación:
```typescript
// Antes (legacy)
const legacyDoc = {
  id: 'uuid123',
  user_id: 'user456',
  document_hash: 'hash789',
  pdf_storage_path: 'bucket/path.pdf',
  tsa_token: 'tsa123',
  status: 'protected'
};

// Después (canónico)
const canonicalEntity = {
  id: 'uuid123',
  owner_id: 'user456',
  source_hash: 'hash789',
  witness_hash: 'hash789', // o hash con TSA
  events: [
    {
      kind: 'document.created',
      at: '2026-01-27T14:30:00.000Z',
      payload: { storage_path: 'bucket/path.pdf', document_size: 12345 }
    },
    {
      kind: 'tsa.confirmed',
      at: '2026-01-27T14:31:00.000Z',
      payload: { token_b64: 'tsa123' }
    }
  ],
  lifecycle_status: 'protected', // derivado de eventos
  created_at: '2026-01-27T14:30:00.000Z',
  updated_at: '2026-01-27T14:31:00.000Z'
};
```

---

## 🧮 Funciones de Transformación

### Funciones necesarias:
- `legacyToCanonicalEntity(legacyDoc)` - Transforma documento legacy a canónico
- `deriveLifecycleStatus(events[])` - Deriva estado desde eventos
- `generateEcoV2(events[])` - Genera ECO desde eventos
- `mapLegacyFieldToEvent(field, value)` - Mapea campo a evento

---

## ✅ Validación Final

### Antes de continuar:
- [ ] Todos los campos legacy tienen destino claro
- [ ] No hay campos sin estrategia definida
- [ ] Eventos canónicos equivalentes definidos
- [ ] Funciones de transformación especificadas
- [ ] Flujo de transformación documentado

---

**Firmado**: Arquitectura Canónica Ecosign  
**Fecha**: 27 de enero de 2026  
**Versión**: 1.0 - Mapeo Legacy → Canónico