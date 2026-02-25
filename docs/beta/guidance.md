# Beta Guidance — Observability, Tests, and Exceptions

Fecha: 2026-01-12T18:30:47.813Z

## Observabilidad mínima (Suficiente para beta)

- Evitar integrar un sistema grande de inmediato (Sentry/BetterStack no es obligatorio para beta).
- Recolectar logs estructurados en Supabase (events: anchoring_failed, cron_missed, retries).
- Mantener un dashboard manual (hoja o dashboard ligero) con métricas clave: anchoring failed, cron not running, retries.

## Tests (prioridad limitada)

- Cubrir sólo flujos críticos antes del beta:
  1. 1 happy path end-to-end (firma → verificación → auditoría)
  2. 1 caso de fallo claro (ej: firma rechazada)
- Los tests RLS ya existentes se consideran prioridad alta.
- No perseguir porcentaje de cobertura ahora, priorizar valor de pruebas.

## Excepciones / Qué NO hacer antes del beta

- No refactorizar todos los scripts "fix" ahora — están documentando deuda y permiten operaciones.
- No auditar contratos on-chain si no hay valor monetario real; auditar antes de monetizar, no antes del beta privado.

## Re-evaluación

- Estas decisiones se re-evaluarán post-beta según telemetría, uso real y riesgos descubiertos.

---

Documentar en tickets cualquier cambio que altere el alcance aquí descrito.
