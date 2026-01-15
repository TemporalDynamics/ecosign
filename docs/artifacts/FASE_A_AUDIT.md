# FASE A — Auditoría de Cierre del Workflow
**Fecha:** 2026-01-15  
**Estado:** Completada ✅  
**Rama:** final-artifact

---

## A1. Punto de Cierre Actual

### ✅ Identificación del cierre

**Archivo principal:**  
`supabase/functions/apply-signer-signature/index.ts` (líneas 200-218)

**Lógica actual:**
```typescript
// Después de marcar al signer como 'signed'
const { data: remaining } = await supabase
  .from('workflow_signers')
  .select('id')
  .eq('workflow_id', signer.workflow_id)
  .neq('status', 'signed')

const newStatus = remaining.length === 0 ? 'completed' : 'partially_signed'

await supabase
  .from('signature_workflows')
  .update({ status: newStatus })
  .eq('id', signer.workflow_id)
```

**¿Cuándo ocurre el cierre?**  
- Cuando el último firmante completa su firma
- Sincrónico con `apply-signer-signature`
- No hay worker separado para cierre

**Archivo secundario:**  
`supabase/functions/process-signature/index.ts` (líneas 450-461)

**Evento emitido:**
```typescript
await appendCanonicalEvent(
  supabase,
  {
    event_type: 'workflow.completed',
    workflow_id: signer.workflow_id,
    payload: { completed_at: new Date().toISOString() },
    actor_id: workflow.owner_id ?? null
  },
  'process-signature'
)
```

### 📌 Hallazgos clave

✅ **El evento canónico `workflow.completed` ya existe**  
- Definido en `_shared/types.ts`
- Emitido correctamente en `process-signature`
- No se emite en `apply-signer-signature` (gap menor)

⚠️ **Dos puntos de cierre diferentes:**
1. `apply-signer-signature` → marca status pero NO emite evento
2. `process-signature` → emite evento pero puede no marcar status

**Recomendación:** Consolidar lógica de cierre en un solo lugar.

---

## A2. Inventario de Datos Disponibles

### ✅ Documento base
- **Tabla:** `document_entities`
- **Campo:** `document_path` (Storage path al PDF original)
- **Estado:** ✅ Disponible

### ✅ Firmas recolectadas (P2.2)

**Tablas creadas:**
- `signature_instances` (migración `20260115150000`)
- `signature_application_events` (migración `20260115150100`)

**Campos disponibles por firma:**
```typescript
signature_instances:
  - id
  - workflow_id
  - document_entity_id
  - batch_id
  - signer_id
  - signature_payload (JSONB)
    - type: 'drawn' | 'typed'
    - dataUrl: string (imagen base64)
    - metadata: objeto libre
  - created_at

signature_application_events:
  - signature_instance_id
  - field_id (referencia a workflow_fields)
  - applied_at
```

**Relación con campos:**
- `workflow_fields` tiene: page, x, y, width, height
- Permite reconstruir posición exacta de cada firma

**Estado:** ✅ Completamente disponible (desde P2.2)

### ✅ Timestamps

**Disponibles:**
- `workflow_signers.signed_at` (cuando cada firmante completa)
- `signature_workflows.created_at`
- `signature_workflows.completed_at` (si se actualiza)
- `signature_instances.created_at`
- `signature_application_events.applied_at`

**Estado:** ✅ Disponible

### ✅ Identificadores de firmantes

**Tabla:** `workflow_signers`

**Campos disponibles:**
- `id`
- `email`
- `identity_confirmed` (bool)
- `identity_method` (email_otp, etc.)
- `ip_address`
- `user_agent`
- `signing_order`
- `signed_at`

**Estado:** ✅ Disponible

### ⚠️ Referencia al .eco

**Estado actual:** ⚠️ Parcialmente disponible

**Lo que existe:**
- `document_entities.witness_current_storage_path` (desde P2.3)
- Eventos de protección en `workflow_events`

**Lo que falta:**
- ID explícito del contenedor .eco
- Metadata de protección estructurada

**Recomendación:** Construir referencia desde eventos existentes por ahora.

### ✅ Hashes previos / Anchors

**Tabla:** `workflow_events`

**Eventos relevantes:**
```typescript
event_type: 'protection.polygon_confirmed'
event_type: 'protection.bitcoin_confirmed'

payload: {
  anchor_id: string
  tx_hash: string
  block_height: number
  ...
}
```

**Estado:** ✅ Disponible (depende de nivel de protección del documento)

---

## A3. Gaps Identificados

### 🔴 Gap 1: No hay tabla de control para artefactos

**Problema:**  
No existe `workflow_artifacts` para:
- Prevenir duplicación
- Trackear estado de construcción
- Almacenar hash / URL del artefacto

**Impacto:** Alto  
**Prioridad:** FASE B

---

### 🟡 Gap 2: Evento `workflow.completed` no se emite siempre

**Problema:**  
- Se emite en `process-signature` ✅
- NO se emite en `apply-signer-signature` ❌

**Impacto:** Medio  
**Recomendación:** Consolidar lógica de cierre

---

### 🟡 Gap 3: No hay worker dedicado de construcción

**Problema:**  
El cierre ocurre sincrónico en el request del firmante.  
Construir el artefacto final debería ser asíncrono.

**Impacto:** Medio  
**Prioridad:** FASE C

---

### 🟢 Gap 4: Metadata de protección no está estructurada

**Problema:**  
Los eventos de protección existen, pero no hay un campo consolidado tipo:
```json
{
  "protection_level": "reinforced",
  "tsa_timestamp": "...",
  "polygon_anchor": {...},
  "bitcoin_anchor": {...}
}
```

**Impacto:** Bajo (puede derivarse de eventos)  
**Prioridad:** Nice to have

---

## Resumen Ejecutivo

### ✅ Lo que tenemos (muy sólido)

1. Documento base ✅
2. Firmas completas con posición exacta (P2.2) ✅
3. Timestamps por firmante ✅
4. Identificadores de firmantes ✅
5. Evento canónico `workflow.completed` ✅
6. Hashes y anchors (cuando aplica) ✅

### 🔴 Lo que falta (bloqueante)

1. Tabla `workflow_artifacts` (FASE B)
2. Worker `build-final-artifact` (FASE C)

### 🟡 Lo que hay que mejorar (no bloqueante)

1. Consolidar lógica de cierre
2. Emitir evento `workflow.artifact_finalized`
3. Estructurar metadata de protección

---

## Decisión de Arquitectura

### ✅ Construcción del artefacto ES VIABLE

**Todos los inputs necesarios existen.**

El artefacto final puede construirse con:
- PDF base desde `document_entities.document_path`
- Firmas desde `signature_instances` + `signature_application_events`
- Coordenadas desde `workflow_fields`
- Evidencia desde `workflow_signers` + `workflow_events`

### 📌 Próximo paso recomendado

**FASE B — Crear tabla `workflow_artifacts`**

Esto habilita:
- Idempotencia
- Control de duplicación
- Tracking de estado
- Base para FASE C (worker)

---

**Fin de FASE A**  
**Siguiente:** FASE B — Contratos y Modelo de Datos
