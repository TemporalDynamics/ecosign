# Bateria de Preguntas - Respuestas con Evidencia (EcoSign)

Fuente primaria: auditoria en `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
Fuente contractual: `docs/contratos/*`.
Fuente tecnica: migraciones y funciones en `supabase/`.

Nota: donde se requiere estado en produccion, se marca confianza baja y se incluyen queries sugeridas para ejecutar con Supabase CLI.

---

## AREA 1: AUTORIDAD Y ORQUESTACION (EXECUTOR)

P1.1: El executor esta desplegado y funcionando en produccion?
- Respuesta: No, solo existe la infraestructura.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/migrations/20260116090000_executor_jobs_and_outbox.sql`, `supabase/migrations/20260116091000_executor_job_runs.sql`.
- Confianza: Media (segun auditoria; falta verificacion en DB).
- Supabase CLI (verificar): `SELECT * FROM executor_jobs ORDER BY created_at DESC LIMIT 20;`

P1.2: Que jobs procesa actualmente el executor?
- Respuesta: Ninguno activo; solo definidos.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `packages/ecosign-orchestrator/src/job-types.ts`.
- Confianza: Media.

P1.3: El executor mantiene ECOX (append-only log)?
- Respuesta: Parcial. Los workers escriben en `document_entities.events[]`; executor no.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/process-polygon-anchors/index.ts`, `supabase/functions/process-bitcoin-anchors/index.ts`, `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`.
- Confianza: Media.

P1.4: El executor emite snapshots ECO?
- Respuesta: No. ECO se genera del lado cliente.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P1.5: Componentes que pueden cambiar `document_entities.lifecycle_status`?
- Respuesta: Triggers SQL y funciones (no hay executor activo). Listado exacto requiere revisar triggers DB.
- Evidencia: `supabase/migrations/20260106090001_document_entities_triggers.sql`.
- Confianza: Baja (requiere inspeccion completa en DB y funciones).
- Supabase CLI (verificar): `SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid = 'document_entities'::regclass;`

P1.6: Componentes que pueden crear registros en `anchors`?
- Respuesta: Workers cron `process-polygon-anchors` y `process-bitcoin-anchors`; edge functions `anchor-polygon` y `anchor-bitcoin` (legacy/aux).
- Evidencia: `supabase/functions/process-polygon-anchors/index.ts`, `supabase/functions/process-bitcoin-anchors/index.ts`, `supabase/functions/_legacy/anchor-polygon/index.ts`, `supabase/functions/_legacy/anchor-bitcoin/index.ts`.
- Confianza: Media.

P1.7: Componentes que pueden marcar workflow como "completed"?
- Respuesta: Trigger/funcion SQL y funciones de workflow (no executor).
- Evidencia: `supabase/migrations/20260112130000_workflow_states_v2.sql`, `supabase/functions/process-signature/index.ts`.
- Confianza: Baja (requiere rastreo completo de transiciones).

P1.8: Componentes que pueden escribir en `document_entities.events[]`?
- Respuesta: `append-tsa-event`, `record-protection-event`, `process-polygon-anchors`, `process-bitcoin-anchors`, `repair-missing-anchor-events`, y helpers compartidos.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/append-tsa-event/index.ts`, `supabase/functions/record-protection-event/index.ts`, `supabase/functions/repair-missing-anchor-events/index.ts`, `supabase/functions/_shared/canonicalEventHelper.ts`.
- Confianza: Media.

---

## AREA 2: ANCHORING (TSA, Polygon, Bitcoin)

P2.1: Caminos para crear anchor?
- Respuesta: 3 caminos.
  1) Trigger en `user_documents` llama function/edge para crear anchor.
  2) Cron `recover-orphan-anchors` reintenta orphans.
  3) Llamada directa a edge `anchor-polygon` / `anchor-bitcoin`.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/migrations/20251221100000_blockchain_anchoring_trigger.sql`, `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`, `supabase/functions/_legacy/anchor-polygon/index.ts`, `supabase/functions/_legacy/anchor-bitcoin/index.ts`.
- Confianza: Media.

P2.2: Anchors antes o despues de confirmar?
- Respuesta: Antes. Se crea `pending` y luego se confirma.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/process-polygon-anchors/index.ts`.
- Confianza: Alta.

P2.3: Si falla Polygon?
- Respuesta: Reintentos con backoff y max attempts.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/process-polygon-anchors/index.ts`.
- Confianza: Media.

P2.4: Si falla Bitcoin?
- Respuesta: Reintenta y puede aceptar Polygon si el usuario cancela Bitcoin.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/process-bitcoin-anchors/index.ts`.
- Confianza: Media.

P2.5: Tiempo entre upload y anchor confirmado?
- Respuesta: Polygon 30-60s tipico, hasta ~10 min. Bitcoin 4-24h, timeout 24h.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media (depende del entorno).

P2.6: Puede haber 2 anchors del mismo tipo?
- Respuesta: No. Contrato impone unicidad por network.
- Evidencia: `docs/contratos/ANCHOR_EVENT_RULES.md`, `supabase/functions/_shared/anchorHelper.ts`.
- Confianza: Alta.

P2.7: Si dos workers intentan anclar el mismo documento?
- Respuesta: Dedupe e idempotencia en helpers, backoff y skip locked.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/_shared/anchorHelper.ts`.
- Confianza: Media.

P2.8: Eventos de anchoring escriben en `document_entities.events[]`?
- Respuesta: Si.
- Evidencia: `supabase/functions/process-polygon-anchors/index.ts`, `supabase/functions/process-bitcoin-anchors/index.ts`.
- Confianza: Alta.

---

## AREA 3: DOCUMENT_ENTITIES Y EVENTOS CANONICOS

P3.1: `document_entities.events[]` es append-only?
- Respuesta: Si, enforced por trigger.
- Evidencia: `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`.
- Confianza: Alta.

P3.2: Componentes que escriben en `document_entities.events[]`?
- Respuesta: Ver P1.8.
- Evidencia: `supabase/functions/_shared/canonicalEventHelper.ts` y funciones listadas.
- Confianza: Media.

P3.3: Eventos tienen estructura uniforme?
- Respuesta: Parcial. Contrato define schema canonico, pero algunos eventos legacy pueden variar.
- Evidencia: `docs/contratos/CANONICAL_EVENTS_LIST.md`, `docs/contratos/ANCHOR_EVENT_RULES.md`, `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P3.4: Eventos canonicos hoy?
- Respuesta: Canonicos por contrato (workflow/signer/eco) + observados en implementacion (tsa, anchor, protection_enabled, signed).
- Evidencia: `docs/contratos/CANONICAL_EVENTS_LIST.md`, `docs/contratos/TSA_EVENT_RULES.md`, `docs/contratos/ANCHOR_EVENT_RULES.md`, `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P3.5: Nivel de proteccion se deriva de eventos o legacy?
- Respuesta: Hibrido. Eventos son fuente principal pero hay fallback legacy.
- Evidencia: `client/src/lib/protectionLevel.ts`, `client/src/pages/DocumentsPage.tsx`, `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P3.6: Donde se calcula el nivel de proteccion?
- Respuesta: Cliente (principal) y helpers server-side.
- Evidencia: `client/src/lib/protectionLevel.ts`, `supabase/functions/_shared/anchorHelper.ts`.
- Confianza: Media.

P3.7: Hay documentos legacy sin eventos pero con anchors?
- Respuesta: Probable. Existe funcion de reparacion.
- Evidencia: `supabase/functions/repair-missing-anchor-events/index.ts`.
- Confianza: Media.

P3.8: Legacy migrando a eventos canonicos?
- Respuesta: Parcial. Dual-write activo; migracion completa no automatica.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

---

## AREA 4: NOTIFICACIONES

P4.1: Productores de notificaciones por workflow completado?
- Respuesta: `build-final-artifact` + `notify-artifact-ready` + workers de anchors.
- Evidencia: `supabase/functions/build-final-artifact/index.ts`, `supabase/functions/notify-artifact-ready/index.ts`, `supabase/functions/process-polygon-anchors/index.ts`, `supabase/functions/process-bitcoin-anchors/index.ts`.
- Confianza: Media.

P4.2: Puede haber notificaciones duplicadas?
- Respuesta: Posible, mitigado por constraint unico.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/migrations/20260115100000_add_notification_step_and_unique_constraint.sql`.
- Confianza: Media.

P4.3: Notificaciones antes o despues del artefacto?
- Respuesta: Ambas. Anchors notifican antes; artifact despues.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P4.4: Si falla envio de notificacion?
- Respuesta: Reintentos con max retries.
- Evidencia: `supabase/functions/send-pending-emails/index.ts`.
- Confianza: Media.

---

## AREA 5: ARTEFACTO FINAL (ECO/PDF)

P5.1: Cuando se genera artefacto final?
- Respuesta: Al completarse workflow (async).
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/build-final-artifact/index.ts`.
- Confianza: Media.

P5.2: Que componente genera artefacto?
- Respuesta: Edge function `build-final-artifact`.
- Evidencia: `supabase/functions/build-final-artifact/index.ts`.
- Confianza: Alta.

P5.3: Artefacto puede regenerarse?
- Respuesta: Si, idempotente, con lock de estado.
- Evidencia: `supabase/functions/build-final-artifact/index.ts`.
- Confianza: Media.

P5.4: Artefacto incluye todos los anchors confirmados?
- Respuesta: Incluye los disponibles al momento. Anchors tardios no re-generan automaticamente.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P5.5: Existe ECOX separado de ECO?
- Respuesta: Parcial. `document_entities.events[]` es ECOX; snapshots ECO no automatizados.
- Evidencia: `docs/contratos/ECO_V2_CONTRACT.md`, `supabase/migrations/20260106090005_document_entities_events.sql`.
- Confianza: Media.

P5.6: Multiples snapshots ECO?
- Respuesta: Contrato lo define, implementacion actual no.
- Evidencia: `docs/contratos/ECO_V2_CONTRACT.md`, `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P5.7: EcoSign firma cada snapshot ECO?
- Respuesta: No implementado.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

---

## AREA 6: WORKERS Y CRON JOBS

P6.1: Inventario de workers activos?
- Respuesta: `process-polygon-anchors` (1m), `process-bitcoin-anchors` (5m), `recover-orphan-anchors` (5m), `build-final-artifact` (on-demand), `notify-artifact-ready` (on-demand), `send-pending-emails` (on-demand).
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/functions/process-polygon-anchors/cron.sql`, `supabase/functions/process-bitcoin-anchors/cron.sql`, `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`.
- Confianza: Media (frecuencias segun docs).
- Supabase CLI (verificar): `SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;`

P6.2: Workers overlapping?
- Respuesta: Overlap menor entre recovery y procesadores; no colisionan por criterio de seleccion.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P6.3: Workers tienen locks?
- Respuesta: Si. Backoff y locks logicos; executor usa SKIP LOCKED (cuando activo).
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/migrations/20260116090000_executor_jobs_and_outbox.sql`.
- Confianza: Media.

P6.4: Monitoreo de workers?
- Respuesta: Logs de Supabase. No hay monitoreo externo.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P6.5: Fallos por semana?
- Respuesta: No hay metricas.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Baja.

P6.6: Alertas por fallo critico?
- Respuesta: No.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

---

## AREA 7: RLS Y PERMISOS

P7.1: Usuarios pueden INSERT directo en anchors?
- Respuesta: No, bloqueado (service_role para workers).
- Evidencia: `supabase/migrations/20260111050700_fix_anchors_policy.sql`, `supabase/migrations/20251218120000_fix_anchors_service_role_insert.sql`.
- Confianza: Media.

P7.2: Usuarios pueden UPDATE directo en document_entities?
- Respuesta: No, solo service_role.
- Evidencia: `supabase/migrations/20260106090002_document_entities_rls.sql`.
- Confianza: Media.

P7.3: Usuarios pueden modificar document_entities.events?
- Respuesta: No, restringido por RLS + trigger append-only.
- Evidencia: `supabase/migrations/20260106090002_document_entities_rls.sql`, `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`.
- Confianza: Media.

P7.4: Tablas con RLS permisivo?
- Respuesta: Requiere auditoria especifica por tabla.
- Evidencia: `docs/security/SECURITY_RLS_CHECKLIST.md`, `supabase/migrations/20251125120000_fix_security_performance_issues.sql`.
- Confianza: Baja.
- Supabase CLI (verificar): `SELECT * FROM pg_policies ORDER BY schemaname, tablename;`

---

## AREA 8: UI Y UX (BUGS OBSERVADOS)

P8.1: Badge de proteccion se deriva de eventos o legacy?
- Respuesta: Hibrido (events + legacy fallback).
- Evidencia: `client/src/lib/protectionLevel.ts`, `client/src/pages/DocumentsPage.tsx`.
- Confianza: Media.

P8.2: Badge no refleja realidad?
- Respuesta: Posible por fallback legacy y anchors tardios.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P8.3: Anchor tarda dias en confirmarse?
- Respuesta: Badge no se regenera automaticamente si artefacto ya se genero.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

P8.4: Validacion de email dispara toasts en cada keystroke?
- Respuesta: No confirmado.
- Evidencia: No se encontro prueba directa.
- Confianza: Baja.

P8.5: Otras validaciones con comportamiento similar?
- Respuesta: No identificado en codigo.
- Confianza: Baja.

---

## AREA 9: LIMITES Y PLANES

P9.1: Donde se validan limites de plan?
- Respuesta: No se encontro enforcement hard en backend; probable en frontend.
- Evidencia: Requiere busqueda especifica de planes/limits.
- Confianza: Baja.

P9.2: Usuario free intenta proteger documento 11?
- Respuesta: No identificado. Requiere definicion de planes.
- Confianza: Baja.

P9.3: Limites soft o hard?
- Respuesta: No identificado.
- Confianza: Baja.

---

## AREA 10: ESCALABILIDAD

P10.1: Documentos por dia?
- Respuesta: No observable desde repo.
- Confianza: Baja.
- Supabase CLI (verificar): `SELECT COUNT(*) FROM user_documents WHERE created_at > now() - interval '1 day';`

P10.2: Tiempo promedio proteccion completa?
- Respuesta: No medido en repo. Hay estimaciones en auditoria para anchors.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Baja.

P10.3: 1000 uploads simultaneos?
- Respuesta: No confirmado. Executor no activo; cron workers seriales.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Baja.

P10.4: Componente mas lento?
- Respuesta: Probablemente Bitcoin anchoring.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `docs/anchoring/BITCOIN_ANCHORING_GUIDE.md`.
- Confianza: Media.

P10.5: Limites de rate?
- Respuesta: No documentado en repo.
- Confianza: Baja.

---

## SECCION ESPECIAL: PREGUNTAS CRITICAS DE SUPERVIVENCIA

PC1: Si Bitcoin tarda 7 dias, usuario recibe artefacto completo en dia 7?
- Respuesta: No garantizado. Artefacto se genera al completar workflow y no se regenera automaticamente.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

PC2: Si un worker cron falla 48h, se recupera?
- Respuesta: Si para anchoring, cron + recovery reintenta.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`, `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`.
- Confianza: Media.

PC3: Bug puede corromper document_entities.events[]?
- Respuesta: Parcialmente protegido. Append-only enforced pero no valida schema completo.
- Evidencia: `supabase/migrations/20260106130000_harden_events_canonical_invariants.sql`.
- Confianza: Media.

PC4: Existe mecanismo de rebuild truth?
- Respuesta: En teoria si (eventos canonicos). No hay proceso automatizado.
- Evidencia: `docs/contratos/verdad-canonica.md`, `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

PC5: Executor puede procesar 10,000 documentos en paralelo?
- Respuesta: No, no esta activo.
- Evidencia: `docs/audit/AUDIT_RESPONSE_2026_01_16.md`.
- Confianza: Media.

