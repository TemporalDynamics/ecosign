# Entregable C — Mapa de Autoridad Real (Decide vs Ejecuta)

Regla: por cada componente responder: "Esto decide o solo ejecuta?".

Referencia de autoridad:
- `docs/validation/fase3-premortem-tech-map.md`

## Inventario de componentes

Completar esta tabla con una sola categoria por fila.

Categorias permitidas:
- decide
- ejecuta
- decide+y+ejecuta (debe justificarse y es candidato a ruptura)

| Componente | Tipo | Lee eventos canónicos | Escribe eventos canónicos | Encola jobs | Ejecuta side-effects | Guard/auth claro | Nota |
|---|---|---:|---:|---:|---:|---:|---|
| DB triggers (immutability/guards) | decide | 0 | 0 | 0 | 0 | 1 | Guardrails de invariantes (decision negativa: bloquear) |
| pg_cron jobs | ejecuta | 0 | 0 | 0 | 1 | 1 | Scheduling; riesgo de drift/doble cron |
| runtime_tick() | decide+y+ejecuta | 0 | 0 | 1 | 1 | 1 | Hace reclaim (decision) + invoca decision+execution (ejecucion) |
| fase1-executor | decide | 1 | 0 | 1 | 0 | 1 | Decide jobs downstream segun events/flags |
| orchestrator | ejecuta | 0 | 0 | 0 | 1 | 1 | Ejecuta jobs; genera trace_id; puede reclamar/reintentar |
| run-tsa worker | ejecuta | 0 | 1 | 0 | 1 | 1 | Side-effect externo (TSA) + escribe `tsa.*` |
| submit-anchor-* workers | ejecuta | 0 | 1 | 0 | 1 | 1 | Escribe `anchor.pending/failed` + side-effect (submit) |
| process-*-anchors (cron+edge) | ejecuta | 0 | 1 | 0 | 1 | ⚠️ | Tiene `service_role_enforced` en algunos; TODO(canon) ids legacy |
| build-artifact worker | ejecuta | 0 | 1 | 0 | 1 | 1 | Genera artifact/witness + escribe `artifact.*` |
| verify/access endpoints (share/nda/otp) | decide+y+ejecuta | ⚠️ | ⚠️ | 0 | 1 | ❌ | Mezcla decision (acceso/NDA) y side-effects; naming drift + auth inconsistente |

## Puntos que rompen el modelo de autoridad (max 10)

Escribir solo los mas graves.

1) Drift residual: fuentes legacy (tablas/logs) pueden parecer "verdad" si la UI las usa como autoridad (la evidencia real es solo `document_entities.events[]`).
2) `correlation_id` no cerrado/enforceado (default random) ⇒ trazabilidad decorativa; auditoria por documento inconsistente.
3) `custody_mode` semantica rota (source_storage_path permitido en hash_only + UI gating por encrypted_custody) ⇒ promesa de producto incumplible.
4) Edge endpoints con `service_role_used_no_gate` / `unknown` ⇒ poder excesivo sin guard; riesgo de exposicion si quedan publicos.
5) runtime scheduling con drift (crons viejos vs `runtime_tick` unico) ⇒ doble ejecucion o colas raras.
6) Share/NDA: el sistema decide acceso y registra efectos en tablas legacy sin garantia de evidencia canónica (events[]).
7) Workflow firma: gating secuencial no garantizado (riesgo: notificaciones a todos; el engine decide mal el orden) ⇒ rompe happy path D.
8) Anchors: TODO(canon) `user_document_id -> document_entity_id` en procesos de confirmacion ⇒ mezcla de fuentes de verdad.
9) `process_document_entity_events` trigger (listener) puede ejecutar efectos en respuesta a eventos ⇒ riesgo de decision+ejecucion dentro de DB si no esta estrictamente acotado.
10) Endpoints publicos que envian email (`send-share-otp`) sin decision de auth/rate-limit ⇒ abuso operativo (spam) + ruido de evidencia.

## Propuesta de orden de correccion (sin codigo)

Ordenar por impacto en Canary (P0/P1/P2) y justificar en 1 linea cada una.

1) P0: Cerrar naming canónico de eventos probatorios (dot-notation) y declarar politica legacy (sin esto no hay evidencia en Flow C/D).
2) P0: Cerrar/enforcear contrato de `correlation_id` (entity_id vs reject/default) para trazabilidad consistente.
3) P0: Cerrar contrato de `custody_mode` (hash-only vs custody recuperable vs hibrido) y alinear UI/DB.
4) P0: Clasificar y gatear endpoints internos (service role guard explicito) + decidir auth de endpoints "unknown".
5) P1: Resolver drift de crons hacia `runtime_tick` unico (una sola fuente de scheduling) antes de Canary.

## Definicion de Done (C)

- Tabla completa con categorias univocas.
- Lista de rupturas max 10, no mas.
- Orden de correccion propuesto sin soluciones de implementacion.
