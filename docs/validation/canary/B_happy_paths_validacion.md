# Entregable B — Happy Paths Validados (Solo flujos verdes)

Regla: aca no se proponen fixes. Solo se declara si el sistema cumple o no.

Referencia de autoridad:
- `docs/validation/fase3-premortem-tech-map.md` (Flow Matrix)

## Tabla de validacion por flujo

Leyenda:
- ✔️ ya pasa
- ⚠️ pasa pero con drift
- ❌ no pasa

### Flujo A — Proteger documento (TSA)

| Campo | Detalle |
|---|---|
| Entrada | `record-protection-event` (UI) → append `document.protected.requested` |
| Eventos canónicos esperados | `document.protected.requested` → `tsa.confirmed` (o `tsa.failed`) |
| Jobs/workers esperados | `protect_document_v2` → `fase1-executor` encola `run_tsa` → `orchestrator` ejecuta `run-tsa` |
| Estado UI esperado | "Procesando" mientras no hay `tsa.confirmed`; "Protegido" al entrar `tsa.confirmed`; sin refresh manual |
| NO debe pasar | Quedar indefinidamente en "Procesando"; `correlation_id` random; escribir evidencia fuera del writer canónico |
| Estado actual (✔️/⚠️/❌) | ⚠️ (asumir falla): riesgo alto por `correlation_id` no enforceado y timeouts/heartbeat externos; no verificado en prod desde este doc |
| Evidencia (que queda portable) | events[] con TSA token + hashes; artifact/witness descargable |

### Flujo B — Proteger + anchors

| Campo | Detalle |
|---|---|
| Entrada | `record-protection-event` + plan/flags habilitan anchors |
| Eventos canónicos esperados | `document.protected.requested` → `tsa.confirmed` → `anchor.pending` → `anchor.confirmed` (o `anchor.failed`) |
| Jobs/workers esperados | `submit-anchor-*` → crons `process-polygon-anchors` / `process-bitcoin-anchors` confirman |
| Estado UI esperado | Nivel probatorio sube cuando entra confirmacion; UI muestra "Anclado"/"Reforzado" segun evidencias |
| NO debe pasar | Anclas confirmadas solo en tablas legacy sin evento canónico; drift `user_document_id` vs `document_entity_id` |
| Estado actual (✔️/⚠️/❌) | ⚠️: hay TODO(canon) de migracion `user_document_id -> document_entity_id` en cron/edge de anchors; riesgo de evidencia incompleta |
| Evidencia (que queda portable) | events[] con TSA + anchor confirm (txid/blockheight/ots proof) + artifact |

### Flujo C — Documento → NDA → Share (con/sin NDA)

| Campo | Detalle |
|---|---|
| Entrada | `generate-link` + `verify-access` + (`accept-nda` / `accept-share-nda`) |
| Eventos canónicos esperados | `share.created` (+ `include_nda/require_nda`) → `nda.accepted` (si aplica) → `share.opened` |
| Jobs/workers esperados | Ninguno (deberia ser stateless/DB + evidencia) |
| Estado UI esperado | Owner ve: link creado/abierto/NDA aceptada; Receptor: gating NDA si aplica; acceso estable |
| NO debe pasar | Eventos probatorios que NO quedan en events[]; confundir NDA "historia" vs "include_nda" por share |
| Estado actual (✔️/⚠️/❌) | ⚠️: el flujo fue migrado a dot-notation (`share.created`, `share.opened`, `nda.accepted`) pero no esta validado end-to-end en ambiente real |
| Evidencia (que queda portable) | Timeline verificable (share/nda/access) en `document_entities.events[]` + links/nda_acceptances como soporte operativo |

### Flujo D — Operacion → firma secuencial → certificado

| Campo | Detalle |
|---|---|
| Entrada | `start-signature-workflow` + OTP (`send-signer-otp`/`verify-signer-otp`) + firma (`store/apply-signer-signature`) |
| Eventos canónicos esperados | Documento: `document.signed` al completar; (workflow) artifact finalizado; `otp.verified` como evento probatorio (si se exige) |
| Jobs/workers esperados | workflow pipeline + `build-final-artifact` (y notificaciones) |
| Estado UI esperado | Gating secuencial real: solo se habilita firmante N+1 cuando N firma; certificado final disponible |
| NO debe pasar | Emails/invitaciones a todos juntos; OTP sin evidencia; estados derivados de tablas legacy inconsistentes |
| Estado actual (✔️/⚠️/❌) | ❌: pre-mortem marca gating como punto de ruptura probable ya observado; OTP probatorio ya es dot-notation, pero el flujo sigue roto por orden/secuencialidad |
| Evidencia (que queda portable) | PDF final + evidencia de firmas en events[]/workflow_events; hoy no esta cerrado para Canary |

### Flujo E — Draft → legal → firmas → anchor (opcional)

| Campo | Detalle |
|---|---|
| Entrada | `save-draft` → convertir a documento legal (crear `document_entity_id`) → proteccion + workflow |
| Eventos canónicos esperados | `document.protected.requested` → `tsa.confirmed` → `document.signed` (+ anchors si aplica) |
| Jobs/workers esperados | runtime_tick + executor/orchestrator + workflow pipeline |
| Estado UI esperado | Draft visible como draft hasta que exista `document_entity_id`; luego mismo documento (sin duplicacion) atraviesa proteccion/firma |
| NO debe pasar | Dual-write sin reconciliacion; "dos documentos" (uno en operacion y otro suelto); perdida de material del draft |
| Estado actual (✔️/⚠️/❌) | ❌: el pre-mortem marca draft dual-write y "load draft file server-side" como pendiente; no es canary-ready |
| Evidencia (que queda portable) | Debe existir evidencia completa desde la conversion; hoy no esta verificado |

## Observaciones

- P0: Flujo C roto por evidencia ausente (drift de naming en eventos probatorios).
- P0: `correlation_id` no cerrado/enforceado contamina trazabilidad de todos los flujos.
- P0: `custody_mode` ambiguo rompe promesa de producto (si existe toggle).

## Definicion de Done (B)

- Cada flujo A-E tiene su tabla completa.
- No hay edge cases ni fixes propuestos.
- Las brechas (⚠️/❌) quedan explicitadas en terminos de contratos/eventos/jobs/UI.
