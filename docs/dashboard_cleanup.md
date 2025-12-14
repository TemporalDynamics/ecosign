Dashboard Cleanup — Diario (DEV 3)
==================================

Contexto
--------
- Objetivo: esconder “Dashboard” como narrativa sin borrar features. Mantener rutas vivas pero con entry point en Inicio.
- Flag: `DASHBOARD_ENABLED = false` para bloquear `/dashboard` raíz y redirigir a `/inicio`.

Inventario de rutas `/dashboard/*` (App/DashboardApp)
-----------------------------------------------------
- `/dashboard` → DashboardPage (redirige a `/inicio` si el flag está en false).
- `/dashboard/start` → DashboardStartPage (workspace / Inicio legacy).
- `/dashboard/documents` → DocumentsPage (core actual).
- `/dashboard/verify` → DashboardVerifyPage.
- `/dashboard/pricing` → DashboardPricingPage.
- `/dashboard/workflows` → WorkflowsPage.
- `/dashboard/workflows/:id` → WorkflowDetailPage.
- `/dashboard/status` → ServiceStatusPage.
- `/dashboard/videos` → VideoLibraryPage.
- `/dashboard/help-center` → HelpCenterPage.
- `/dashboard/contact` → ContactPage.
- `/dashboard/report-issue` → ReportIssueInternalPage.
- `/dashboard/documentation` → DocumentationInternalPage y también duplicada a DocumentationPage (duplicado a limpiar).
- `/dashboard/quick-guide` → QuickGuideInternalPage y también duplicada a QuickGuidePage (duplicado a limpiar).
- `/dashboard/use-cases` → UseCasesInternalPage y también duplicada a UseCasesPage (duplicado a limpiar).
- `/dashboard/roadmap` → RoadmapPage.
- `/dashboard/updates` → UpdatesPage.
- `/dashboard/terms` → TermsPage.
- `/dashboard/privacy` → PrivacyPage.
- `/dashboard/security` → SecurityPage.

UI / Entry points actuales
--------------------------
- Header interno: Inicio (`/inicio`), Documentos, Verificador, Planes, Centro Legal, Cerrar sesión. (El ítem “Dashboard” ya no existe).
- Footer interno: sigue enlazando varias rutas `/dashboard/*` (status, roadmap, updates, docs, etc.) → revisar en etapa de borrado progresivo.
- Login/redirect: ahora navega a `/inicio` después de login.
- Modal final (LegalCenter): apunta a `/dashboard/documents` (mantener hasta alias de rutas).

Estado actual (Día 2)
---------------------
- Kill switch aplicado al root `/dashboard` (redirige a `/inicio`).
- Header sin “Dashboard”; “Inicio” apunta a `/inicio`.
- No se borró ninguna página ni ruta; duplicados identificados para limpieza futura.

Próximos pasos propuestos
-------------------------
1) Bloquear enlaces residuales del footer a rutas que se vayan a retirar (cuando definamos qué queda).
2) Resolver duplicados de rutas internas (documentation/quick-guide/use-cases) antes de borrar.
3) Apoyarse en knip u otro reporte de huérfanos para borrar pages/components no alcanzables.
4) Alias futuro: preparar `/documentos`, `/verificador`, etc., cuando se defina el nuevo mapa.
