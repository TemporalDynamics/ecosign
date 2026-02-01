# Contrato Canónico: Document Entity Model

## Fecha
27 de enero de 2026

## Propósito
Definir inequívocamente qué es un documento en el sistema canónico Ecosign, estableciendo `document_entities` como la única fuente de verdad.

---

## 🧱 Definición Canónica de "Documento"

### ¿Qué es un documento en el sistema Ecosign?

Un documento es una **entidad canónica** representada por un registro en la tabla `document_entities` que contiene:

1. **Identidad**: `id` (UUID único)
2. **Verdad Inmutable**: `events[]` (historia completa del documento)
3. **Estado Derivado**: `lifecycle_status` (derivado de `events[]`)
4. **Metadatos**: `created_at`, `updated_at`, `owner_id`

### Estructura Canónica

```typescript
interface DocumentEntity {
  id: string;                    // UUID único del documento
  owner_id: string;             // Dueño del documento
  source_hash: string;          // Hash original del documento
  witness_hash: string;         // Hash con evidencia de existencia
  signed_hash: string;          // Hash con firmas aplicadas
  composite_hash: string;       // Hash de todo el estado actual
  events: Event[];              // Historia inmutable del documento
  lifecycle_status: string;     // Estado actual derivado de eventos
  created_at: string;           // Fecha de creación
  updated_at: string;           // Fecha de última actualización
  metadata: Record<string, any>; // Metadatos adicionales (opcional)
}
```

---

## 📋 Campos Obligatorios (Persistidos)

### `id` (UUID)
- **Tipo**: `uuid`
- **Requerido**: Sí
- **Descripción**: Identificador único global del documento
- **Inmutable**: Sí

### `owner_id` (UUID)
- **Tipo**: `uuid`
- **Requerido**: Sí
- **Descripción**: ID del usuario dueño del documento
- **Fuente**: `auth.users.id`

### `source_hash` (string)
- **Tipo**: `text`
- **Requerido**: Sí
- **Descripción**: Hash original del documento subido
- **Inmutable**: Sí (una vez creado)
- **Fuente**: `sha256(file_bytes)` del documento original

### `witness_hash` (string)
- **Tipo**: `text`
- **Requerido**: Sí
- **Descripción**: Hash con evidencia de existencia (TSA)
- **Derivación**: `source_hash` + TSA token

### `signed_hash` (string)
- **Tipo**: `text`
- **Requerido**: No
- **Descripción**: Hash con firmas aplicadas
- **Derivación**: `witness_hash` + signatures

### `composite_hash` (string)
- **Tipo**: `text`
- **Requerido**: Sí
- **Descripción**: Hash de todo el estado actual del documento
- **Derivación**: `sha256(JSON.stringify(document_state))`

### `events[]` (jsonb[])
- **Tipo**: `jsonb[]`
- **Requerido**: Sí
- **Descripción**: Historia inmutable de eventos del documento
- **Formato**:
  ```typescript
  interface Event {
    kind: string;           // Tipo de evento (tsa.confirmed, anchor.submitted, etc.)
    at: string;             // Timestamp ISO 8601
    payload: Record<string, any>; // Datos específicos del evento
    _source: string;        // Origen del evento (opcional)
  }
  ```

### `lifecycle_status` (string)
- **Tipo**: `text`
- **Requerido**: Sí
- **Descripción**: Estado actual del documento derivado de eventos
- **Valores posibles**:
  - `created` - Documento subido, sin protección
  - `protected` - Protección básica (TSA) completada
  - `anchored` - Anclajes completados
  - `artifact_ready` - Certificado disponible
  - `signed` - Firmas completadas
  - `completed` - Todo completado
  - `revoked` - Documento revocado
- **Derivación**: Calculado desde `events[]`

### `created_at` (timestamp)
- **Tipo**: `timestamptz`
- **Requerido**: Sí
- **Descripción**: Fecha de creación del documento
- **Fuente**: `NOW()` en creación

### `updated_at` (timestamp)
- **Tipo**: `timestamptz`
- **Requerido**: Sí
- **Descripción**: Fecha de última actualización
- **Fuente**: Trigger de actualización automática

---

## 🚫 Campos Prohibidos (No Persistir)

