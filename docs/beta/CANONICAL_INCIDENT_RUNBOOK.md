# Canonical Incident Runbook (Evidence + Projection)

Fecha: 2026-03-06  
Ámbito: runtime canónico (`document_entities.events[]` como fuente de verdad) + proyecciones derivadas.

## Objetivo

Responder incidentes de evidencia/proyección sin romper invariantes de autoridad y con verificación post-incidente obligatoria.

## Principios

- No escribir directamente sobre proyecciones congeladas (`user_documents`, `workflow_signers.status`, `signature_workflows.status`) fuera de contextos permitidos.
- Recuperar desde fuente canónica (eventos) y/o funciones de rebuild autorizadas.
- Toda intervención termina con verificación post-incidente (runtime, observabilidad, drift schema).

## Matriz rápida de incidente

1. **Proyección inconsistente**
- Síntoma: estado visible no coincide con eventos canónicos.
- Acción: ejecutar rebuild controlado.

2. **Evidencia en duda / pipeline incompleto**
- Síntoma: falta artefacto o cadena incompleta.
- Acción: validar flujo canónico completo + evidencias requeridas.

3. **Violación de invariante en runtime**
- Síntoma: bloqueos por writes directos, auth interna fuera de canal, jobs anómalos.
- Acción: revisar ledger de `invariant_violations`, corregir causa y re-verificar.

## Procedimiento estándar (on-call)

1. Confirmar alcance y entidad afectada (`document_entity_id`, `workflow_id`).
2. Capturar snapshot inicial (logs + estado actual).
3. Ejecutar recuperación mínima necesaria:
- proyección: `rebuild_user_documents_projection(...)` (vía script de drill).
- evidencia: rerun de flujo canónico permitido (sin bypass manual de invariantes).
4. Ejecutar verificación post-incidente completa:
- `npm run baseline:runtime`
- `npm run diag:invariant-observability`
- `npm run diag:schema-drift`
5. Registrar resultado y evidencia en reporte versionado.

## Drill oficial

Comando:

```bash
npm run diag:incident-recovery-drill
```

Qué valida:

- Drill transaccional de recuperación de proyección (`scripts/diagnostics/incident_recovery_projection_drill.sql`, con `ROLLBACK`).
- Smoke runtime canónico post-incidente.
- Scan de observabilidad de invariantes.
- Contrato de drift de schema.

Salida:

- Reporte en `docs/beta/INCIDENT_RECOVERY_DRILL_YYYY-MM-DD.md`.

## Criterio de cierre de incidente

- Recuperación aplicada sin saltar autoridad canónica.
- Verificaciones post-incidente en verde.
- Reporte de incidente/drill adjunto con timestamp UTC.
