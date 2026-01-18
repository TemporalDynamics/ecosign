# Auditoría de Contratos – Integración con Executor

## 1. Resumen ejecutivo
- Contratos analizados: 66 (cobertura total de `docs/contratos` + anchoring + tsa + architecture + decisions)
- Alineados: 43
- Parciales: 19
- En conflicto: 4
- Pendientes de lectura guiada: ver `docs/CONTRACT_INVENTORY.md`

## 2. Hallazgos críticos
- `docs/architecture/ARQUITECTURA_CANONICA.md`: define estructura de eventos con campo `event`/`timestamp` y lista de eventos que no coincide con contratos canónicos que usan `kind` + payload; conflicto semántico de “qué es evento” para el Executor.
- `docs/contratos/CANONICAL_EVENTS_LIST.md` vs `docs/contratos/ANCHOR_EVENT_RULES.md`: uno exige eventos `anchor.confirmed`, el otro define `kind:"anchor"` con `anchor.network`; falta una convención única para nombre/campo del evento.
- `docs/contratos/EXPLICACION_EJECUTOR_Y_FLUJOS.md` y `docs/contratos/CONTRATO_MAPEO_EJECUTOR.md`: usan evento `anchor.confirmed` como “evento canónico esperado”, pero `ANCHOR_EVENT_RULES` exige estructura con `kind:"anchor"`; el Executor no puede “cerrar” el paso sin un nombre único de evento.
- `docs/contratos/CONTRATO_ORQUESTACION_FLUJOS.md`: afirma que el orquestador “invoca Edge Functions en orden” y “reintenta pasos”; pero `docs/decisions/DECISIONS_POST_ANCHOR_SPRINT.md` declara arquitectura cerrada y prohibe tocar triggers/constraints; conflicto de autoridad/operación si triggers siguen activos.
- `docs/anchoring/ANCHORING_FLOW.md`: describe cron/trigger como autoridad práctica (processing y retries), lo que contradice el principio “Executor único” de `CONTRATO_AUTORIDAD_EJECUTOR.md`.
- `docs/contratos/CONTRATO_ARTEFACTO_WORKFLOW.md` y `docs/contratos/CONTRATO_ARTEFACTO_FINAL.md`: ambos definen evento `workflow.artifact_finalized` como cierre, pero `CANONICAL_EVENTS_LIST.md` no lo incluye; el Executor no tiene lista canónica completa.
- `docs/contratos/HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md` y `docs/contratos/IDENTITY_OTP_DECRYPTION_CONTRACT.md`: listan eventos en formato `workflow_created`/`signer.accessed` que no coinciden con la convención de `CANONICAL_EVENTS_LIST.md`; evento canónico inconsistente para el Executor.
- `docs/contratos/P0_SEAL.md`: define criterio P0 basado en `workflow_events.kind` con valores que no aparecen en `CANONICAL_EVENTS_LIST.md`; conflicto de naming mínimo para cierre.
- `docs/contratos/CONTRATO_PROTECCION_DERIVADA.md`: define eventos `type:'tsa.created'` y `type:'anchor.confirmed'` que no coinciden con `kind:'tsa'`/`kind:'anchor'` de reglas canónicas; conflicto de naming.
- `docs/contratos/ECO_ECOX_MIN_SCHEMA.md`: schema usa `type/event` en lugar de `kind` y nombres de eventos que no coinciden con la lista canónica; conflicto de convención.

## 3. Recomendaciones
- Unificar convención de eventos: escoger **una** entre `kind`/`at` (ledger) o `event`/`timestamp` (arquitectura) y normalizar `anchor.*` y `workflow.artifact_finalized` en la lista canónica.
- Declarar explícitamente en `CONTRATO_AUTORIDAD_EJECUTOR.md` si triggers/crons quedan desactivados en Fase 1 (y bajo qué condiciones se permiten side-effects).
- Alinear `ANCHOR_EVENT_RULES.md` con el naming del Executor (p.ej. `kind:"anchor"` + `status:"confirmed"` o `kind:"anchor.confirmed"`), y actualizar `CONTRATO_MAPEO_EJECUTOR.md` para usar esa misma convención.
- Actualizar `CANONICAL_EVENTS_LIST.md` incorporando eventos de cierre `workflow.artifact_finalized` y eventos mínimos de protección (`tsa.appended`, `anchor.confirmed`) si son obligatorios para Fase 1.
- Documentar explícitamente “quién decide el retry” en `CONTRATO_ORQUESTACION_FLUJOS.md` (Executor) y marcar workers/cron como ejecutores sin autoridad.
- Mantener `ANCHORING_FLOW.md` como documento operativo histórico, pero etiquetar sus “autoridades” como legacy si el Executor asume control.

