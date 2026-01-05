# Edge Canon Migration Plan

Estado actual
Edge functions operan sobre tablas legacy (`user_documents`, `documents`).
Esto es intencional mientras el cliente migra a `document_entities`.

Principio
Edge NO decide verdad.
Edge recibe identidad (document_entity_id) cuando este disponible.

---

## Fase 1 — Dual-read (no breaking)

### generate-link
- Lee: `user_documents`, `documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities.witness_current_*`
- Accion: agregar soporte opcional a `document_entity_id`

### verify-access
- Lee: `documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities` + `hash_chain`
- Accion: agregar soporte opcional a `document_entity_id`

### create-signer-link
- Lee: `user_documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities.witness_current_*`
- Accion: agregar soporte opcional a `document_entity_id`

### create-invite
- Lee: `user_documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities.witness_current_*`
- Accion: agregar soporte opcional a `document_entity_id`

### anchor-polygon / anchor-bitcoin
- Lee: `user_documents` (indirecto)
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities.hash_chain`
- Accion: agregar soporte opcional a `document_entity_id`

### process-polygon-anchors / process-bitcoin-anchors
- Lee: `user_documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities.hash_chain` + `transform_log`
- Accion: agregar soporte opcional a `document_entity_id`

### notify-document-certified
- Lee: `user_documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities.lifecycle_status`
- Accion: agregar soporte opcional a `document_entity_id`

### log-event
- Lee: `user_documents`
- Canon futuro:
  - Input: `document_entity_id`
  - Read: `document_entities` (solo metadatos)
- Accion: agregar soporte opcional a `document_entity_id`

---

## Fase 2 — Canon-first

- Las funciones aceptan `document_entity_id` como primary input.
- `user_documents` se usa solo como fallback (cuando falta canon).
- Se prioriza `hash_chain` y `transform_log` para verificacion y anclajes.

---

## Fase 3 — Legacy removal

- `user_documents` deja de ser fuente primaria en edge.
- `documents` queda solo para verificacion historica (si aplica).
- El canon queda como unica fuente probatoria.
