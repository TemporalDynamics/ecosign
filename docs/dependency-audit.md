# VerifySign Dependency Audit (Fase 0 Quick Win)

_Fecha:_ 2025-11-08

## Metodología
- `npm ls --depth=0` ejecutado en `/client` y en la raíz del monorepo.
- Debido al modo sin red, no fue posible consultar `npm outdated`/`npm audit`. Las recomendaciones de actualización se basan en el historial público de lanzamientos hasta oct-2024.

## Resumen Ejecutivo
- **Frontend (client/)**: React 18.3.1 y Tailwind 3.4.18 ya están en su última rama estable. El único paquete claramente desfasado es **Vite 4.5.x**; la rama 5.x trae mejoras de performance y requiere Node 18+.
- **Raíz (Netlify + Supabase tooling)**: el lockfile declara `@supabase/supabase-js@^2.45.4` y `netlify-cli@^23.9.5`, pero `npm ls` los marca como `UNMET DEPENDENCY`. Además existen múltiples paquetes `extraneous` en `node_modules/` que deberían limpiarse.
- **Vulnerabilidades**: sin acceso al registro npm no se puede confirmar CVEs recientes. Se dejó listo el comando a re-ejecutar (`npm audit --production`).

## Detalle por paquete (client/)

| Paquete | Declarado | Instalado (`npm ls`) | Último release conocido* | Estado | Acción sugerida |
| --- | --- | --- | --- | --- | --- |
| react | ^18.2.0 | 18.3.1 | 18.3.1 (abr-2024) | ✅ al día | Ninguna. Mantener lock. |
| react-dom | ^18.2.0 | 18.3.1 | 18.3.1 | ✅ al día | Ninguna. |
| react-router-dom | ^6.18.0 | 6.30.1 | 6.30.x (ago-2024) | ✅ al día | Revisar changelog 6.30 antes de release. |
| tailwindcss | ^3.4.18 | 3.4.18 | 3.4.18 (sep-2024) | ✅ al día | Ninguna. |
| vite | ^4.5.0 | 4.5.14 | 5.4.x (jun-2024) | ⚠️ desfasado | Planificar migración a Vite 5 (Node 18+, vitest-compatible). |
| @vitejs/plugin-react | ^4.1.0 | 4.7.0 | 4.7.0 | ✅ al día | Ninguna. |
| autoprefixer | ^10.4.21 | 10.4.21 | 10.4.21 | ✅ | Ninguna. |
| postcss | ^8.5.6 | 8.5.6 | 8.5.6 | ✅ | Ninguna. |
| @types/react | ^18.2.37 | 18.3.26 | 18.3.26 | ✅ | Ninguna. |
| @types/react-dom | ^18.2.15 | 18.3.7 | 18.3.7 | ✅ | Ninguna. |

_*Último release conocido según changelogs públicos hasta octubre 2024._

## Detalle raíz (`package.json`)

| Paquete | Declarado | Instalado | Estado | Acción |
| --- | --- | --- | --- | --- |
| @supabase/supabase-js | ^2.45.4 | _no instalado_ | ❌ faltante | Ejecutar `npm install` en raíz o mover esta dependencia al módulo donde se use realmente. |
| netlify-cli | ^23.9.5 | _no instalado_ | ❌ faltante | Instalar localmente o convertir en devDependency dentro de `/client` si solo se usa allí. |
| Dependencias extraneous | n/a | ver lista en `npm ls` | ⚠️ limpieza pendiente | Ejecutar `rm -rf node_modules && npm install` en raíz para alinear con `package-lock.json`. |

## Pasos siguientes propuestos
1. Cuando haya red disponible: `cd client && npm outdated && npm audit --production` para confirmar CVEs.
2. Abrir issue «Upgrade build tooling to Vite 5.x» (incluye checklist de breaking changes).
3. Decidir si el root `package.json` se seguirá usando; de lo contrario mover scripts/deps a `/client` para evitar `UNMET DEPENDENCY`.
