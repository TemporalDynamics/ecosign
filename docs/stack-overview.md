# Stack Real de VerifySign (Nov-2025)

## Frontend Web (`/client`)
- **Framework**: React 18.3 (funcional, componentes en JavaScript moderno sin TypeScript).
- **Router**: React Router DOM 6.30 para el flujo `/`, `/verify`, `/dashboard`, `/pricing`, `/login`, `/nda`.
- **Bundler/Dev Server**: Vite 4.5 (pendiente migración a 5.x para Node 18+ y mejor HMR).
- **Estilos**: Tailwind CSS 3.4 con PostCSS + Autoprefixer; el layout sigue un diseño dark responsive descrito en `MVP-README.md`.
- **Estado**: Hooks locales + props; no hay Redux/Zustand.
- **Build/Preview scripts**: `npm run dev`, `npm run build`, `npm run preview` definidos en `client/package.json`.

## Generación de Evidencia (.ECO)
- **Librería interna**: `eco-packer/` (TypeScript, empaqueta evidencia en `.ECO`). Usa `jsonschema`, `jszip` y depende de `@vista/timeline-engine` (referencia local).
- **Testing**: Vitest configurado en `eco-packer/vitest.config.ts` (aún sin tests escritos para el app principal).
- **Objetivo**: proveer un servicio Node/TS reutilizable para que el frontend llame vía API/worker durante la Fase 1.

## Backend & Infraestructura
- **Backend-as-a-Service**: Supabase
  - **Base de datos**: PostgreSQL con tablas `cases`, `signatures`, etc. (`supabase_schema.sql`).
  - **Auth**: Supabase Auth (Email/Password + policies).
  - **Storage**: Supabase Storage planeado para guardar `.eco`.
- **Serverless/Hosting**: Netlify (ver `netlify.toml`, scripts `netlify dev` en la raíz).
- **Scheduled jobs / Functions**: Netlify Functions previstas para `mint-eco` y `anchor` (documentadas en `VERIFYSIGN_ARCHITECTURE.md`).

## Integraciones Planeadas
- **Blockchain**: OpenTimestamps (Bitcoin) + Polygon para anclaje, aún no conectado en código.
- **Firmas legales**: Mifiel (FEA México) y SignNow API (global) listadas en `README.md` roadmap.
- **Supabase**: esquema y políticas ya definidos, falta wiring desde frontend.

## Tooling de Apoyo
- **CLI & Dev Services**: `netlify-cli`, `@supabase/supabase-js` (root `package.json`).
- **Seguridad/Gobernanza**: `SECURITY.md`, `SECURITY_AUDIT.md`, `CONTRIBUTING.md` establecen proceso de bug bounty y revisión.
- **Docs**: `VERIFYSIGN_ARCHITECTURE.md`, `MVP-README.md`, `SUMMARY.md`, etc.

## Riesgos / Pendientes Detectados
1. **Vite 4.x**: requiere migrar a 5.x para alinearse con Node LTS y Vitest moderno.
2. **@supabase/supabase-js no instalado** en la raíz; se debe decidir si se usa desde frontend (via environment) o desde funciones serverless.
3. **eco-packer** depende de `@vista/timeline-engine`, carpeta no presente en repo → bloquearía build desde cero.
4. **Ausencia de tests** en `client/` impide CI confiable hasta que se añadan pruebas (ver Fase 1 tareas 5-6).

Esta ficha puede copiarse al Developer Preview Pack para explicar a nuevos contribuidores cómo está compuesto el sistema hoy.
