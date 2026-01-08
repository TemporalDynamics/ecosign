# OPERATIONS_EVENTS_CONTRACT

Fecha: 2026-01-08T18:11:04.589Z
Ámbito: P1 — Eventos de Operación (contrato canónico, sin código)

Propósito
--------
Registrar, de forma forense y append-only, las acciones de organización de documentos respecto a operaciones (carpetas lógicas). Estos eventos explican "qué pasó con este documento dentro de una operación" sin cambiar evidencia, hashes ni protection level.

Decisión no negociable
----------------------
- Los eventos de operación NO se almacenan como fuente canónica en la tabla `operation_documents`.
- Los eventos viven exclusivamente en `document_entities.events[]` (append-only). La tabla `operation_documents` puede existir como proyección/índice eventual para consultas rápidas, pero la verdad canónica auditiva son los eventos en `document_entities`.

Alcance (fase P1)
-----------------
Se definen exactamente dos eventos (mínimo viable):

1) operation.document_added
   - Significado: se añadió un documento a una operación (contexto organizativo).
   - Payload mínimo (JSON):
     {
       "kind": "operation.document_added",
       "at": "2026-01-08T18:11:04.589Z",       // ISO8601 UTC
       "actor": { "id": "<uuid|auth.user id|service>", "type": "user|service" },
       "operation_id": "<uuid>",                  // operations.id
       "document_entity_id": "<uuid>",            // document_entities.id (OBLIGATORIO)
       "reason": "<string, opcional>",
       "metadata": { /* libre, opcional, small */ }
     }

   - Invariantes (MUST / MUST NOT):
     * MUST: incluir `document_entity_id` que exista en `document_entities`.
     * MUST: incluir `operation_id` que exista en `operations`.
     * MUST: escribirse solo como append en `document_entities.events[]` (no update/replace).
     * MUST NOT: modificar columnas de evidencia (witness_hash, signed_hash, tsa data, etc.).
     * MUST NOT: cambiar protection level ni alterar cadenas de hashes.
     * SHOULD: actor.id sea el `auth.users.id` que realizó la acción; si aplica, puede ser `service_role` para procesos automatizados.

2) operation.document_removed (opcional en P1)
   - Significado: se removió la relación organizativa entre documento y operación (no borra evidencia).
   - Payload mínimo (JSON):
     {
       "kind": "operation.document_removed",
       "at": "2026-01-08T18:11:04.589Z",
       "actor": { "id": "<uuid|auth.user id|service>", "type": "user|service" },
       "operation_id": "<uuid>",
       "document_entity_id": "<uuid>",
       "reason": "<string, opcional>",
       "metadata": { /* libre, opcional */ }
     }

   - Invariantes:
     * SAME as document_added: MUST contain document_entity_id and operation_id; MUST be append-only; MUST NOT alter evidence.
     * Semántica adicional: este evento describe intención organizativa. Si se decide soportar en esta fase, definir explícitamente si la proyección elimina filas en `operation_documents` o solo marca expiración en proyección.

Relación con document_entities.events[]
---------------------------------------
- Todos los eventos de operación son append-only entries dentro del array `document_entities.events[]` del documento afectado.
- Rationale: la evidencia es propiedad del documento; por lo tanto, el origen auditivo de cualquier cambio de organización debe vivir junto a la evidencia, preservando cadena de eventos por documento.
- Proyección: un worker con credenciales de servicio (service_role) puede consumir eventos y proyectar (insert/delete) en `operation_documents` para optimizar lecturas, manteniendo consistencia eventual.

RLS / Permisos (consideraciones)
--------------------------------
- Appends a `document_entities.events[]` deben respetar las políticas RLS existentes en `document_entities`.
- Para que la UI permita a usuarios agregar eventos: la política debe autorizar a `authenticated` owners a hacer UPDATE que appendee en `events[]` solamente cuando `auth.uid()` == owner_id y las invariantes de payload se cumplan.
- Operaciones de proyección a `operation_documents` deben realizarse con `service_role` (worker) para evitar depender de RLS del frontend.

Efectos y garantías
--------------------
- ❌ No afecta evidencia: nunca modificar columnas que representen prueba (witness_hash, tsa_latest, signed_hash, events de tipo tsa/anchor).
- ❌ No cambia protection level: derivación de protection level sigue siendo función de `document_entities.events[]` canónicos, no de operation events.
- ✅ Solo explica organización: estos eventos contextualizan el documento dentro del universo de operaciones y permiten reconstruir la historia organizativa.

Ejemplos
--------
- Añadir documento a operación:
  document_entities.events[] append -> { kind: 'operation.document_added', at: '2026-01-08T18:11:04Z', actor: {id: '...'}, operation_id: 'op-uuid', document_entity_id: 'doc-uuid' }

- Remover documento de operación (opcional):
  document_entities.events[] append -> { kind: 'operation.document_removed', at: '2026-01-08T18:15:00Z', actor: {id: '...'}, operation_id: 'op-uuid', document_entity_id: 'doc-uuid', reason: 'reorganizing' }

Recomendaciones de implementación (siguientes pasos, fuera de este contrato)
---------------------------------------------------------------------------
- Implementar validación en el cliente/backend que siempre use `document_entity_id` (ya aplicado) antes de generar el evento.
- Crear worker/service que consuma eventos operation.* desde `document_entities.events[]` y proyecte/garantice la tabla `operation_documents` para consultas rápidas (idempotente, eventual-consistent, use constraint UNIQUE (operation_id, document_entity_id)).
- Añadir índices en `document_entities.events` (GIN) por `kind` y por `operation_id` (si se proyecta), y métricas de auditoría.

Notas finales
-------------
- Este contrato conserva la inmutabilidad de la evidencia y ofrece un rastro auditivo forense de las operaciones organizativas.
- Cualquier cambio que quiera hacer operaciones "mover" que altere evidencia debe documentarse y pasar por revisión legal/forense.

