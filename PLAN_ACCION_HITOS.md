# Plan de Accion por Hitos (Checklist)

Objetivo: avanzar sin fechas, por hitos verificables, manteniendo autoridad canónica y conviviendo con legacy hasta que haya runs reales estables.

Regla mental:
- H2 valida verdad (historia completa, causalidad sin huecos).
- H3 valida evidencia (artefacto legal fuerte y determinista).

---

## H0 — Linea Base de Autoridad
Objetivo: Confirmar que la autoridad canónica observa todo sin romper legacy.

Checklist:
- [ ] Shadow logs activos para D12–D15 (insertando en `shadow_decision_logs`).
- [ ] Comparación canónica vs legacy registrada (sin divergencias críticas).
- [ ] Executor corriendo y registrando decisiones actuales.

Evidencia:
- [ ] Capturas/queries de `shadow_decision_logs`.
- [ ] Logs del executor con comparación canónica.

Estado (2026-01-24 12:30):
- ✅ Shadow logs instrumentados: D12-D15, D16-D19, D20-D22 (13 decisiones)
- ✅ 0 divergencias en 73 runs (100% match rate)
- ⚠️ TODOS los runs son SIMULADOS (0 runs reales detectados)
- ⚠️ Executor corre en cloud (Supabase Edge Function), no localmente
- ❌ Base de datos local sin datos de executor (0 jobs procesados)

Evidencia:
- Script validación: `scripts/h0-validate-shadow.sql` ejecutado
- Reporte: 13 decisiones OK, 0 divergencias, 73 runs simulados

Acción requerida:
- Acceder a base de datos de producción para validar runs reales
- O generar tráfico real en ambiente de desarrollo

---

## H1 — Runs Reales Controlados
Objetivo: Ejecutar casos reales con trazabilidad completa sin apagar legacy.

Checklist:
- [ ] 3–5 runs reales ejecutados.
- [ ] Cada run con historia completa en `document_entities.events[]`.
- [ ] `executor_job_runs` refleja inicio/fin/estado por job.

Evidencia:
- [ ] Export o snapshot de events por run.
- [ ] Registros de `executor_job_runs` por run.

Registro de runs (completar):
| run_id | document_entity_id | fecha | evidencia_events | evidencia_jobs | notas |
| ------ | ------------------ | ----- | ---------------- | -------------- | ----- |
|        |                    |       |                  |                |       |
|        |                    |       |                  |                |       |
|        |                    |       |                  |                |       |
|        |                    |       |                  |                |       |
|        |                    |       |                  |                |       |

Script de snapshot:
- `scripts/h1-run-snapshot.sql` (psql con `-v document_entity_id='UUID'`)

---

## H2 — Cierre de 1 Flujo E2E (Verdad, no evidencia)
Objetivo: Un flujo completo con causalidad clara, aunque el artefacto sea stub.

Checklist:
- [ ] NDA -> firma -> TSA -> anchors (segun config) -> artifact.finalized (stub permitido).
- [ ] No hay huecos de causalidad en `document_entities.events[]`.
- [ ] Estados intermedios coherentes (sin ambiguedad).

Evidencia:
- [ ] Secuencia de eventos canónicos para el flujo completo.
- [ ] Registro de jobs del executor asociados.

---

## H3 — Artefacto Probatorio Real (Evidencia)
Objetivo: Artefacto legalmente fuerte, determinista y completo.

Checklist:
- [ ] Artefacto incluye: documento original, firmas, TSA, anchors, hashes, TCA.
- [ ] `artifact.finalized` refleja contenido completo.
- [ ] Determinismo: mismo input -> mismo output (hash estable).

Evidencia:
- [ ] Hash del PDF estable en re-run.
- [ ] Comparacion de outputs identicos.

---

## H4 — Operabilidad para 1 Persona
Objetivo: Diagnostico por eventos sin leer logs crudos.

Checklist:
- [ ] Lista explicita de fallos conocidos con sintomas y eventos.
- [ ] Runbook: "si paso X -> busco evento Y".
- [ ] Vistas/queries para lectura rapida de casos.

Evidencia:
- [ ] Runbook operativo.
- [ ] Ejemplos reales documentados.

---

## H5 — UX Basada en Eventos
Objetivo: UI refleja estados desde `document_entities.events[]`.

Checklist:
- [ ] Estados finales inequívocos en UI.
- [ ] Evidencia visible (descarga clara).
- [ ] Nada queda "cargando para siempre".

Evidencia:
- [ ] Mapping de estados UI <-> eventos.
- [ ] Capturas de pantallas.

---

## H6 — Apagado de Autoridad Paralela (Legacy)
Objetivo: Toda ejecucion pasa por executor; legacy apagado con rollback.

Checklist:
- [ ] Triggers/cron legacy deshabilitados.
- [ ] No hay ejecucion fuera del executor.
- [ ] Plan de rollback documentado.

Evidencia:
- [ ] Migracion aplicada (o script ejecutado).
- [ ] Verificacion post-apagado.

---

Notas:
- No apagar legacy antes de H6.
- Mantener foco por hito (no mezclar H2 con H3).
