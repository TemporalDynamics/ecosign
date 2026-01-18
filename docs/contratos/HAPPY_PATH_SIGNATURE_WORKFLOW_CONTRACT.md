# ECO SIGN — SIGNATURE WORKFLOW CONTRACTS (v1)
Fecha: 2026-01-12T17:31:22.936Z

Propósito
--------
Documento canónico que recoge los contratos (reglas invariantes) que definen el comportamiento correcto, auditable y reproducible del flujo de firmas de EcoSign. Sirve como fuente de verdad para product, legal, QA y desarrollo.

Resumen ejecutivo
-----------------
- El documento es inmutable: cualquier cambio de contenido genera un nuevo document_entity.
- Un workflow de firma es una capa operativa sobre un documento; puede haber múltiples workflows por documento.
- Mail vs Link son modalidades de entrega (delivery modes), no flujos distintos.
- Los campos se agrupan por firmante (field_group) y el firmante solo puede ver/actuar sobre sus campos.
- Antes de avanzar al siguiente firmante en un flujo secuencial, la firma debe tener evidencia forense (TSA / anchors) registrada.

CONTRATOS
---------
1) DOCUMENT_IMMUTABILITY
- Definición: document_entity representa un archivo con source_hash único.
- Regla: El contenido del document_entity no se modifica. Cualquier cambio de contenido implica crear un nuevo document_entity con nuevo source_hash.
- Implicancia: workflows, events y evidencias se asocian a document_entity y quedan inmutables.

2) SIGNATURE_WORKFLOW
- Estados válidos: DRAFT → READY → ACTIVE → COMPLETED; ACTIVE puede transitar a CANCELLED o REJECTED.
- Un workflow pertenece a un único document_entity.
- Un documento puede tener múltiples workflows independientes; cada workflow mantiene su propia evidencia y eventos.
- Reglas: El workflow no modifica el documento; la evidencia generada por un workflow no se comparte con otros workflows salvo que explícitamente se diseñe así.

3) SIGNER (IDENTIDAD LÓGICA)
- Un signer es una entidad con: id, role/index, name, email (opcional), delivery_mode (opcional), estado.
- Estados del signer: CREATED → INVITED → ACCESSED → VERIFIED → READY_TO_SIGN → SIGNED.
- Reglas:
  - Un signer puede ser reemplazado si y sólo si su estado es anterior a SIGNED.
  - Reemplazar un signer invalida tokens previos, genera nuevos y deja eventos auditables (signer_replaced, invitation_revoked).
  - No se puede modificar un signer que ya haya firmado (SIGNED) salvo por motivos administrativos fuera del flujo (se crea nuevo workflow para cambios).

4) DELIVERY_MODE (MAIL | LINK | MIXED)
- Mail y Link son modos de entrega, no flujos separados.
- Reglas:
  - El access_token se genera por signer y es el identificador secreto; el link público contiene el token o su identificador seguro.
  - OTP (o segundo factor) siempre es una verificación adicional; nunca debe embutirse en el link como única protección.
  - Si el firmante no tiene email, delivery_mode puede ser LINK o PRESENCIAL; el sistema debe soportar firmantes sin email.

5) FIELDS & FIELD_GROUPS
- field_group: conjunto lógico de campos (firma, nombre, fecha, texto) asociado a un signer_role o signer_id.
- field: elemento con tipo, page_index, bbox_norm {x,y,w,h} en coordenadas 0..1.
- Reglas:
  - Todo field pertenece a un field_group.
  - Un field_group puede estar en estado draft o asignado a role/signature_id.
  - El firmante sólo ve y puede interactuar con los fields asignados a su signer_id.
  - Al materializar (bloquear) un workflow, los repeat_spec se convierten en instancias deterministas por página para forense.

6) FIELD_REPLICATION
- Operaciones válidas: duplicar campo local, duplicar campo en todas las páginas, duplicar grupo local, duplicar grupo en todas las páginas.
- Reglas:
  - La duplicación conserva la asignación del firmante y el tipo de campo.
  - Las posiciones se almacenan en coordenadas normalizadas (bbox_norm) para soportar distintos preview renderers.
  - Opcional: mantener repeat_spec (regla de repetición) y materializar instancias a la hora de bloquear el workflow.

7) SIGNATURE & FORENSIC EVIDENCE
- Orden obligatorio para confirmar una firma (cuando el workflow requiere hardening):
  1. intent/sign intent
  2. legal-timestamp (RFC3161) sobre witness_hash
  3. anchoring (Polygon / Bitcoin) opcional según forensicConfig
  4. registro en workflow_signatures (incluye rfc3161_token / polygon_tx_hash / bitcoin_anchor_id)
  5. appendEvent('signature') al document_entity
  6. actualizar signer.status = 'signed' y advance_workflow
- Regla de oro: Si no existe evidencia registrada (rfc3161_token o equivalente según configuración), no se debe avanzar al siguiente firmante en un workflow secuencial.

