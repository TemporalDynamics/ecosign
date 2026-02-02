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
| DB triggers | | | | | | | |
| pg_cron jobs | | | | | | | |
| runtime_tick() | | | | | | | |
| fase1-executor | | | | | | | |
| orchestrator | | | | | | | |
| run-tsa worker | | | | | | | |
| submit-anchor-* workers | | | | | | | |
| process-*-anchors (cron+edge) | | | | | | | |
| build-artifact worker | | | | | | | |
| verify/access endpoints | | | | | | | |

## Puntos que rompen el modelo de autoridad (max 10)

Escribir solo los mas graves.

1) 
2) 
3) 
4) 
5) 
6) 
7) 
8) 
9) 
10) 

## Propuesta de orden de correccion (sin codigo)

Ordenar por impacto en Canary (P0/P1/P2) y justificar en 1 linea cada una.

1) 
2) 
3) 
4) 
5) 

## Definicion de Done (C)

- Tabla completa con categorias univocas.
- Lista de rupturas max 10, no mas.
- Orden de correccion propuesto sin soluciones de implementacion.
