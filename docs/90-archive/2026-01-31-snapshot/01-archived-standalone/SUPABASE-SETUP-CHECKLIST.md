# ✅ Supabase Setup Checklist - VerifySign

Guía paso a paso para configurar tu proyecto Supabase desde CERO.

**Proyecto**: TemporalDynamics's Project
**Estado actual**: Parcialmente configurado
**Tiempo estimado**: 30-45 minutos

---

## 📋 Checklist General

- [ ] **Paso 1**: Limpiar tablas existentes (opcional)
- [ ] **Paso 2**: Ejecutar migration `001_core_schema.sql`
- [ ] **Paso 3**: Crear 5 buckets de Storage
- [ ] **Paso 4**: Ejecutar migration `002_storage_policies.sql`
- [ ] **Paso 5**: Configurar Auth (SMTP)
- [ ] **Paso 6**: Copiar credenciales al proyecto
- [ ] **Paso 7**: Testing básico
- [ ] **Paso 8**: Deploy a Netlify

---

## 🗄️ PASO 1: Limpiar Tablas Existentes (Opcional)

**IMPORTANTE**: Solo si quieres empezar desde cero. Si ya tienes datos, SKIP este paso.

### Ir a: **Database > SQL Editor**

```sql
-- Eliminar tablas existentes (solo si empiezas de cero)
DROP TABLE IF EXISTS public.acceptances CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.read_logs CASCADE;

-- Verificar que no queden tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Debería retornar vacío (solo auth.users y storage.objects son normales)
```

**Status**: ⬜ Pendiente / ✅ Completado

---

## 🏗️ PASO 2: Ejecutar Migration 001 (Core Schema)

### Archivo: `supabase/migrations/001_core_schema.sql`

### Ir a: **Database > SQL Editor**

**Copy-paste completo del archivo** (333 líneas):