### En `document_entities` NO se guardan:
- `pdf_storage_path` - Debe ser parte de eventos
- `eco_data` - Debe generarse desde eventos
- `overall_status` - Debe derivarse de eventos
- `status` - Debe derivarse de eventos
- `tsa_token` - Debe estar en evento `tsa.confirmed`
- `anchor_confirmed_at` - Debe estar en evento `anchor.confirmed`
- `artifact_url` - Debe estar en evento `artifact.completed`

---

## 🔄 Derivación de Estado

### El estado se deriva de eventos, no se persiste:
- `lifecycle_status` → derivado de eventos en `events[]`
- `eco_v2` → generado desde eventos en `events[]`
- `protection_level` → derivado de eventos en `events[]`
- `timeline` → generado desde eventos en `events[]`
- `signatures_count` → derivado de eventos en `events[]`

### Reglas de derivación:
- `lifecycle_status = deriveLifecycleStatus(events)`
- `eco_v2 = generateEcoV2(events)`
- `protection_level = deriveProtectionLevel(events)`
- `timeline = generateTimeline(events)`

---

## 📝 Eventos Canónicos

### Eventos de Protección:
- `document.created` - Documento subido
- `document.protected.requested` - Protección iniciada
- `tsa.confirmed` - Sello de tiempo legal completado
- `anchor.submitted` - Anclaje enviado
- `anchor.confirmed` - Anclaje confirmado
- `artifact.completed` - Certificado generado

### Eventos de Firma:
- `signer.link.created` - Link de firma generado
- `signer.accessed` - Firmante accedió
- `signature.started` - Firma iniciada
- `signature.completed` - Firma completada
- `workflow.completed` - Workflow completado

---

## 🔄 Flujo Canónico de Vida Útil

```
Usuario sube documento
→ Evento: document.created
→ DecisionAuthority decide: run_tsa
→ ExecutionEngine ejecuta: TSA
→ Evento: tsa.confirmed
→ DecisionAuthority decide: submit_anchor_polygon
→ ExecutionEngine ejecuta: Polygon anchor
→ Evento: anchor.confirmed (polygon)
→ DecisionAuthority decide: build_artifact
→ ExecutionEngine ejecuta: Artifact build
→ Evento: artifact.completed
→ lifecycle_status: artifact_ready → completed
```

---

## 🔐 Garantías del Modelo

### Inmutabilidad:
- `events[]` solo se agrega, nunca se modifica
- `source_hash` es inmutable una vez creado
- `created_at` es inmutable

### Determinismo:
- `lifecycle_status` se deriva siempre de `events[]`
- `eco_v2` se genera siempre desde `events[]`
- `composite_hash` refleja estado actual

### Auditabilidad:
- Todo cambio registrado como evento
- Historia completa disponible
- Causa y efecto trazable

---

## 🚫 Reglas de Escritura

### Solo se puede escribir a `document_entities`:
- A través de `DocumentEntityService`
- Agregando eventos a `events[]` (append-only)
- Actualizando `updated_at` (automático)

### No se puede escribir directamente:
- `lifecycle_status` (debe derivarse)
- `eco_data` (debe generarse)
- `status` (debe derivarse)
- `events[]` (debe usar appendEvent)

---

## 🔄 Reglas de Lectura

### Para obtener estado actual:
- Leer `document_entities` + derivar estado desde `events[]`
- Usar `deriveLifecycleStatus(events)`
- Usar `generateEcoV2(events)`

### Para obtener historial:
- Leer `document_entities.events[]`
- Filtrar por `kind` si es necesario
- Ordenar por `at` para cronología

---

## 🧩 Relación con Modelos Legacy

### `user_documents` → `document_entities`:
- `document_hash` → `source_hash`
- `pdf_storage_path` → `events[]` (evento con storage path)
- `status` → `lifecycle_status` (derivado)
- `eco_data` → generado desde `events[]`

### `documents` → `document_entities`:
- `document_hash` → `source_hash`
- `storage_path` → `events[]` (evento con storage path)
- `status` → `lifecycle_status` (derivado)

---

## ✅ Validación de Cumplimiento

### Un documento canónico debe:
- [ ] Tener `id` único
- [ ] Tener `source_hash` inmutable
- [ ] Tener `events[]` con historia completa
- [ ] Tener `lifecycle_status` derivado de eventos
- [ ] No tener campos duplicados con valores derivables
- [ ] Ser inmutable excepto `events[]` y `updated_at`

---

**Firmado**: Arquitectura Canónica Ecosign  
**Fecha**: 27 de enero de 2026  
**Versión**: 1.0 - Contrato Canónico de Documentos
