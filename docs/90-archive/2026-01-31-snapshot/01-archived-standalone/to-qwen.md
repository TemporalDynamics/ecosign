```text
Hola [nombre],

Te paso la tarea para dejar el flujo NDA Flow integrado con Supabase y Netlify Functions. La base ya está (DB inicial y funciones), hace falta adaptar estos cambios para el nuevo camino:

Objetivo: flujo "creo NDA → genero link → receptor firma → server genera accessToken → content accesible" con persistencia en Supabase y constancias PDF.

Tareas prioritarias (ordenadas):

1) Config inicial Supabase
- Crear proyecto con "Data API + Connection String" (OK para MVP).
- Usar "public schema for Data API" (mientras prototipamos).
- Crear buckets Storage: nda-signatures (privado), nda-constancias (privado).

2) Crear tablas (ejecutar supabase_schema.sql adjunto).

3) Netlify env vars (añadir en site settings):
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- MIFIEL_API_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- HMAC_SIGN_SECRET
- NETLIFY_SITE_URL

4) Backend (Netlify Functions)
- log-acceptance.js:
  - aceptar documentHash del cliente;
  - si doc.type = 'template' -> recalcular el hash del HTML canónico en server y comparar;
  - almacenar acceptance en Supabase: signature_url (subir a Storage), ip, ua, documentHash, expiresAt;
  - generar accessToken (UUID v4 + HMAC checksum) y devolver { accessToken, content_url };
  - opcional: generar constancia PDF con generate-pdf.js y guardar URL;
  - enviar email con send-confirmation.js.
- verify-access.js:
  - consultar acceptances por token y validar TTL; devolver metadata.
- sign-url.js:
  - crear shortId con HMAC sign y expiry; guardar pending doc; devolver link.
- generate-pdf.js:
  - crear PDF de constancia (pdf-lib). Subir a Storage y devolver URL.

5) Frontend
- index.html -> cambiar fetch a '/.netlify/functions/log-acceptance'.
- Añadir flujo "generar link" (divulgador).
- Implementar /sign/<shortId> route para firmar.
- content.html: antes de render, llamar verify-access y sólo mostrar si válido.

6) Seguridad
- Usar x-forwarded-for en funciones para IP.
- No exponer SERVICE_ROLE_KEY en frontend.
- En prod: habilitar RLS y policies, mover a dedicated API schema si procede.

7) Testing
- Probar con netlify dev y supabase local/remote.
- Casos: firma válida, firma con mismatch hash, token expirado, download constancia.

Te dejo la SQL en supabase_schema.sql. Si podés, hacé un PR o subilo directo a la org temporal-dynamics-llc y avisame para que pruebe con Netlify dev.

Gracias y cualquier duda me pegás.
```