```sql
-- VerifySign Core Schema
-- Version: 1.0.0
-- Description: Tablas principales para documentos, links, NDAs y auditoría

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================
-- TABLA: documents
-- =======================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata básica
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Archivos (.eco y .ecox)
  eco_file_path TEXT NOT NULL,      -- Storage path: eco-files/...
  ecox_file_path TEXT,                -- Storage path: ecox-files/...
  eco_hash VARCHAR(64) NOT NULL,      -- SHA256 del .eco

  -- Anclaje blockchain (OpenTimestamps)
  anchor_tx_hash VARCHAR(100),        -- Bitcoin TX hash
  anchor_block_height INTEGER,        -- Bitcoin block number
  anchored_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT eco_hash_valid CHECK (eco_hash ~ '^[a-f0-9]{64}$')
);

-- =======================
-- TABLA: links
-- =======================
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Token de acceso (SHA256-hashed en DB)
  token_hash VARCHAR(64) NOT NULL UNIQUE,

  -- Destinatario
  recipient_email VARCHAR(320) NOT NULL,
  recipient_id UUID,  -- Nullable: se rellena al crear recipient

  -- Configuración
  require_nda BOOLEAN NOT NULL DEFAULT false,
  require_otp BOOLEAN NOT NULL DEFAULT false,

  -- URLs
  access_url TEXT NOT NULL,  -- https://verifysign.com/access/{token}

  -- Expiración
  expires_at TIMESTAMPTZ,

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT status_valid CHECK (status IN ('active', 'expired', 'revoked', 'consumed')),
  CONSTRAINT token_hash_valid CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT expires_at_future CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- =======================
-- TABLA: recipients
-- =======================
CREATE TABLE IF NOT EXISTS public.recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,

  -- Identificación
  email VARCHAR(320) NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Fingerprint del navegador (opcional)
  browser_fingerprint VARCHAR(64),

  -- Metadata
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- =======================
-- TABLA: nda_acceptances
-- =======================
CREATE TABLE IF NOT EXISTS public.nda_acceptances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Signature
  signature_file_path TEXT,  -- Storage: nda-signatures/{recipient_id}/signature.png

  -- Legal
  full_name VARCHAR(255) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET NOT NULL,
  user_agent TEXT,

  -- NDA terms version
  nda_version VARCHAR(20) NOT NULL DEFAULT '1.0',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =======================
-- TABLA: access_events
-- =======================
CREATE TABLE IF NOT EXISTS public.access_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.recipients(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Tipo de evento
  event_type VARCHAR(20) NOT NULL,

  -- Metadata
  session_id UUID,
  ip_address INET,
  user_agent TEXT,

  -- Detalles del evento (JSON)
  event_data JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT event_type_valid CHECK (event_type IN (
    'view', 'download', 'forward', 'print', 'copy',
    'nda_accept', 'otp_verify', 'link_expired', 'access_denied'
  ))
);

-- =======================
-- TABLA: anchors (OpenTimestamps)
-- =======================
CREATE TABLE IF NOT EXISTS public.anchors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Blockchain info
  chain VARCHAR(20) NOT NULL DEFAULT 'bitcoin',
  tx_hash VARCHAR(100) NOT NULL,
  block_height INTEGER,
  block_hash VARCHAR(100),

  -- Proof file (.ots)
  proof_file_path TEXT,  -- Storage: proofs/{document_id}/proof.ots

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chain_valid CHECK (chain IN ('bitcoin', 'ethereum', 'litecoin')),
  CONSTRAINT status_valid CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- =======================
-- ÍNDICES (Performance)
-- =======================

-- documents
CREATE INDEX idx_documents_owner ON public.documents(owner_id);
CREATE INDEX idx_documents_eco_hash ON public.documents(eco_hash);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- links
CREATE INDEX idx_links_document ON public.links(document_id);
CREATE INDEX idx_links_token_hash ON public.links(token_hash);
CREATE INDEX idx_links_status ON public.links(status);
CREATE INDEX idx_links_expires_at ON public.links(expires_at) WHERE expires_at IS NOT NULL;

-- recipients
CREATE INDEX idx_recipients_link ON public.recipients(link_id);
CREATE INDEX idx_recipients_email ON public.recipients(email);

-- nda_acceptances
CREATE INDEX idx_nda_recipient ON public.nda_acceptances(recipient_id);
CREATE INDEX idx_nda_document ON public.nda_acceptances(document_id);
CREATE INDEX idx_nda_accepted_at ON public.nda_acceptances(accepted_at DESC);

-- access_events
CREATE INDEX idx_events_recipient ON public.access_events(recipient_id);
CREATE INDEX idx_events_document ON public.access_events(document_id);
CREATE INDEX idx_events_type ON public.access_events(event_type);
CREATE INDEX idx_events_created_at ON public.access_events(created_at DESC);

-- anchors
CREATE INDEX idx_anchors_document ON public.anchors(document_id);
CREATE INDEX idx_anchors_status ON public.anchors(status);

-- =======================
-- ROW LEVEL SECURITY (RLS)
-- =======================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nda_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anchors ENABLE ROW LEVEL SECURITY;

-- =======================
-- POLICIES: documents
-- =======================

-- Owners pueden ver sus propios documentos
CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = owner_id);

-- Owners pueden insertar documentos
CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners pueden actualizar sus documentos
CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = owner_id);

-- Service role puede hacer todo
CREATE POLICY "Service role full access documents"
  ON public.documents FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =======================
-- POLICIES: links
-- =======================

-- Owners pueden ver links de sus documentos
CREATE POLICY "Users can view links of own documents"
  ON public.links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = links.document_id
      AND documents.owner_id = auth.uid()
    )
  );

-- Owners pueden crear links
CREATE POLICY "Users can insert links"
  ON public.links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = links.document_id
      AND documents.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access links"
  ON public.links FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =======================
-- POLICIES: recipients
-- =======================

-- Service role only (acceso público vía Functions)
CREATE POLICY "Service role full access recipients"
  ON public.recipients FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =======================
-- POLICIES: nda_acceptances
-- =======================

-- Service role only
CREATE POLICY "Service role full access nda"
  ON public.nda_acceptances FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =======================
-- POLICIES: access_events
-- =======================

-- Owners pueden ver eventos de sus documentos
CREATE POLICY "Users can view events of own documents"
  ON public.access_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = access_events.document_id
      AND documents.owner_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role full access events"
  ON public.access_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =======================
-- POLICIES: anchors
-- =======================

-- Public read (para verificación independiente)
CREATE POLICY "Public can view anchors"
  ON public.anchors FOR SELECT
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access anchors"
  ON public.anchors FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =======================
-- TRIGGERS (Auto-update timestamps)
-- =======================

-- Función para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en documents
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger en links
CREATE TRIGGER links_updated_at
  BEFORE UPDATE ON public.links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =======================
-- COMENTARIOS (Documentación)
-- =======================

COMMENT ON TABLE public.documents IS 'Documentos certificados (.eco/.ecox)';
COMMENT ON TABLE public.links IS 'Enlaces de acceso con NDA opcional';
COMMENT ON TABLE public.recipients IS 'Destinatarios que accedieron a documentos';
COMMENT ON TABLE public.nda_acceptances IS 'Aceptaciones de NDA firmadas';
COMMENT ON TABLE public.access_events IS 'Eventos de auditoría (view, download, etc.)';
COMMENT ON TABLE public.anchors IS 'Anclajes en blockchain (OpenTimestamps)';
```

