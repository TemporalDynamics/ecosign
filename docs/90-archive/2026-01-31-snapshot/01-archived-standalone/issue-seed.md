# Backlog Semilla — Developer Preview

## Good First Issues

1. **Hookear Supabase Auth en el dashboard**  
   - Archivo base: `client/src/pages/LoginPage.jsx` y `client/src/lib/supabaseClient.ts`.  
   - Tarea: reemplazar el login simulado por la llamada real a Supabase (`signInWithPassword`) y propagar la sesión al `DashboardPage`.  
   - Criterio de aceptación: tras iniciar sesión el usuario ve su email en el header y, si falla, se muestra mensaje accesible.

2. **Migrar Vite 4 → 5**  
   - Archivos: `client/package.json`, `client/vite.config.js`.  
   - Tarea: actualizar dependencias (`vite`, `@vitejs/plugin-react`) y ajustar el config (por ejemplo `server.host`).  
   - Criterio: `npm run build` sigue funcionando localmente y en CI.

3. **Implementar stub del módulo NDA links**  
   - Archivos: `server/types/contracts.ts`, `api/sign-url.js`.  
   - Tarea: crear un servicio que implemente la interfaz `NdaLinkService`, usando Supabase `documents` como storage.  
   - Criterio: incluir pruebas unitarias que cubran expiración y validación de firmas HMAC.

4. **CLI de verificación `.ECO`**  
   - Ubicación sugerida: `scripts/eco-verify.ts`.  
   - Tarea: leer un archivo `.eco`, extraer `manifest.json` y reportar en consola si los hashes y la firma son válidos.  
   - Criterio: comando `npm run eco:verify sample.eco` imprime "OK" o lista de errores.

5. **Docs: agregar tabla de mapeo de endpoints**  
   - Archivo: `docs/dev-preview/index.md`.  
   - Tarea: documentar cada endpoint Netlify (`sign-url`, `verify-access`, `log-acceptance`, etc.) con método, auth y estado actual.  
   - Criterio: tabla incluida con al menos 5 endpoints y status (mock/en desarrollo).

## Security Bounty Challenges

1. **Intento de bypass en `api/sign-url`**  
   - Meta: demostrar si es posible reutilizar un `shortId` vencido generando un HMAC distinto o manipular `expirySeconds`.  
   - Recompensa: documentar payload, timestamp y respuesta del servidor; proponer mitigación (ej. almacenar `exp` server-side o firmar con clave rotativa).

2. **Corrupción controlada de `.ECO`**  
   - Meta: modificar `manifest.json` dentro de un `.eco` sin invalidar la firma Ed25519.  
   - Recompensa: si puedes mostrar PoC, obtienes acceso al council de seguridad.  
   - Reglas: sólo usar archivos propios y reportar con pasos reproducibles; no subir llaves privadas ni datos de terceros.
