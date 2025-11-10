# Registro de mantenimiento

## 2025-02-14 – Codex (OpenAI)

### Contexto previo
- El paquete estaba publicado como `@vista/eco-packer` y dependía directamente de `@vista/timeline-engine` para tipos y build.
- Los ejemplos/README describían una API antigua basada en `assetResolver`, distinta al `pack(project, assetHashes)` real.
- `tsconfig` y `vitest` arrastraban referencias cruzadas a otras librerías del monorepo, dificultando reutilizarlo en proyectos externos.

### Cambios entregados
1. **API y tipos autónomos**: se definieron `EcoAsset`, `EcoSegment` y `EcoProject` internos (`src/types.ts`) y se eliminaron las dependencias directas del timeline engine.
2. **Empaquetado universal**: el paquete ahora se llama `@vistapulse/eco-packer`, expone `exports`/tipos desde `dist/` y su `tsconfig` no referencia otras librerías.
3. **Documentación actualizada**: nuevo README con instrucciones de instalación (local/externa), ejemplos reales de `pack`/`unpack` y recomendaciones de uso.
4. **Pruebas y ejemplos**: los tests y `examples/basic-usage.ts` ya no requieren utilidades externas; validan la firma Ed25519 utilizando solo los tipos propios.

Resultado: la librería puede instalarse en cualquier repo (ej. `/home/manu/verifysign`) con `npm install --save ../NEO/librerias/eco-packer` y mantiene el mismo contrato dentro del monorepo.

## 2025-02-15 – Rebranding Temporal Dynamics

### Cambios
1. **Rebranding completo**: el paquete se publica como `@temporaldynamics/eco-packer`, se eliminan referencias a Vista/Vistapulse y la autoría pasa a Temporal Dynamics LLC.
2. **Licencia dual**: nueva `LICENSE` MIT (Community Edition) + `LICENSE-COMMERCIAL.md` para uso comercial.
3. **Documentación enterprise**: se agregaron `README-ENTERPRISE.md` y `docs/SECURITY_OVERVIEW.md` con roadmap, pricing sugerido y modelo de amenazas.
4. **Metadata**: `package.json` actualiza keywords, scope y licencia (`SEE LICENSE IN LICENSE`).

Resultado: el paquete está listo para licenciarlo sin exponer IP de Vista NEO y con materiales listos para clientes enterprise.
