# Changelog — `@temporaldynamics/ffmpeg-orchestrator`

Este proyecto sigue [Semantic Versioning](https://semver.org/) y el formato "Keep a Changelog".

## [1.1.0] - 2025-11-10 — Commercial Readiness
### Added
- Licencia comercial (`LICENSE-COMMERCIAL.md`), pricing oficial y documentación de seguridad/API/roadmap.
- Ejemplos de uso completos (colas, retries, integración con eco-packer / timeline-engine).
- Registro de mantenimiento para auditar releases futuros.

### Changed
- Rebranding completo a `@temporaldynamics/ffmpeg-orchestrator` y dependencia declarada de `@temporaldynamics/timeline-engine`.
- Scripts y configuraciones (tsconfig/vitest) ahora referencian el nuevo scope y Node 18+ como base.

### Fixed
- Documentamos y validamos el flujo de normalización de timelines para evitar manifiestos mutantes sin trazabilidad.

## [1.0.0] - 2024-08-15 — Internal VISTA NEO Drop
- Primera liberación interna bajo `@vista/ffmpeg-orchestrator`.
- Incluyó cola en memoria, repositorio simple, builder de comandos y processor con parsing de progreso.
