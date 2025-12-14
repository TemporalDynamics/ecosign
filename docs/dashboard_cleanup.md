Dashboard Cleanup — Diario (DEV 3)
==================================

Contexto
--------
- Objetivo: esconder “Dashboard” como narrativa sin borrar features. Mantener rutas vivas pero con entry point en Inicio.
- Flag: `DASHBOARD_ENABLED = false` para bloquear `/dashboard` raíz y redirigir a `/inicio`.

Inventario de rutas `/dashboard/*` (router actual)
--------------------------------------------------
- `/dashboard` → redirige a `/inicio` (flag OFF).
- `/dashboard/start` → redirige a `/inicio`.
- `/dashboard/documents` → redirige a `/documentos`.
- `/dashboard/verify` → redirige a `/verificador`.
- `/dashboard/pricing` → redirige a `/planes`.
- `/dashboard/workflows` → WorkflowsPage.
- `/dashboard/workflows/:id` → WorkflowDetailPage.
- `/dashboard/roadmap` → RoadmapPage (se mantiene).
- `/dashboard/updates` → UpdatesPage (se mantiene).
- Rutas duplicadas removidas del router: status, videos, help-center, contact, report-issue, documentation, quick-guide, use-cases, terms, privacy, security.

UI / Entry points actuales
--------------------------
- Header interno: Inicio (`/inicio`), Documentos (`/documentos`), Verificador (`/verificador`), Planes (`/planes`), Centro Legal, Cerrar sesión. “Dashboard” eliminado.
- Footer interno: apunta a rutas públicas (status, security, privacy, terms, docs, quick-guide, videos, use-cases, help, contact, report-issue).
- Login/redirect y signup: redirigen a `/inicio`.
- Modal final (LegalCenter): animación busca `/documentos` y fallback a `/dashboard/documents`.

Estado actual (Día 2-3)
-----------------------
- Kill switch aplicado al root `/dashboard` (redirige a `/inicio`).
- Alias nuevos: `/inicio`, `/documentos`, `/verificador`, `/planes`.
- Redirecciones desde `/dashboard/start|documents|verify|pricing` hacia los alias.
- Rutas duplicadas removidas del router: status, videos, help-center, contact, report-issue, documentation, quick-guide, use-cases, terms, privacy, security. Páginas siguen en repo (pendientes de borrar cuando se confirme).
- Roadmap y Updates se mantienen por ahora.

Próximos pasos propuestos
-------------------------
1) Borrar páginas internas sin ruta (status, videos, help-center, contact, report-issue, documentation*, quick-guide*, use-cases*, terms/privacy/security) cuando validemos que no hay tráfico.
2) Ajustar enlaces residuales hardcodeados a `/dashboard/...` si aparecen (CTA sueltos).
3) Alias futuros para workflows si se desea (ej. `/flujos`), luego consolidar y eliminar rutas legacy.
4) Apoyarse en knip/huérfanos para borrar componentes/páginas no usadas y limpiar imports.
