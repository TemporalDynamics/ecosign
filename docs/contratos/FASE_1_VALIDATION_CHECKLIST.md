# FASE_1_VALIDATION_CHECKLIST

Estado: OPERATIVO
Fecha: 2026-01-18

## Objetivo
Checklist operativo para cerrar Fase 1 sin investigacion forense.
No es un contrato; es un criterio de verificacion ejecutable.

## Checklist (minimo)
- Se puede proteger un documento nuevo (sin legacy).
- Se emite `document.protected`.
- El Executor decide TSA.
- Se emite `tsa.confirmed` o `tsa.failed`.
- Polygon emite evento explicito (`anchor.confirmed` / `anchor.failed`).
- Bitcoin puede quedar pending con evento (`anchor.pending`).
- La UI refleja solo eventos canonicos, sin suposiciones.
- El estado final se infiere sin SQL exploratorio.

## Criterio de cierre
Fase 1 se considera cerrada cuando todos los items anteriores
se cumplen al menos una vez en el mismo flujo completo.
