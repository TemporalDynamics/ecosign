# Documentation Roadmap — `@temporaldynamics/ffmpeg-orchestrator`

## Objetivo
Equipar la librería con todos los materiales que un licenciatario necesita para operar y auditar pipelines FFmpeg en menos de un sprint.

## Frentes
1. **Quick Start Bundle (listo)**
   - README + `API.md` + `EXAMPLES.md` describen creación de colas, manejo de eventos y retries.
   - `PRICING.md` y `LICENSE-COMMERCIAL.md` para ventas.
2. **Operational Docs (Semana 2)**
   - `RUNBOOK.md`: cómo monitorear workers, interpretar logs de progreso y rotar binarios FFmpeg.
   - `OBSERVABILITY_GUIDE.md`: métricas recomendadas (jobs activos, throughput, tiempo medio) + dashboards sugeridos.
3. **Scaling Guides (Semana 3)**
   - `DISTRIBUTED_QUEUE.md`: migrar de `MemoryJobQueue` a Redis/BullMQ o SQS.
   - `SECURITY.md` + threat model extendido (controls para shell escape, sandbox de workers, rotación de credenciales).

## KPIs
- Tiempo de onboarding < 1 día (desde `npm install` hasta primer render automatizado).
- 0 incidentes por comandos inseguros (toda la construcción documentada y testeada).
- Cada release acompañada de changelog + anuncio interno en < 24h.

## Hit List
| Fecha | Hito | Responsable |
| --- | --- | --- |
| 2025-11-13 | Publicar RUNBOOK + checklists de despliegue | Ingeniería | 
| 2025-11-18 | Lanzar paquete Core Processing Suite con landing compartida | Marketing + Producto |
| 2025-11-24 | Documentar integración con licensing server y auditorías | DX |

> Mantén este archivo vivo: cualquier feedback de clientes sobre colas, monitoreo o pricing debe reflejarse aquí para alinear roadmap, ventas y soporte.
