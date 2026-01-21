# Inventario de Autoridad - Eventos Canónicos

**Fecha:** 2026-01-21  
**Estado:** Activo

## Eventos de Evidencia Fuerte

| Evento | Writers Permitidos | Condición de Autoridad | Fuente de Verdad |
|--------|-------------------|----------------------|------------------|
| `document.signed` | `process-signature` | Firmante verificado, OTP confirmado | `process-signature` |
| `tsa.confirmed` | `process-signature`, `legal-timestamp` | Validado por executor, token verificable | `legal-timestamp` + `appendEvent` |
| `anchor.submitted` | `submit-anchor-polygon`, `submit-anchor-bitcoin` | Job `submit_anchor_*` encolado por executor | `submit-anchor-*` |
| `anchor` / `anchor.confirmed` | `process-polygon-anchors`, `process-bitcoin-anchors` | Confirmación blockchain verificada | `process-*-anchors` |
| `artifact.finalized` | `build-artifact` | Todos los eventos requeridos presentes | `build-artifact` |
| `document.protected.requested` | `start-signature-workflow` | Workflow iniciado con protección requerida | `start-signature-workflow` |

## Eventos de Seguimiento

| Evento | Writers Permitidos | Condición de Autoridad | Fuente de Verdad |
|--------|-------------------|----------------------|------------------|
| `tsa.failed` | `process-signature`, `fase1-executor` | Intento fallido con retryable flag | `process-signature` |
| `anchor.failed` | `submit-anchor-*`, `process-*-anchors` | Confirmación fallida | `process-*-anchors` |
| `artifact.failed` | `build-artifact` | Error en construcción | `build-artifact` |

## Reglas de Autoridad

1. **Solo el executor puede encolar jobs** para eventos de evidencia fuerte
2. **Los workers solo ejecutan tareas técnicas** y reportan resultados
3. **Todos los eventos se validan** antes de ser agregados a `document_entities.events[]`
4. **La autoridad de decisión reside en el executor**, no en los workers