## 4. No decisiones (explícito)
- No se reescriben contratos ni se cambia semántica legal.
- No se implementa código ni se cambia infraestructura en este documento.
- No se definen UI ni estados nuevos.
- No se resuelve el backlog de contratos pendientes de lectura guiada.

---

## Análisis por contrato (subset leído)

Formato: **Archivo** — Autoridad / Acciones / Eventos / Temporalidad / Fallos / Clasificación

- `docs/contratos/CONTRATO_AUTORIDAD_EJECUTOR.md` — Autoridad: Executor; Acciones explícitas; Eventos canónicos; Temporalidad: delegada al Executor; Fallo: idempotencia; **Alineado**.
- `docs/contratos/CONTRATO_MAPEO_EJECUTOR.md` — Autoridad: Executor; Acciones explícitas; Eventos explícitos pero naming inconsistente con `ANCHOR_EVENT_RULES`; Temporalidad: secuencial; Fallo: `failed` terminal; **Parcialmente alineado**.
- `docs/contratos/EXPLICACION_EJECUTOR_Y_FLUJOS.md` — Autoridad: Executor; Acciones explícitas; Eventos explícitos; Temporalidad: por eventos; Fallo: implícito; **Parcialmente alineado** (naming de eventos).
- `docs/contratos/CONTRATO_ORQUESTACION_FLUJOS.md` — Autoridad: Orquestador; Acciones explícitas; Eventos de job; Temporalidad: retries/backoff explícitos; Fallo: terminal; **Alineado** (requiere desactivar autoridades paralelas).
- `docs/contratos/ANCHOR_EVENT_RULES.md` — Autoridad: ledger; Acciones: registro de hechos; Eventos explícitos; Temporalidad: confirmación externa vs registro interno; Fallo: idempotencia por unicidad; **Alineado**.
- `docs/contratos/TSA_EVENT_RULES.md` — Autoridad: ledger; Acciones: append TSA; Eventos explícitos; Temporalidad: `at` vs `gen_time`; Fallo: `tampered/unknown`; **Alineado**.
- `docs/contratos/CANONICAL_EVENTS_LIST.md` — Autoridad: contrato; Acciones: lista obligatoria; Eventos explícitos pero incompletos; Temporalidad: no definida; Fallo: no definido; **Parcialmente alineado**.
- `docs/contratos/EVENTS_VS_NOTIFICATIONS.md` — Autoridad: contrato; Acciones: derive emails from events; Eventos explícitos; Temporalidad: no definida; Fallo: no definido; **Alineado**.
- `docs/contratos/DOCUMENT_ENTITY_CONTRACT.md` — Autoridad: canon; Acciones: invariantes; Eventos: transform_log; Temporalidad: append-only; Fallo: prohibiciones claras; **Alineado**.
- `docs/contratos/ECO_FORMAT_CONTRACT.md` — Autoridad: canon; Acciones: snapshot; Eventos: anchors/timestamps en eco; Temporalidad: derivada; Fallo: prohibiciones; **Alineado**.
- `docs/contratos/ECO_V2_CONTRACT.md` — Autoridad: canon; Acciones: proyección; Eventos: anchors/timestamps; Temporalidad: derivada; Fallo: prohibiciones; **Alineado**.
- `docs/contratos/WORKFLOW_STATUS_SEMANTICS.md` — Autoridad: UI semántica derivada; Acciones: none; Eventos: requiere eventos reales; Temporalidad: derivada; Fallo: no define; **Alineado**.
- `docs/contratos/CONTRATO_ARTEFACTO_WORKFLOW.md` — Autoridad: worker + evento; Acciones explícitas; Eventos explícitos (`workflow.artifact_finalized`); Temporalidad: post-completed; Fallo: `failed` con reintentos; **Parcialmente alineado** (depende de workflow.completed como trigger).
- `docs/contratos/CONTRATO_ARTEFACTO_FINAL.md` — Autoridad: evento `workflow.completed`; Acciones explícitas; Eventos explícitos; Temporalidad: post-completed; Fallo: idempotencia; **Parcialmente alineado** (evento no listado en canonical list).
- `docs/contratos/HASH_CHAIN_RULES.md` — Autoridad: canon; Acciones: invariantes; Eventos: none; Temporalidad: append-only; Fallo: prohibiciones; **Alineado**.
- `docs/contratos/WITNESS_PDF_CONTRACT.md` — Autoridad: canon; Acciones: derivación; Eventos: transform_log; Temporalidad: append-only; Fallo: prohibiciones; **Alineado**.
- `docs/contratos/FLOW_MODES_CONTRACT.md` — Autoridad: canon; Acciones: derivación; Eventos: none; Temporalidad: no aplica; Fallo: prohibiciones; **Alineado**.
- `docs/contratos/PROTECTION_LEVEL_RULES.md` — Autoridad: derivación pura; Acciones: none; Eventos: tsa/anchor; Temporalidad: monotónica; Fallo: no degrada; **Alineado**.
- `docs/contratos/OPERATIONS_EVENTS_CONTRACT.md` — Autoridad: canon; Acciones: append-only; Eventos explícitos; Temporalidad: append-only; Fallo: no altera evidencia; **Alineado**.
- `docs/contratos/OPERATIONS_RESPONSIBILITY.md` — Autoridad: canon; Acciones: change responsable; Eventos explícitos; Temporalidad: no definida; Fallo: no definido; **Parcialmente alineado**.
- `docs/contratos/OPERACIONES_CONTRACT.md` — Autoridad: sistema; Acciones declaradas; Eventos implícitos; Temporalidad: estado de operación; Fallo: no definido; **Parcialmente alineado** (eventos implícitos).
- `docs/contratos/DOCUMENTS_OPERATIONS_SCOPE.md` — Autoridad: contrato; Acciones explícitas; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/anchoring/ANCHORING_FLOW.md` — Autoridad: cron/trigger; Acciones explícitas; Eventos: implícitos; Temporalidad: retries; Fallo: timeout; **En conflicto** (autoridad fuera del Executor).
- `docs/anchoring/README_ANCHORING.md` — Autoridad: operativa; Acciones implícitas; Eventos: no; Temporalidad: n/a; Fallo: no define; **Parcialmente alineado**.
- `docs/tsa/TSA_IMPLEMENTATION.md` — Autoridad: service layer; Acciones explícitas; Eventos: tsa appended; Temporalidad: append-only; Fallo: estados de verificación; **Alineado**.
- `docs/architecture/ARQUITECTURA_CANONICA.md` — Autoridad: capas; Acciones: eventos descritos; Eventos: lista y schema divergentes; Temporalidad: no definida; Fallo: no define; **En conflicto** (schema de eventos).
- `docs/decisions/DECISIONS_POST_ANCHOR_SPRINT.md` — Autoridad: decisiones; Acciones: congela cambios; Eventos: no; Temporalidad: post-merge; Fallo: no define; **En conflicto** (prohibe tocar triggers mientras el Executor pretende autoridad).
- `docs/decisions/REPORT_SUPABASE_RESOURCES.md` — Autoridad: inventario; Acciones: mapea duplicidades; Eventos: menciona múltiples productores; Temporalidad: n/a; Fallo: n/a; **Alineado** (diagnóstico de duplicidad).
- `docs/contratos/HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md` — Autoridad: sistema/flujo; Acciones explícitas; Eventos explícitos con naming divergente; Temporalidad: orden fijo TSA→anchor→firma; Fallo: “no avanzar sin evidencia”; **Parcialmente alineado**.
- `docs/contratos/VERIFIER_V2_CONTRACT.md` — Autoridad: lectura pura; Acciones: ninguna; Eventos: lee anchors/tsa; Temporalidad: n/a; Fallo: estados de verificación; **Alineado**.
- `docs/contratos/ENTRY_CONTRACT.md` — Autoridad: UI/entrada; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/WORKFLOW_CLOSURE_UX.md` — Autoridad: UI; Acciones: UX; Eventos: `workflow_completed` (SHOULD); Temporalidad: post-completion; Fallo: no define; **Alineado**.
- `docs/contratos/NOTIFICATION_POLICY.md` — Autoridad: política; Acciones: limits + idempotencia; Eventos: no; Temporalidad: cooldown; Fallo: no define; **Alineado**.
- `docs/contratos/IDENTITY_ASSURANCE_RULES.md` — Autoridad: contrato; Acciones: fallback automático implícito; Eventos explícitos; Temporalidad: antes de firma; Fallo: no bloquea por default; **Parcialmente alineado**.
- `docs/contratos/IDENTITY_LEVELS_SUMMARY.md` — Autoridad: resumen; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/IDENTITY_OTP_DECRYPTION_CONTRACT.md` — Autoridad: flujo; Acciones: orden de pasos; Eventos explícitos; Temporalidad: secuencial; Fallo: no define; **Parcialmente alineado**.
- `docs/contratos/WORKSPACE_PLAN_CONTRACT.md` — Autoridad: contrato; Acciones: enforcement; Eventos: `document.archived` explícito; Temporalidad: cuotas periódicas; Fallo: bloqueos explícitos; **Parcialmente alineado** (enforcement implica autoridad operativa fuera del Executor).
- `docs/contratos/LEGAL_CENTER_STAGE_CONTRACT.md` — Autoridad: UI layout; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/LEGAL_CENTER_LAYOUT_CONTRACT.md` — Autoridad: UI layout; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/P0_SEAL.md` — Autoridad: criterio operativo; Acciones: none; Eventos: requiere `workflow_events.kind` específicos; Temporalidad: post-completed; Fallo: definido por vista P0; **Parcialmente alineado** (naming de eventos).
- `docs/contratos/EVIDENCE_MOMENT_CONTRACT.md` — Autoridad: UI/semántica; Acciones: none; Eventos: no; Temporalidad: inmediato al completar firma/protección; Fallo: no define; **Alineado**.
- `docs/contratos/CONTRATO_ALMACENAMIENTO_PDF.md` — Autoridad: contrato; Acciones: persistence/encryption; Eventos: implícitos (witness); Temporalidad: al completar acción probatoria; Fallo: violaciones explícitas; **Parcialmente alineado** (requiere enforcement operativo fuera del Executor).
- `docs/contratos/CONTRATO_PROTECCION_DERIVADA.md` — Autoridad: derivación pura; Acciones: none; Eventos: explícitos pero con naming divergente; Temporalidad: conmutativa; Fallo: no define; **Parcialmente alineado**.
- `docs/contratos/CONTRATO_CAMINOS_FELICES.md` — Autoridad: contrato beta; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/DOCUMENT_INCOMPLETE_CONTRACT.md` — Autoridad: contrato; Acciones: none; Eventos: terminales explícitos; Temporalidad: n/a; Fallo: cierra con `document.failed`; **Parcialmente alineado** (naming de eventos requiere unificación).
- `docs/contratos/BATCH_CONTRACT.md` — Autoridad: contrato; Acciones: anchoring de batch; Eventos: no; Temporalidad: no definida; Fallo: no define; **Parcialmente alineado**.
- `docs/contratos/CONTRATO_ECO_ECOX.md` — Autoridad: canon; Acciones: separación ECO/ECOX; Eventos: explícitos; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/CONTRATO_LIFECYCLE_ECO_ECOX.md` — Autoridad: canon; Acciones: emisión de snapshots; Eventos: nombres no alineados (`ECOX_CREATED`, `eco.snapshot.issued`); Temporalidad: definida; Fallo: no define; **Parcialmente alineado**.
- `docs/contratos/DRAFT_OPERATION_RULES.md` — Autoridad: contrato; Acciones: prohibiciones; Eventos: explícitamente prohibidos; Temporalidad: n/a; Fallo: n/a; **Alineado**.
- `docs/contratos/ECO_ECOX_MIN_SCHEMA.md` — Autoridad: canon; Acciones: schema; Eventos: naming divergente; Temporalidad: n/a; Fallo: no define; **En conflicto**.
- `docs/contratos/IMPACTO_TECNICO_MAPA.md` — Autoridad: canon; Acciones: mapeo de impactos; Eventos: no; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/IN_PERSON_SIGNATURE_CONTRACT.md` — Autoridad: contrato; Acciones: registro de evento presencial; Eventos explícitos; Temporalidad: sesión; Fallo: idempotencia por sesión; **Alineado**.
- `docs/contratos/LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR.md` — Autoridad: checklist; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: n/a; **Alineado**.
- `docs/contratos/LISTA_IMPLEMENTACION_CIERRE.md` — Autoridad: checklist; Acciones: implementación; Eventos: referencias a eventos; Temporalidad: n/a; Fallo: n/a; **Alineado**.
- `docs/contratos/PLAN_MAESTRO_EJECUCION_ECOSIGN.md` — Autoridad: roadmap; Acciones: pasos de implementación; Eventos: naming no consistente; Temporalidad: secuencial; Fallo: criterios de done; **Parcialmente alineado**.
- `docs/contratos/POST_SIGNATURE_IMMUTABILITY.md` — Autoridad: contrato; Acciones: UI; Eventos: no; Temporalidad: post-firma; Fallo: no define; **Alineado**.
- `docs/contratos/SPRINT5_BACKEND_CONTRACT.md` — Autoridad: contrato técnico; Acciones: flujo de stamping + TSA + anchors; Eventos: naming divergente; Temporalidad: secuencial; Fallo: abort on forensic failure; **Parcialmente alineado**.
- `docs/contratos/README.md` — Autoridad: índice; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: n/a; **Alineado**.
- `docs/contratos/verdad-canonica.md` — Autoridad: constitución; Acciones: invariantes; Eventos: no; Temporalidad: n/a; Fallo: prohibiciones; **Alineado**.
- `docs/contratos/diagrams/README.md` — Autoridad: índice; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: n/a; **Alineado**.
- `docs/contratos/diagrams/DELIVERY_MODE.md` — Autoridad: contrato; Acciones: entrega de token; Eventos: naming parcial; Temporalidad: n/a; Fallo: no define; **Alineado**.
- `docs/contratos/diagrams/FIELDS_LIFECYCLE.md` — Autoridad: contrato; Acciones: materialización; Eventos: naming parcial; Temporalidad: ACTIVE; Fallo: no define; **Alineado**.
- `docs/contratos/diagrams/SIGNATURE_FORENSIC.md` — Autoridad: contrato; Acciones: secuencia; Eventos: naming parcial; Temporalidad: secuencial; Fallo: abort advance; **Parcialmente alineado**.
- `docs/contratos/diagrams/SIGNER_STATES.md` — Autoridad: contrato; Acciones: estados; Eventos: naming divergente; Temporalidad: secuencial; Fallo: no define; **Parcialmente alineado**.
- `docs/contratos/diagrams/WORKFLOW_STATES.md` — Autoridad: contrato; Acciones: estados; Eventos: no; Temporalidad: secuencial; Fallo: no define; **Alineado**.
- `docs/contratos/diagrams/ADJUSTMENTS.md` — Autoridad: notas; Acciones: none; Eventos: no; Temporalidad: n/a; Fallo: n/a; **Alineado**.