### Cómo ejecutar:

1. Ir a **Database > SQL Editor**
2. Click **New query**
3. Copiar TODO el SQL de arriba
4. Click **Run** (abajo a la derecha)
5. Verificar que diga "Success. No rows returned"

### Verificar que funcionó:

```sql
-- Verificar tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Deberías ver:
-- documents
-- links
-- recipients
-- nda_acceptances
-- access_events
-- anchors
```

**Status**: ⬜ Pendiente / ✅ Completado

---

## 📦 PASO 3: Crear Buckets de Storage

### Ir a: **Storage > Files** (ya estás ahí en la captura)

**IMPORTANTE**: Eliminar el bucket `nda-signature` actual y crear los 5 correctos.

### 3.1 Eliminar bucket existente

1. Click en `nda-signature`
2. Click en los 3 puntos (⋮)
3. Delete bucket
4. Confirmar

### 3.2 Crear 5 buckets nuevos

Para CADA bucket:

1. Click **New bucket** (botón verde)
2. Llenar datos según tabla
3. Click **Create bucket**

| Bucket Name | Public | Allowed MIME Types | File Size Limit |
|-------------|--------|-------------------|-----------------|
| `eco-files` | ❌ Private | `application/octet-stream` | 50 MB |
| `ecox-files` | ❌ Private | `application/octet-stream` | 10 MB |
| `nda-signatures` | ❌ Private | `image/png, image/jpeg, image/svg+xml` | 2 MB |
| `proofs` | ✅ **Public** | `application/octet-stream` | 1 MB |
| `temp-uploads` | ❌ Private | `*` (Any) | 100 MB |

**IMPORTANTE**:
- Solo `proofs` es **Public** (para verificación independiente)
- Los demás son **Private** (acceso vía signed URLs)

### Verificar buckets creados:

Deberías ver 5 buckets en la lista:
- ✅ eco-files
- ✅ ecox-files
- ✅ nda-signatures
- ✅ proofs
- ✅ temp-uploads

**Status**: ⬜ Pendiente / ✅ Completado

---

## 🔐 PASO 4: Ejecutar Migration 002 (Storage Policies)

### Archivo: `supabase/migrations/002_storage_policies.sql`

### Ir a: **Database > SQL Editor** (nueva query)

**Copy-paste completo** (179 líneas):

