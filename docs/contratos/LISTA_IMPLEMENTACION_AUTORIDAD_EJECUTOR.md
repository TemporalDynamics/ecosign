# LISTA_IMPLEMENTACION_AUTORIDAD_EJECUTOR

Fecha: 2026-01-16
Estado: Canonical
Version: v1.0

Checklist minima para implementar el contrato de autoridad del executor sin refactors masivos.

## Checklist
- Definir un unico writer para eventos canonicos (executor o workers delegados).
- Bloquear o limitar INSERT directo en `anchors` desde usuarios.
- Centralizar la creacion de anchors en un solo flujo (executor/worker).
- Convertir triggers de notificacion a side-effects o desactivarlos gradualmente.
- Asegurar que `document_entities.events` sea append-only y no se escriba desde UI.
- Validar idempotencia en cada decision de avance del executor.
- Confirmar que `workflow_artifacts` y `system_emails` siguen siendo solo worker.