---

## Pendientes de lectura guiada (no analizados)

Cobertura total de `docs/contratos` completada. El inventario completo sigue en `docs/CONTRACT_INVENTORY.md`.

---

## Resolucion de Auditoria – Convencion de Eventos
A partir de Fase 1, la unica convención valida de eventos es `kind + at + payload`.
Cualquier referencia a `event`, `type` o `timestamp` se considera derivada, no canonica, y no puede ser usada por el Executor para cerrar pasos.

## Ajustes Fase 1 aplicados (documental)
- Convencion canonica actualizada en `docs/contratos/CANONICAL_EVENTS_LIST.md` y `docs/contratos/CONTRATO_AUTORIDAD_EJECUTOR.md`.
- Convencion de eventos agregada en: `docs/contratos/BATCH_CONTRACT.md`, `docs/contratos/CONTRATO_ARTEFACTO_FINAL.md`, `docs/contratos/CONTRATO_ARTEFACTO_WORKFLOW.md`, `docs/contratos/CONTRATO_LIFECYCLE_ECO_ECOX.md`, `docs/contratos/CONTRATO_MAPEO_EJECUTOR.md`, `docs/contratos/CONTRATO_PROTECCION_DERIVADA.md`, `docs/contratos/DOCUMENT_INCOMPLETE_CONTRACT.md`, `docs/contratos/EXPLICACION_EJECUTOR_Y_FLUJOS.md`, `docs/contratos/HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md`, `docs/contratos/IDENTITY_OTP_DECRYPTION_CONTRACT.md`, `docs/contratos/OPERATIONS_RESPONSIBILITY.md`, `docs/contratos/P0_SEAL.md`, `docs/contratos/PLAN_MAESTRO_EJECUCION_ECOSIGN.md`, `docs/contratos/SPRINT5_BACKEND_CONTRACT.md`, `docs/contratos/diagrams/SIGNATURE_FORENSIC.md`, `docs/contratos/diagrams/SIGNER_STATES.md`.
- Autoridad de ejecucion aclarada en: `docs/contratos/WORKSPACE_PLAN_CONTRACT.md`, `docs/contratos/OPERACIONES_CONTRACT.md`, `docs/contratos/IDENTITY_ASSURANCE_RULES.md`, `docs/contratos/CONTRATO_ALMACENAMIENTO_PDF.md`.
- Nota Fase 1 no autoritativa agregada en: `docs/architecture/ARQUITECTURA_CANONICA.md`, `docs/anchoring/ANCHORING_FLOW.md`, `docs/contratos/ECO_ECOX_MIN_SCHEMA.md`, `docs/decisions/DECISIONS_POST_ANCHOR_SPRINT.md`.
- Nota Fase 1 informativa agregada en `docs/anchoring/README_ANCHORING.md`.