8) CANCELLATION, REPLACEMENT & ERROR HANDLING
- Reglas de edición según estado:
  - DRAFT: todo editable
  - READY: editable antes de activar
  - ACTIVE: no se puede modificar el documento ni campos ya firmados; se puede editar firmantes no firmados, cambiar delivery mode, reenviar invitaciones, reemplazar signers no firmados, o cancelar flujo.
  - COMPLETED / CANCELLED / REJECTED: sólo lectura
- Reemplazo de signer: genera eventos signer_replaced e invitation_revoked y crea nuevo token; no borra evidencia histórica.
- Rechazo por parte de firmante: genera workflow_rejected y queda registrado; para corregir se debe crear un nuevo workflow.

9) EVENT CANONICALITY & AUDIT
Convencion de eventos (Fase 1):
Las referencias a eventos en este documento se interpretan como `kind + at + payload`.

- Todo estado transicional relevante genera un evento canónico en document_entities.events[] y un registro audit (log-ecox-event) con metadatos (ip_hash, user_agent_family, timezone, geolocation si aplica).
- Eventos mínimos: workflow_created, workflow_started, signer_invited, access_link_opened, signer_receipt (document_received), otp_sent, otp_verified, signature_applied, tsa, polygon_anchor, bitcoin_anchor, signer_replaced, workflow_cancelled, workflow_rejected, workflow_completed.
- appendEvent se usa para eventos canónicos canónicamente visibles en el document_entity; log-ecox-event se usa para auditoría enriquecida (telemetría y seguridad).

ACCEPTANCE CRITERIA y CHECKLIST (DO)
-------------------------------------
Para considerar un workflow "validado":
- start-signature-workflow crea workflow, workflow_versions y workflow_signers con access_token_hash; crea notificación pendiente para el primer signer.
- Al abrir link: log-ecox-event(access_link_opened) debe registrarse con workflow_id y signer_id.
- OTP flow: send-signer-otp y verify-signer-otp deben generar otp_sent y otp_verified (appendEvent + log-ecox-event según diseño).
- Firma: process-signature debe ejecutar legal-timestamp (si configurado), appendTsaEventFromEdge, almacenar rfc3161_token en workflow_signatures y THEN appendEvent('signature') antes de advance_workflow.
- Notificaciones: cualquier workflow_notifications/system_emails insertado con delivery_status 'pending' debe ser procesado por el worker send-pending-emails; failures deben moverse a 'failed' y exponer métricas.

TESTS RECOMENDADOS (mínimos para CI)
------------------------------------
1) E2E happy path secuencial (2 signers): crear workflow → signer1 recibe link → signer1 OTP+firma → verificar TSA event y workflow_signatures → signer2 recibe link válido → signer2 firma → workflow completado.
2) Forensic fail: simular fallo en legal-timestamp y comprobar que workflow NO avanza ni notifica al siguiente.
3) Idempotencia: ejecutar process-signature dos veces con la misma payload y comprobar que no duplica signature records ni notificaciones.
4) Token security: intentar usar token del signer1 para acceder como signer2 y validar rechazo.
5) Field replication: crear group con repeat across pages, materializar y validar instancias por página y posiciones normalizadas.

OBSERVABILIDAD y ALERTAS
------------------------
- Métricas a trackear: pending_emails_count, failed_emails_rate, tsa_failure_rate, stalled_workflows (> N min sin avance), appendEvent_failures.
- Alertas: enviar alerta Slack/Sentry si appendTsaEventFromEdge falla repetidamente, o si send-pending-emails acumula > X failed en 10m.
- Dashboards mínimos: tabla de system_emails (pending/sent/failed), workflows stalled, tasa de éxito de anchoring.

IMPLEMENTATION NOTES para DEV
-----------------------------
- Data model mínimos: workflow_signers(access_token_hash, signing_order, status, require_nda, quick_access), field_groups(id, role_index?, signer_id?, repeat_spec?), fields(id, group_id, page_index, bbox_norm, type, metadata).
- Use coordinates normalizadas para soportar multiple renderers.
- Materialize repeat_spec deterministically al "lock" del workflow para que los eventos forenses sean reproducibles.
- Tokens: generar access_token como 32+ bytes aleatorios; store only hash if no plaintext retrieval required; si necesitas enviar link directamente por worker, debes almacenar el token o un mecanismo seguro para generar el link reproducible.

PRIORIDAD a corto plazo (mínimos para beta)
------------------------------------------
1. Asegurar pipeline de emails: definir materialization workflow_notifications → system_emails y job idempotente.
2. Tests E2E: 2 signers secuencial + forensic check.
3. Confirmar que process-signature siempre hace TSA antes de advance_workflow y que la notificación al next signer contiene link válido (access_token hash o token reproducible).
4. Implementar UI mínimo para asignar campos a firmantes (field_group) y "Aplicar mi firma a todos mis campos" en frontend.
5. Agregar logging/alertas para appendEvent / appendTsaEventFromEdge failures.

PRÓXIMOS PASOS
--------------
- Si querés, separo este documento en varios archivos por contrato y los agrego a /contracts/.
- Puedo también generar el esquema SQL propuesto y los cambios frontend mínimos (UI) en PRs separados.

— FIN —
