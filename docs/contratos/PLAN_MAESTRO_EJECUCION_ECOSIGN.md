# PLAN MAESTRO DE EJECUCIÓN — EcoSign Contracts → Sistema Vivo
Fecha: 2026-01-12T17:59:58.607Z

Resumen
------
Roadmap maestro dividido en fases numeradas y pasos atómicos. Cada paso incluye:
- 🎯 Objetivo
- 🔧 Qué tocar
- ✅ Criterio de Done (pruebas / comprobaciones)

NOTA: estos pasos implementan los contratos canónicos en docs/contratos y convierten el diseño en un sistema operativo vivo.

🔵 FASE 0 — Congelar la verdad (fundacional)

Paso 0.1 — Declarar los contratos como fuente de verdad

🎯 Objetivo
Que nadie (ni vos en 3 meses) “reinvente” lógica.

🔧 Qué hacer
- Crear folder /contracts (o usar docs/contratos) con README principal.
- Incluir referencia a los diagramas Mermaid y SVG en docs/contratos/diagrams.
- Documentar proceso de versionado de contratos (cómo se aprueba una excepción).

✅ Criterio de Done
- El README contractual existe y está enlazado desde el repositorio.
- Los diagramas Mermaid + SVG están referenciados.
- El equipo conoce la regla: contratos = fuente de verdad.


🔵 FASE 1 — Modelo de datos alineado a contratos

Paso 1.1 — Workflow States

🎯 Objetivo
Que DB y backend reflejen exactamente el diagrama de estados del workflow.

🔧 Qué tocar
- Tabla workflows: añadir/asegurar columna status ENUM(draft, ready, active, completed, cancelled, rejected, archived).
- Constraints / triggers: impedir transiciones inválidas (ej: completed -> active).
- Añadir pruebas unitarias y migraciones.

✅ Criterio de Done
- La DB no permite pasar de completed → active.
- Tests de transición (unit/integration) pasan en CI.


Paso 1.2 — Signer States

🎯 Objetivo
Firmante como entidad lógica, no solo email.

🔧 Qué tocar
- Tabla workflow_signers: name, email (nullable), role_index, status ENUM(created, invited, accessed, verified, ready_to_sign, signed), access_token (hash), access_token_expires.
- Backend: validar operaciones según estado.
- UI: deshabilitar acciones inválidas según estado.

✅ Criterio de Done
- Backend rechaza acciones no permitidas por estado.
- UI no muestra acciones inválidas (tests de UI manual/automáticos).


Paso 1.3 — Delivery Mode

🎯 Objetivo
Mail y Link como canales, no flujos distintos.

🔧 Qué tocar
- workflow.delivery_mode ENUM(email, link, mixed).
- workflow_signers.access_token (token seguro reproducible o hash) y mecanismo de envío (worker que crea system_emails o links).

✅ Criterio de Done
- Cambiar delivery mode no afecta la lógica de estados.
- Ambos modos convergen en ACCESSED y la validación de signer funciona igual.


🔵 FASE 2 — Campos y Field Groups (el corazón UX)

Paso 2.1 — Field Groups

🎯 Objetivo
Asignar campos a firmantes sin fricción.

🔧 Qué tocar
- Nueva entidad field_groups: id, workflow_id, name, assigned_to (role_index | signer_id | null), metadata.
- Tabla fields: id, group_id, page_index, bbox_norm {x,y,w,h}, type, repeat_spec (opcional), required.
- API: endpoints CRUD para grupos y fields.

✅ Criterio de Done
- Todo field pertenece a un group_id.
- Un group puede mapear a un firmante (role o signer_id).


Paso 2.2 — Duplicación correcta

🎯 Objetivo
Duplicar sin romper asignaciones.

🔧 Qué tocar
- UI: duplicar campo → opción local / todas las páginas.
- UI: duplicar grupo → local / todas las páginas.
- Backend: preservar assigned_to en duplicaciones, usar bbox_norm.

✅ Criterio de Done
- Repetir firma en todas las hojas crea instancias por página.
- El firmante asignado se mantiene.


Paso 2.3 — Congelamiento en ACTIVE

🎯 Objetivo
Garantizar determinismo forense.

🔧 Qué tocar
- Al pasar workflow.status → active:
  - materializar repeat_spec en fields instanciados por página (determinístico)
  - set read-only flags en fields/field_groups
- Emitir evento canonical workflow_started / fields_materialized

✅ Criterio de Done
- No se pueden editar campos en ACTIVE mediante API ni UI.
- Las instancias materializadas son reproducibles en tests.


🔵 FASE 3 — Experiencia del firmante (magia)

Paso 3.1 — Filtrado de campos por firmante

🎯 Objetivo
Que el firmante no piense y no busque dónde firmar.

🔧 Qué tocar
- Al resolver el token en /sign/:token, backend retorna signer_id y fields asignados.
- Frontend muestra sólo los fields del signer y navegación por "Siguiente campo".

✅ Criterio de Done
- El firmante no ve campos ajenos.
- CTA principal visible: Firmar.