```sql
-- VerifySign Storage Policies
-- Version: 1.0.0
-- Description: Políticas de acceso para buckets + lifecycle rules

-- =======================
-- BUCKET: eco-files
-- =======================

-- Policy: Solo service role puede subir
CREATE POLICY "Service role can upload eco files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'eco-files'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Solo owners pueden descargar
CREATE POLICY "Owners can download own eco files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'eco-files'
    AND (
      -- Owner del documento
      EXISTS (
        SELECT 1 FROM public.documents
        WHERE documents.eco_file_path = storage.objects.name
        AND documents.owner_id = auth.uid()
      )
      OR
      -- Service role (para Netlify Functions)
      auth.jwt()->>'role' = 'service_role'
    )
  );

-- Policy: Solo service role puede eliminar
CREATE POLICY "Service role can delete eco files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'eco-files'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- =======================
-- BUCKET: ecox-files
-- =======================

-- Policy: Service role upload
CREATE POLICY "Service role can upload ecox files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ecox-files'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Owners download
CREATE POLICY "Owners can download own ecox files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ecox-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.documents
        WHERE documents.ecox_file_path = storage.objects.name
        AND documents.owner_id = auth.uid()
      )
      OR
      auth.jwt()->>'role' = 'service_role'
    )
  );

-- Policy: Service role delete
CREATE POLICY "Service role can delete ecox files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ecox-files'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- =======================
-- BUCKET: nda-signatures
-- =======================

-- Policy: Service role upload
CREATE POLICY "Service role can upload signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'nda-signatures'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Owners + service role download
CREATE POLICY "Owners can download signatures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'nda-signatures'
    AND (
      -- Owner del documento
      EXISTS (
        SELECT 1 FROM public.nda_acceptances
        JOIN public.documents ON documents.id = nda_acceptances.document_id
        WHERE nda_acceptances.signature_file_path = storage.objects.name
        AND documents.owner_id = auth.uid()
      )
      OR
      auth.jwt()->>'role' = 'service_role'
    )
  );

-- =======================
-- BUCKET: proofs (PUBLIC)
-- =======================

-- Policy: Service role upload
CREATE POLICY "Service role can upload proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proofs'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Public download (verificación independiente)
CREATE POLICY "Public can download proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'proofs');

-- =======================
-- BUCKET: temp-uploads
-- =======================

-- Policy: Usuarios autenticados pueden subir
CREATE POLICY "Authenticated users can upload temp files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'temp-uploads'
    AND auth.role() = 'authenticated'
  );

-- Policy: Solo el uploader puede descargar
CREATE POLICY "Users can download own temp files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'temp-uploads'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      auth.jwt()->>'role' = 'service_role'
    )
  );

-- Policy: Solo el uploader puede eliminar
CREATE POLICY "Users can delete own temp files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'temp-uploads'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      auth.jwt()->>'role' = 'service_role'
    )
  );

-- =======================
-- LIFECYCLE RULES
-- =======================
-- NOTA: Lifecycle rules se configuran en Storage > Settings (UI)
-- No se pueden crear vía SQL

-- Para temp-uploads:
-- - Delete files older than: 24 hours
-- - Path prefix: (empty = all files)
```

### Cómo ejecutar:

1. **Database > SQL Editor > New query**
2. Copiar TODO el SQL de arriba
3. Click **Run**
4. Verificar "Success"

### Configurar Lifecycle Rule (MANUAL - en UI):

**IMPORTANTE**: Esto NO se puede hacer con SQL, hay que hacerlo en la interfaz:

1. Ir a **Storage > Settings** (tab en la parte superior)
2. Scroll down hasta "Lifecycle Rules"
3. Click **Add rule**
4. Config:
   - Bucket: `temp-uploads`
   - Delete files older than: `1` day
   - Path prefix: (dejar vacío)
5. Click **Save**

**Status**: ⬜ Pendiente / ✅ Completado

---

## 🔑 PASO 5: Configurar Auth (SMTP)

### 5.1 Ir a: **Authentication > Providers**

1. Verificar que **Email** esté enabled (ya debería estarlo)
2. Click en **Email** para editar

### 5.2 Configurar SMTP

