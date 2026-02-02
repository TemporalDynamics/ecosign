# Barrido Micro (por flujo) — Sin ejecutar

**Fecha:** 2026-02-02  
**Objetivo:** recorrer cada happy path en frio, validar que existe end-to-end (en papel) y marcar huecos obvios **antes** de tests manuales.

Esto NO es debugging ni verificacion E2E. Es un barrido micro de arquitectura de flujo.

---

## Reglas de este barrido

### Macro (estructura)

- Se normaliza naming (dot-notation) y invariantes del writer.
- Se mueve evidencia a `document_entities.events[]`.
- NO se agregan features.
- NO se corrigen edge cases.

### Dos reglas extra (blindaje)

1) **No introducir nuevos `kind`**: solo migrar/normalizar kinds existentes.
2) **No cambiar semantica**: solo forma (naming / ubicacion de evidencia / invariantes).

---

## Mapa rapido (entradas)

Flujos y piezas principales (referencia):

- Proteccion (TSA + jobs): `supabase/functions/record-protection-event/index.ts`, `supabase/functions/run-tsa/index.ts`, `supabase/functions/fase1-executor/index.ts`, `supabase/functions/orchestrator/index.ts`
- Anchoring: `supabase/functions/submit-anchor-*/index.ts`, `supabase/functions/process-*-anchors/index.ts`
- Share + NDA + OTP (acceso): `supabase/functions/generate-link/index.ts`, `supabase/functions/verify-access/index.ts`, `supabase/functions/accept-nda/index.ts`, `supabase/functions/accept-share-nda/index.ts`, `supabase/functions/send-share-otp/index.ts`
- Workflow de firmas: `supabase/functions/start-signature-workflow/index.ts`, `supabase/functions/send-signer-otp/index.ts`, `supabase/functions/verify-signer-otp/index.ts`, `supabase/functions/process-signature/index.ts`, `supabase/functions/build-final-artifact/index.ts`, `supabase/functions/stamp-pdf/index.ts`
- Draft -> legal: `supabase/functions/save-draft/index.ts`, `supabase/functions/load-draft/index.ts`, `client/src/lib/operationsService.ts` (transicion P0)
- Operaciones (binding): `client/src/lib/operationsService.ts` (operation_documents + operations_events)
- Campos por firmante: `supabase/functions/workflow-fields/index.ts`, `client/src/lib/workflowFieldsService.ts`

Fuentes de autoridad canonicamente relevantes:
- `docs/validation/fase3-premortem-tech-map.md` (Flow Matrix)
- `docs/contratos/FLOW_MODES_CONTRACT.md` (custody/hash/witness)
- `docs/contratos/DOCUMENT_ENTITY_CONTRACT.md` (verdad por events[])
- `docs/contratos/HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md` (workflow + gating + fields)
- `docs/contratos/WORKFLOW_STATUS_SEMANTICS.md` (UI deriva de eventos)

---

## Flujo A — Documento -> Proteccion (TSA)

### Existe (piezas)

- Entrada: `record-protection-event` crea evento `document.protected.requested` y encola `executor_jobs` (`protect_document_v2`) con `correlation_id=documentEntityId`.
- Decision/execution: `fase1-executor` decide y encola `run_tsa`; `orchestrator` ejecuta.

### Evidencia minima (document_entities.events[])

- MUST: `document.protected.requested`
- MUST: `tsa.confirmed` (o `tsa.failed` si se modela tracking)

### Artefactos

- Witness/PDF canónico (segun pipeline de artifact/witness).
- ECO/ECOX (segun build-artifact / build-final-artifact).

### Huecos obvios (marcar)

- ⚠️ No se valida aca la consistencia completa de kinds entre contrato y emision real (ej. `artifact.completed` vs `artifact.finalized`).
- ⚠️ Riesgo operativo: jobs "running" estancados (heartbeat/timeouts) -> UI "Procesando".

---

## Flujo A.1 — Custody (guardar original cifrado) + Proteccion

### Existe (dos caminos distintos)

1) Upload directo via Storage signed URL + registro:
- `create-custody-upload-url` (signed URL)
- `register-custody-upload` registra `source_storage_path` y setea `custody_mode='encrypted_custody'`

2) Upload base64 a Edge:
- `store-encrypted-custody` sube ciphertext al bucket `custody` y setea `source_storage_path`

### Contrato (FLOW_MODES_CONTRACT)

- `hash_only`: no hay promesa de descarga del original.
- `encrypted_custody`: el original existe como ciphertext; server no tiene key.

### Huecos obvios (marcar)

- ❌ Semantica de `custody_mode` aun es ambigua a nivel sistema (hay dos funciones y una de ellas no setea `custody_mode`).
- ❌ "Descargar original" debe derivar de un estado explicito, no de inferencias (esto hoy es facil de romper).

---

## Flujo B — Proteccion + Anchors (Polygon/Bitcoin)

### Existe (piezas)

- Submit: `submit-anchor-polygon`, `submit-anchor-bitcoin`.
- Confirmacion: `process-polygon-anchors`, `process-bitcoin-anchors`.

### Evidencia minima (document_entities.events[])

- MUST: `anchor.pending` (tracking) o equivalente
- MUST: `anchor` / `anchor.confirmed` (confirmacion)

### Huecos obvios (marcar)

- ⚠️ Hay drift historico entre nombres (`anchor.submitted` vs `anchor.pending`, `anchor.confirmed` vs `anchor`).
- ⚠️ Hay TODO(canon) en procesos de anchors sobre IDs legacy (riesgo de mezcla `user_document_id` vs `document_entity_id`).

---

## Flujo C — Documento -> Share (+ NDA / OTP)

