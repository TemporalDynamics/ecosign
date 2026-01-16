# Security & Compliance — `@temporaldynamics/ffmpeg-orchestrator`

## Superficie de ataque
- **Entrada**: metadatos de jobs, argumentos FFmpeg, manifiestos de proyectos.
- **Procesos**: se lanza `ffmpeg` vía `child_process.spawn` sin shell, minimizando inyecciones.
- **Persistencia**: repositorio en memoria por defecto (puede reemplazarse por Redis/SQL). No almacena video binario; sólo estados de job.

## Controles incorporados
1. **Normalización de timeline**: los proyectos recibidos se validan con `@temporaldynamics/timeline-engine` antes de ejecutarse.
2. **CommandBuilder**: siempre genera arrays de argumentos; nunca construye strings concatenadas.
3. **Monitoreo de progreso**: regex controlado (`time=HH:MM:SS`) evita parsear salida arbitraria.
4. **Retries con límites**: `maxRetries` evita bucles infinitos ante fallos.
5. **Eventos auditables**: `job_queued`, `job_completed`, `job_failed` permiten integrarse con SIEMs o colas de monitoreo.

## Recomendaciones para clientes
- Ejecutar workers en entornos aislados (containers mínimo privilegio).
- Limitar permisos del binario FFmpeg y aplicar listas blancas de codecs/filters.
- Registrar cada job en su sistema de auditoría incluyendo args/commandOptions.
- Rotar rutas de salida y limpiar archivos temporales tras completar jobs.
- Si reemplazas el repositorio en memoria, cifra en reposo y aplica backups consistentes.

## Vulnerability Management
- Reportes a security@temporaldynamics.com (PGP disponible).
- Ventana estándar de parcheo: 14 días entre fix privado y disclosure público.
- Tests de seguridad incluidas en CI: linting de argumentos, ejecución simulada sin FFmpeg real.

## Compliance-ready workflow
1. `npm run test` (Vitest) + `npm run build` en Node 18/20.
2. Code review obligatoria para cambios en `processor` o `command-builder`.
3. Releases firmadas (`git tag -s`, `npm publish --provenance`).
4. Documentación actualizada (`CHANGELOG.md`, `MAINTENANCE_LOG.md`).

> ¿Necesitas threat model extendido, plantillas de auditoría o soporte para entornos air-gapped? Escríbenos a licensing@temporaldynamics.com.
