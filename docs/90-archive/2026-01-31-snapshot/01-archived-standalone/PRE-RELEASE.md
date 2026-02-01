# Pre-Release Status (Developer Preview)

Este repositorio está en modo **Developer Preview**. Objetivo: exponer el MVP a críticas públicas antes del hardening legal/comercial.

## Estado actual
- [x] Verificador visual (`/verify`) funcionando con mocks locales.
- [x] Generación de `.eco` en entorno controlado vía `EcoGenerationService`.
- [x] Pruebas mínimas en `eco-packer` (Vitest smoke test).
- [x] CI en GitHub Actions (build + tests con `VITEST_POOL=threads`).
- [ ] Endpoint público `/verify` respaldado por backend real.
- [ ] Anclaje blockchain operativo (OpenTimestamps/Polygon en desarrollo).
- [ ] Integraciones legales (Mifiel/SignNow) en staging.

## Qué esperamos de la comunidad
- Revisar `docs/dev-preview/index.md` y el protocolo `.ECO`.
- Reportar bugs mediante issues etiquetados `dev-preview` o `security`.
- Enviar PRs ligeras enfocadas en: Supabase wiring, CLI de verificación, validación de NDA links.

## Roadmap inmediato (≤30 días)
1. Conectar Supabase Auth real y persistencia de `.eco` en Storage.
2. Desplegar anclaje Bitcoin (OpenTimestamps) en un worker separado.
3. Publicar el programa de bug bounty (README) con recompensas formales.

> Este documento se actualizará en cada checkpoint público para mantener transparencia con early adopters y contribuidores.
