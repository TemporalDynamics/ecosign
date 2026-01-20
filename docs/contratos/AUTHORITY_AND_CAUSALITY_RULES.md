# AUTHORITY_AND_CAUSALITY_RULES

Estado: Activo (Fase 1/2)

Este documento define la regla de autoridad y la causalidad obligatoria del sistema.
Es normativo: el codigo debe obedecerlo sin interpretacion ad-hoc.

## 1) Regla de autoridad (no negociable)
Si una accion probatoria no pasa por el executor, NO ocurre.

Traduccion operativa:
- El executor es el unico juez de causalidad.
- Los workers ejecutan tareas tecnicas; no deciden flujo.
- El cliente NUNCA ejecuta TSA ni anchoring.
- La base de datos NO ejecuta evidencia (solo encola o registra).

## 2) Eventos ECO vs ECOX
La evidencia publica (ECO) es un subconjunto curado de la evidencia tecnica (ECOX).

### ECO (hechos probatorios)
- `document.signed`
- `tsa.confirmed`
- `anchor.confirmed`
- `artifact.finalized`

### ECOX (operativo/tecnico)
- `document.protected.requested`
- `tsa.failed`
- `anchor.submitted`
- `anchor.failed`
- `artifact.failed`

Regla:
- Todo ECO puede vivir en ECOX.
- No todo ECOX debe aparecer en ECO.

## 3) Causalidad canonica (v2)
Orden obligatorio:
1) `document.signed`
2) `tsa.confirmed`
3) `artifact.finalized`
4) `anchor.confirmed`

El executor MUST respetar este orden al encolar jobs.

## 4) V1/V2 coexistencia
- V1 y V2 pueden coexistir, pero V2 es la autoridad de causalidad.
- Cualquier ejecucion directa (legacy) debe estar explicitamente gateada por flags.

## 5) Prohibiciones explicitas
- Ninguna Edge Function fuera del executor/worker puede ejecutar TSA o anchoring.
- Ningun trigger/cron de DB puede ejecutar TSA o anchoring en Fase 1/2.
- Ningun cliente puede invocar anchoring directamente.

## 6) Ver tambien
- `docs/contratos/TSA_AUTHORITY_RULES.md`
- `docs/decisions/DEC-AUTH-A3-TSA.md`