**Opción A: Resend (Recomendado - Gratis 100 emails/día)**

1. Ir a [resend.com](https://resend.com)
2. Sign up (gratis)
3. Ir a **API Keys**
4. Click **Create API Key**
5. Name: `verifysign-smtp`
6. Permission: `Sending access`
7. Click **Add**
8. **Copiar la API key** (solo se muestra una vez!)

Volver a Supabase:

1. **Authentication > Settings** (sidebar izquierdo)
2. Scroll a "SMTP Settings"
3. Click **Enable Custom SMTP**
4. Llenar:
   ```
   Host: smtp.resend.com
   Port: 587
   User: resend
   Password: [TU API KEY de Resend]
   Sender email: noreply@tudominio.com
   Sender name: VerifySign
   ```
5. Click **Save**

**Opción B: Gmail (Rápido para testing)**

1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Crear App Password
3. Copiar password (16 chars sin espacios)

En Supabase:

```
Host: smtp.gmail.com
Port: 587
User: tucorreo@gmail.com
Password: [App Password de Gmail]
Sender email: tucorreo@gmail.com
Sender name: VerifySign
```

### 5.3 Configurar Email Templates

**Authentication > Email Templates**

**Confirm Signup**:
```html
<h2>Confirma tu email - VerifySign</h2>
<p>Hola,</p>
<p>Gracias por registrarte en VerifySign. Confirma tu email haciendo click en el botón:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#0891b2; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">Confirmar Email</a></p>
<p>O copia este link en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>
<p>Este link expira en 24 horas.</p>
<hr>
<p style="color:#666; font-size:12px;">Si no creaste esta cuenta, ignora este email.</p>
```

**Reset Password**:
```html
<h2>Resetear Contraseña - VerifySign</h2>
<p>Hola,</p>
<p>Recibimos una solicitud para resetear tu contraseña. Click en el botón:</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#0891b2; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; display:inline-block;">Resetear Contraseña</a></p>
<p>O copia este link:</p>
<p>{{ .ConfirmationURL }}</p>
<p>Este link expira en 1 hora.</p>
<hr>
<p style="color:#666; font-size:12px;">Si no solicitaste esto, ignora este email.</p>
```

### 5.4 URL Configuration

**Authentication > URL Configuration**

```
Site URL: http://localhost:5173
(cambiar a https://tudominio.netlify.app cuando deploys)

Redirect URLs (uno por línea):
http://localhost:5173/**
http://localhost:8888/**
https://tudominio.netlify.app/**
```

**Status**: ⬜ Pendiente / ✅ Completado

---

## 📝 PASO 6: Copiar Credenciales al Proyecto

### 6.1 Obtener credenciales

**Ir a: Settings > API** (en Supabase sidebar)

Copiar:
- ✅ Project URL
- ✅ `anon` `public` key
- ✅ `service_role` `secret` key ⚠️

### 6.2 Actualizar `.env` local

Editar: `client/.env`

```bash
# Supabase
VITE_SUPABASE_URL=https://uiyojopjbhooxrmamaiw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (tu anon key completa)

# Backend (Netlify Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (tu service role key)

# HMAC Secret (generar nuevo random de 32+ chars)
HMAC_SIGN_SECRET=tu-secret-super-random-aqui-minimo-32-caracteres
```

**Generar HMAC_SIGN_SECRET** (en terminal):
```bash
openssl rand -base64 32
# Copiar output y pegar en HMAC_SIGN_SECRET
```

### 6.3 Verificar que funciona

```bash
cd client
npm run dev
```

Abrir http://localhost:5173

- [ ] Landing page carga
- [ ] Click "Iniciar Sesión" → LoginPage carga
- [ ] No hay errores de "Missing Supabase URL" en consola

**Status**: ⬜ Pendiente / ✅ Completado

---

## 🧪 PASO 7: Testing Básico

### 7.1 Test de Signup

1. Navegar a http://localhost:5173/login
2. Click "Crear cuenta"
3. Email: `test@tudominio.com`
4. Password: `Test123456`
5. Click "Registrarse"
6. **Verificar**: Mensaje "¡Cuenta creada! Revisa tu email..."
7. **Verificar email**: Debería llegar email de confirmación
8. Click en link del email
9. **Verificar**: Redirige a /dashboard

### 7.2 Test de Login

1. Logout (si estás logueado)
2. Login con `test@tudominio.com` / `Test123456`
3. **Verificar**: Redirige a /dashboard

### 7.3 Test de Database

En Supabase **Database > Table Editor**:

1. Click tabla `auth.users`
2. **Verificar**: Aparece tu usuario test
3. Copiar el `id` (UUID)

```sql
-- Crear documento de prueba
INSERT INTO public.documents (owner_id, title, eco_file_path, eco_hash)
VALUES (
  'TU-USER-UUID-AQUI',
  'Documento de Prueba',
  'test.eco',
  'a'.repeat(64)  -- Hash dummy
);

-- Verificar que se creó
SELECT * FROM public.documents;
```

**Verificar RLS**: Si ves el documento, RLS funciona ✅

**Status**: ⬜ Pendiente / ✅ Completado

---

## 🚀 PASO 8: Deploy a Netlify (Opcional)

### 8.1 Configurar Environment Variables en Netlify

**Site Settings > Environment Variables**

Agregar:
```
VITE_SUPABASE_URL=https://uiyojopjbhooxrmamaiw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://uiyojopjbhooxrmamaiw.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (SECRET!)
HMAC_SIGN_SECRET=tu-secret-aqui
NETLIFY_SITE_URL=https://tudominio.netlify.app
```

### 8.2 Push a GitHub

```bash
git push origin main
```

### 8.3 Netlify Auto-Deploy

Netlify debería auto-deployar cuando detecta el push.

**Verificar**:
1. Netlify Dashboard > Deploys
2. Ver que build sea exitoso
3. Click en URL del deploy
4. Probar login

### 8.4 Actualizar Supabase URLs

**Supabase > Authentication > URL Configuration**

Cambiar Site URL a:
```
https://tudominio.netlify.app
```

**Status**: ⬜ Pendiente / ✅ Completado

---

## ✅ Checklist Final

Marca cuando completes cada paso:

- [ ] Paso 1: Limpiar tablas (si empiezas de cero)
- [ ] Paso 2: Ejecutar `001_core_schema.sql` (6 tablas creadas)
- [ ] Paso 3: Crear 5 buckets de Storage
- [ ] Paso 4: Ejecutar `002_storage_policies.sql` + lifecycle rule
- [ ] Paso 5: Configurar SMTP (Resend o Gmail)
- [ ] Paso 6: Copiar credenciales a `.env`
- [ ] Paso 7: Testing básico (signup, login, insert document)
- [ ] Paso 8: Deploy a Netlify (opcional)

---

## 🆘 Troubleshooting

### Error: "relation does not exist"
**Causa**: No ejecutaste migration SQL
**Solución**: Ejecutar Paso 2

### Error: "No such bucket"
**Causa**: Buckets no creados
**Solución**: Ejecutar Paso 3

### Error: "new row violates RLS policy"
**Causa**: RLS policies no aplicadas
**Solución**: Re-ejecutar Paso 2 (sección de POLICIES)

### Email no llega
**Causa**: SMTP mal configurado
**Solución**:
1. Verificar SMTP settings en Auth > Settings
2. Revisar Auth > Logs para ver errores
3. Probar con Gmail primero (más fácil)

### Build falla en Netlify
**Causa**: Env vars no configuradas
**Solución**: Verificar Paso 8.1

---

## 📞 Siguiente Paso

Una vez completado todo:
- ✅ Supabase configurado 100%
- ✅ Local dev funcionando
- ✅ Testing básico pasando

**Próxima sesión**: Integrar eco-packer en `generate-link.ts` y testing E2E completo.

---

**Tiempo estimado total**: 30-45 minutos
**Última actualización**: 2025-11-09