### Existe (piezas)

- Link: `generate-link`
- Acceso: `verify-access`
- NDA: `accept-nda` y `accept-share-nda`
- OTP share (email): `send-share-otp` (existe; requiere hardening aparte)

### Evidencia probatoria (document_entities.events[])

- MUST: `share.created`
- MUST: `share.opened`
- MUST: `nda.accepted` (si el share requiere NDA)

### Estado/UX (derivado)

- Owner: ve link creado/abierto/NDA aceptada desde events[] (no desde tablas legacy como "verdad").
- Receptor: gating NDA antes de dar URLs.

### Huecos obvios (marcar)

- ⚠️ Existen tablas legacy operativas (links, recipients, nda_acceptances, access_events). Eso esta bien, pero NO deben convertirse en "verdad" en UI.
- ⚠️ `send-share-otp` es candidato a abuso si no tiene auth/rate-limit/guard claro.

---

## Flujo D — Documento protegido -> Operacion -> Firma secuencial -> Estampa -> Certificado

### Existe (piezas)

- Binding a operacion: `client/src/lib/operationsService.ts` (`operation_documents` + `operations_events`).
- Inicio workflow: `supabase/functions/start-signature-workflow/index.ts` (deliveryMode email/link).
- Campos: `workflow-fields` + `workflowFieldsService`.
- OTP signer: `send-signer-otp`, `verify-signer-otp`.
- Firma: `process-signature` (incluye TSA/anchors opcionales segun forensicConfig).
- PDF final: `stamp-pdf` (stateless) + `build-final-artifact` (worker) + `workflow_events` (`workflow.artifact_finalized`).

### Contratos que aplican

- `docs/contratos/HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md`:
  - gating secuencial: NO avanzar al firmante N+1 sin evidencia forense de N.
  - fields por signer: el firmante solo ve campos asignados.
- `docs/contratos/WORKFLOW_STATUS_SEMANTICS.md`: UI deriva de eventos reales.

### Evidencia (dos ledgers)

- Documento (`document_entities.events[]`): hoy existe evento `signature` (nota: naming no dot).
- Workflow (`workflow_events`): `otp.verified`, `signer.signed`, `workflow.artifact_finalized`, etc.

### Huecos obvios (marcar)

- ❌ Naming inconsistente en documento: `process-signature` emite `kind: 'signature'` (no dot-notation).
- ❌ Gating secuencial es punto de ruptura probable (emails a todos juntos). Requiere que la decision de notificar sea derivada de estado/evento, no de loops.
- ⚠️ `stamp-pdf` es stateless y acepta PDF base64: requiere limites de tamano + rate-limit (hardening), pero no es parte del barrido micro de flujos.

---

## Flujo E — Draft -> Documento legal -> Proteccion -> Firma -> Anchor

### Existe (piezas)

- Draft server-side: `save-draft` crea `operations(status='draft')` + `operation_documents(draft_file_ref, draft_metadata)`.
- Listado/carga: `load-draft`.
- Transicion P0: `protectAndSendOperation` solo cambia `operations.status: draft -> active` (no protege ni crea document_entity).

### Huecos obvios (marcar)

- ❌ No existe una transicion canónica completa "draft -> crea document_entity_id" (hoy el draft guarda `draft_file_ref` sin contenido server-side recuperable).
- ❌ En Phase 1, draft no cifra en servidor (lo declara el contrato). Eso es aceptable si y solo si la UI/UX no promete otra cosa.
- ❌ Riesgo de doble verdad: draft en IndexedDB + draft_file_ref en server. Falta un contrato de "fuente primaria".

---

## Subflujo — Documento existente -> Operaciones (sin duplicar)

### Existe

- `addDocumentToOperation` inserta `operation_documents` y emite `operations_events` best-effort.
- `getOperationWithDocuments` muestra datos desde `document_entities`.

### Huecos obvios (marcar)

- ⚠️ No hay una regla de dedupe visible aqui: si insert falla por unique constraint o si permite duplicado depende del schema. (Debe derivarse del schema, no de UI.)
- ⚠️ Problema UX reportado: carpeta Documentos enorme. Solucion de producto: proyecciones (filtros/operaciones) sin duplicar entidad.

---

## Subflujo — Campos por firmante (solo ve lo suyo)

### Existe

- Persistencia: `workflow_fields` via `workflow-fields` + RLS.
- Modelo: `assigned_to` + validacion de coords normalizadas 0..1.

### Huecos obvios (marcar)

- ⚠️ El contrato de "firmante solo ve sus campos" depende de RLS + consultas UI. Falta verificacion micro de queries usadas por firmante (no en este barrido).
- ⚠️ `workflowFieldsService.loadWorkflowFields()` tiene workaround: intenta Edge GET pero termina usando query directa; esto puede afectar RLS segun contexto (owner vs signer).

---

## Subflujo — Varios documentos en un solo flujo

### Estado real

- ✅ Operaciones soportan multiples documentos (`operation_documents`).
- ❌ Un workflow de firma (hoy) parece ser por `document_entity_id` (un solo documento por workflow).

### Hueco obvio

- ❌ "Firmar varios documentos en un solo flujo" no esta cerrado como contrato tecnico.
  - O es: un workflow que referencia N documentos
  - O es: N workflows coordinados por una operacion (y una UX que los agrupa)

---

## Salida del barrido (lo que habilita)

1) Ya sabemos que existe (en código) para cada flujo.
2) Ya sabemos donde estan los huecos conceptuales grandes (custody_mode, draft->legal, gating secuencial, naming signature).
3) Recién despues: verificacion manual flujo por flujo (micro) con correcciones puntuales.
