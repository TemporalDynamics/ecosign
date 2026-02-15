# Canonical Convergence Implementation

Fecha: 2026-02-15
Estado: Activo
Owner: Platform

## Objetivo
Converger de un sistema con progresion por side-effects a uno donde la progresion depende solo de:
- `document_entities.events[]`
- `decision engine`
- `executor`

## Contrato Final (No negociable)
1. Ninguna progresion sin evento nuevo.
2. El `decision engine` decide todo job siguiente.
3. El `executor` no decide negocio.
4. Mismo `events[]` produce mismo resultado en cualquier entorno.
5. Feature flags no alteran decisiones con mismo historial.
6. Triggers no encolan jobs de negocio.
7. Workers externos solo producen eventos de resultado.
8. `completion` se define por evento terminal canonico.

## Limites por componente
- `Decision engine`
  - Input: `events[]` + policy inmutable del request.
  - Output: lista de jobs.
  - Prohibido: leer env/flags/tiempo/tablas auxiliares.
- `Executor`
  - Ejecuta jobs y escribe resultados.
  - Prohibido: crear jobs por iniciativa propia, reencolar por heuristica, inferir estado.
- `Triggers`
  - Solo validacion/invariantes.
  - Prohibido: progresion de negocio.
- `Workers externos`
  - Solo efecto externo + evento canonico de salida.
  - Prohibido: mutar estado de dominio sin evento.

## Fases y gate de salida
- Fase 0: contrato congelado e inventario activo.
- Fase 1: mapa completo de motores de progresion.
- Fase 1.5: tracing y logs estructurados de causalidad.
- Fase 2: conversion de progresion implicita a eventos.
- Fase 3: decision engine autosuficiente (`F(events, policy)`).
- Fase 4: executor realmente dumb.
- Fase 5: triggers como observers.
- Fase 6: shadow canonical-only en staging.
- Fase 7: cleanup parcial pre-switch.
- Fase 8: authority switch.
- Fase 9: cleanup final.

No se avanza de fase por tiempo. Solo por invariantes cumplidos.

## Comandos operativos
- Inventario de motores de progresion:
  - `bash scripts/diagnostics/generate-progression-inventory.sh`
- Gate de readiness (`go/no-go`):
  - `bash scripts/diagnostics/check-canonical-readiness.sh`

## Criterio brutal de readiness
Si deshabilitamos triggers legacy y congelamos flags, el pipeline debe seguir corriendo solo con `events + decision engine + executor`.