Paso 3.2 — Firma única → aplicar a todos

🎯 Objetivo
UX top-tier: firmar una vez y aplicar en todos los campos asignados.

🔧 Qué tocar
- SignaturePad: captura firma una vez (image/dataUrl).
- Endpoint: apply-signature(signer_id, signatureData, applyToAll = true).
- Backend: al aplicar, crear signature placements para todos los fields asignados.

✅ Criterio de Done
- Todas las firmas del signer quedan estampadas en sus campos.
- No es necesario que el signer busque manualmente cada campo.


Paso 3.3 — Scroll / lectura gating

🎯 Objetivo
Generar confianza (telemetría) sin promesas legales falsas.

🔧 Qué tocar
- Frontend: medir page_viewed events (cuando el usuario alcanza 80-100% de la página).
- Calcular readiness = pages_seen / total_pages.
- Habilitar el CTA "Firmar" cuando readiness >= threshold (configurable).
- Emitir eventos ECOX para telemetría (no canónicos): document_view_progress, dwell_time.

✅ Criterio de Done
- No se puede firmar sin un mínimo de scroll (configurable).
- Se registran eventos de lectura para auditoría y métricas.


🔵 FASE 4 — Firma + Forense (núcleo legal)

Paso 4.1 — Secuencia forense estricta

🎯 Objetivo
Nunca firmar sin evidencia.

🔧 Qué tocar
- process-signature (edge function):
  - validar token & signer.status
  - crear eco_data
  - solicitar legal-timestamp (RFC3161) sobre witness_hash
  - appendTsaEventFromEdge(document_entity_id,...)
  - opcional: anchor-polygon / anchor-bitcoin
  - insertar workflow_signatures (rfc3161_token, polygon_tx_hash, bitcoin_anchor_id)
  - appendEvent('signature') en document_entity
  - update signer.status = signed
  - advance_workflow RPC
  - crear notificación para next signer

✅ Criterio de Done
- Si falla TSA obligatorio: no se avanza y se registra error claro.
- No existen firmas huérfanas sin evidencia.


Paso 4.2 — Idempotencia

🎯 Objetivo
Retries seguros sin duplicados.

🔧 Qué tocar
- Implementar idempotency keys: hash(workflow_id + signer_id + signature_hash) o similar.
- Locks lógicos / DB constraints para evitar inserciones duplicadas en workflow_signatures.
- Tests de retry (simular doble envío del mismo payload).

✅ Criterio de Done
- Reintentar process-signature no duplica registros ni notificaciones.


🔵 FASE 5 — Errores, cancelaciones y correcciones

Paso 5.1 — Reemplazo de firmante (pre-firma)

🎯 Objetivo
Que equivocarse no rompa todo.

🔧 Qué tocar
- Permitir replace_signer endpoint si signer.status < signed.
- Invalidar tokens previos (rotar access_token / hash).
- Emitir evento signer_replaced e invitation_revoked.

✅ Criterio de Done
- Cambiar email/name funciona y el token anterior deja de funcionar.
- Eventos quedan registrados para auditoría.


Paso 5.2 — Cancelar / Rechazar

🎯 Objetivo
Cerrar flujos con dignidad.

🔧 Qué tocar
- Implementar workflow.cancel() y workflow.reject(reason) en backend.
- UI: opción clara para owner y mensajes para firmantes.
- Registro de eventos canonical: workflow_cancelled, workflow_rejected.

✅ Criterio de Done
- Evidencia histórica no se borra.
- UI ofrece "Crear nuevo flujo" sobre el mismo documento.


🔵 FASE 6 — Observabilidad y confianza

Paso 6.1 — Eventos canónicos vs ECOX

🎯 Objetivo
Auditoría clara y separación de responsabilidades.

🔧 Qué tocar
- appendEvent → document_entities.events[] para eventos canónicos (signature, tsa, workflow_started, etc.).
- log-ecox-event → telemetría enriquecida (scroll, access_link_opened, otp_sent, etc.).
- Monitoreo: dashboards que correlacionen ambos conjuntos.

✅ Criterio de Done
- Todo cambio relevante produce evento canónico y/o ecox.
- No hay acciones silenciosas.


Paso 6.2 — Alertas

🎯 Objetivo
Saber cuando algo se rompe en tiempo real.

🔧 Qué tocar
- Alertas/SLAs para:
  - TSA failures
  - Emails acumulados en pending/failed
  - Workflows estancados (> configurable minutes without progress)
- Integración con Sentry/Slack/Prometheus.

✅ Criterio de Done
- Alertas generan tickets/notifications y se prueban en producción canary.


🟢 RESULTADO FINAL

Si ejecutás este plan:
- El sistema no falla ante errores operativos.
- RRHH tendrá una experiencia consistente y recuperable.
- Los firmantes experimentan una UX simple y segura.
- La evidencia es irreprochable y auditada.

Este plan entrega un protocolo operativo de consentimiento — no solo una app.

---

Timestamp: 2026-01-12T17:59:58.607Z
