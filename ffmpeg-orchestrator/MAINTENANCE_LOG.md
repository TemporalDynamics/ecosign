# Registro de mantenimiento — `@temporaldynamics/ffmpeg-orchestrator`

## 2025-11-10 – Comercialización inicial (Codex)

### Estado previo
- Publicado como `@vista/ffmpeg-orchestrator` con licencia MIT abierta y dependencias `file:` hacia timeline-engine.
- Documentación mínima (solo README básico) y sin trazabilidad de cambios.
- Sin materiales de pricing/licensing ni guía de seguridad.

### Cambios realizados
1. Rebranding a Temporal Dynamics: actualización del scope npm, autor y metadatos de publicación.
2. Paquete documental completo: `LICENSE-COMMERCIAL.md`, `PRICING.md`, `CHANGELOG.md`, `DOCUMENTATION-ROADMAP.md`, `API.md`, `EXAMPLES.md`, `SECURITY.md`.
3. Preparación técnica: tsconfig/vitest apuntan al nuevo paquete `@temporaldynamics/timeline-engine` y README actualizado.
4. Verificación: suite de Vitest lista para ejecutarse tras instalar dependencias (`npm install && npm run test`).

### Próximos pasos sugeridos
- Publicar `RUNBOOK.md` + `OBSERVABILITY_GUIDE.md` mencionados en el roadmap.
- Sustituir el repositorio en memoria por adapters oficiales (Redis, Postgres) y documentar migraciones.
- Sustituir la dependencia local (`file:../timeline-engine`) por la versión publicada `^1.1.0` en cuanto esté disponible en el registro comercial.
- Publicar la versión 1.1.0 en el registro privado una vez que timeline-engine esté disponible públicamente.
