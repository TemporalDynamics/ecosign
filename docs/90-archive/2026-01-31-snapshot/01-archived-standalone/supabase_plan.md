# Supabase Integration Plan

## Variables de entorno que debes crear en Netlify (o en tu entorno local durante pruebas)
- SUPABASE_URL
- SUPABASE_ANON_KEY (solo para operaciones públicas cliente; evita exponer operaciones sensibles)
- SUPABASE_SERVICE_ROLE_KEY (USAR SOLO EN SERVERLESS; da permiso total — manténlo secreto)
- SUPABASE_BUCKET_SIGNATURES (nombre del bucket, ej. nda-signatures)
- SUPABASE_BUCKET_CONSTANCIAS (nombre del bucket, ej. nda-constancias)
- MIFIEL_API_KEY (sandbox o prod)
- RESEND_API_KEY (email)
- STRIPE_SECRET_KEY
- HMAC_SIGN_SECRET (para sign-url HMAC)
- NETLIFY_SITE_URL (https://tu-sitio.netlify.app)
- TZ (zona horaria, ej. America/Argentina/Buenos_Aires)

## SQL mínimo para crear las 3 tablas (usa Supabase SQL editor o migration)

```sql
-- supabase_schema.sql
-- Run in Supabase SQL editor (requires pgcrypto extension for gen_random_uuid)

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  owner_email text,
  title text,
  type text, -- 'template' | 'upload'
  version int DEFAULT 1,
  sha256 text,
  storage_url text
);

-- acceptances
CREATE TABLE IF NOT EXISTS acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  doc_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  access_token text UNIQUE,
  party_name text,
  party_email text,
  signature_url text,
  document_hash text,
  ip_address text,
  user_agent text,
  expires_at timestamptz,
  mifiel_document_id text,
  mifiel_certificate_url text,
  nom151_timestamp timestamptz
);

-- read_logs
CREATE TABLE IF NOT EXISTS read_logs (
  id bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  access_token text,
  seconds int
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acceptances_doc_id ON acceptances(doc_id);
CREATE INDEX IF NOT EXISTS idx_acceptances_token ON acceptances(access_token);
```

## Checklist técnico corto (qué pedirle a qwen / dev)
- Crear el proyecto Supabase (Data API + Connection String; public schema OK para MVP).
- Crear las tablas con la SQL anterior.
- Crear buckets Supabase Storage:
  - nda-signatures (privado)
  - nda-constancias (privado)
- Poner env vars en Netlify y en local .env:
  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MIFIEL_API_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY, HMAC_SIGN_SECRET, NETLIFY_SITE_URL.
- Modificar Netlify Functions:
  - log-acceptance.js:
    - recibir documentHash desde cliente, pero cuando doc.type = 'template' recalcular server-side (obtener documento canonical y calcular SHA-256 server-side); si coincide, aceptar; si no, rechazar.
    - guardar acceptance en Supabase (acceptances table), subir signature dataURL a Storage y guardar URL.
    - generar accessToken = uuid + HMAC checksum, set expires_at (ej. now()+7d).
    - opcional: llamar generate-pdf.js para crear constancia y guardar URL.
    - llamar send-confirmation.js (Resend) para notificar a firmante y divulgador.
  - verify-access.js:
    - buscar accessToken en acceptances; validar expires_at; devolver metadata.
  - sign-url.js:
    - genera shortId, HMAC sign con secret y guarda pending record (documents.pending_signs) o en documents + flag.
    - devuelve link: /sign/<shortId>?sig=HMAC&exp=...
  - generate-pdf.js:
    - montar constancia con fields: parties, documentHash, timestamps, ip, ua, signature image, PSC data (cuando exista).
    - subir a Storage y devolver URL pre-firmada.

## Cambios frontend:
- index.html: fetch('/.netlify/functions/log-acceptance', ...)
- form de generación de link para divulgador que llama sign-url.
- /sign/:shortId route: validar sig param client-side only for UX, but server must verify on submit.
- content.html: antes de mostrar llamar /.netlify/functions/verify-access?token=... y solo mostrar si valid true.

## Testing:
- probar flujo completo local con Netlify dev or netlify dev.
- guardar logs de pruebas (acceptances, read_logs).

## RLS & Security (MVP -> Prod):
- Habilitar RLS cuando pases a production.
- Crear policies para que only service role keys can INSERT acceptances, and anonymous role can SELECT minimal public fields if needed.
- Make storage buckets private; use presigned URLs for downloads.

## Notas finales (decisión sobre public schema vs dedicated API)
- Para MVP: usa public schema (rápido).
- Para producción: cambia a dedicated API schema + RLS (seguridad) y obliga a que todas las acciones sensibles pasen por Netlify Functions con la Service Role key.
- Considera un proceso corto para "hardening" antes de arrancar ventas (RLS + audits + daily backups).