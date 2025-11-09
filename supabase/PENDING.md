# Supabase - Configuración Pendiente

## ✅ Completado

- [x] Proyecto creado
- [x] Variables de entorno configuradas (URL, ANON_KEY, SERVICE_ROLE_KEY)
- [x] Schema básico: `cases`, `signatures`
- [x] RLS habilitado en tablas básicas

---

## ⏳ Pendiente de Configuración

### 1. **Auth - Login de Usuarios**

**Estado**: Configuración básica lista, falta integración en frontend

**Pendiente**:
- [ ] Configurar Email Provider (SMTP)
  - Provider sugerido: Resend o SendGrid
  - Variables: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

- [ ] Personalizar Email Templates
  - Template de confirmación de registro
  - Template de recuperación de contraseña
  - Agregar logo y branding de VerifySign

- [ ] Configurar Email Auth
  ```sql
  -- En Supabase Dashboard > Authentication > Providers
  -- Habilitar: Email (password)
  -- Opcional: Magic Link
  ```

- [ ] Integrar en Frontend (`client/src/`)
  - Crear `src/lib/supabaseClient.ts`:
    ```typescript
    import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    ```

  - Actualizar `LoginPage.jsx` con lógica real:
    ```typescript
    import { supabase } from '../lib/supabaseClient';

    const handleLogin = async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
      } else {
        navigate('/dashboard');
      }
    };
    ```

---

### 2. **Storage - Políticas (Buckets y RLS)**

**Estado**: Buckets NO creados aún

**Acción Requerida**:

#### A. Crear Buckets en Supabase Dashboard

Ir a: `Storage > New Bucket`

| Bucket Name | Public | Descripción |
|-------------|--------|-------------|
| `eco-files` | ❌ No | Archivos .ECO generados |
| `ecox-files` | ❌ No | Archivos .ECOX (con historial completo) |
| `nda-signatures` | ❌ No | Firmas de NDA (.eco con hash de aceptación) |
| `proofs` | ❌ No | Pruebas de blockchain (OTS files) |
| `temp-uploads` | ❌ No | Uploads temporales (auto-delete 24h) |

#### B. Configurar Policies por Bucket

**Bucket: `eco-files`**

```sql
-- Policy 1: Owner puede INSERT (subir .ECO generado)
CREATE POLICY "Owners can upload their ECO files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'eco-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Owner puede SELECT (listar/leer sus archivos)
CREATE POLICY "Owners can read their ECO files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'eco-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Receptores con link válido pueden SELECT (vía función)
CREATE POLICY "Recipients with valid link can read ECO"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'eco-files' AND
  EXISTS (
    SELECT 1 FROM recipients r
    JOIN links l ON l.document_id = r.document_id
    WHERE r.email = auth.jwt() ->> 'email'
      AND l.revoked_at IS NULL
      AND (l.expires_at IS NULL OR l.expires_at > now())
  )
);
```

**Repetir patrones similares para**:
- `ecox-files`
- `nda-signatures`
- `proofs`

**Bucket: `temp-uploads`**

```sql
-- Permitir uploads temporales (luego procesarlos y borrar)
CREATE POLICY "Authenticated users can upload temp files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temp-uploads');

CREATE POLICY "Authenticated users can read their temp files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Auto-delete después de 24h (configurar en Dashboard > Storage > Lifecycle)
```

#### C. Estructura de Carpetas

Organizar archivos por `user_id/document_id/`:

```
eco-files/
  {user_uuid}/
    {document_uuid}/
      certificate.eco

ecox-files/
  {user_uuid}/
    {document_uuid}/
      full-history.ecox

nda-signatures/
  {user_uuid}/
    {document_uuid}/
      {recipient_uuid}.eco
```

---

### 3. **Integración en Netlify Functions**

**Archivo**: `netlify/functions/utils/storage.ts`

```typescript
import { getSupabaseClient } from './supabase';

export const uploadEcoFile = async (
  userId: string,
  documentId: string,
  fileBuffer: Buffer,
  filename: string
) => {
  const supabase = getSupabaseClient();

  const path = `${userId}/${documentId}/${filename}`;

  const { data, error } = await supabase.storage
    .from('eco-files')
    .upload(path, fileBuffer, {
      contentType: 'application/octet-stream',
      upsert: false
    });

  if (error) throw error;

  return data.path;
};

export const getSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = 300 // 5 minutos
) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;

  return data.signedUrl;
};
```

---

## 📋 Checklist de Implementación

### Auth
- [ ] Configurar SMTP provider (Resend)
- [ ] Personalizar templates de email
- [ ] Crear `supabaseClient.ts` en frontend
- [ ] Actualizar `LoginPage.jsx` con auth real
- [ ] Actualizar `DashboardPage.jsx` para verificar sesión
- [ ] Implementar logout funcional
- [ ] Agregar protected routes en React Router

### Storage
- [ ] Crear 5 buckets en Supabase Dashboard
- [ ] Aplicar policies SQL (copiar de arriba)
- [ ] Crear `storage.ts` utility en Netlify Functions
- [ ] Test de upload desde función
- [ ] Test de signed URL generation
- [ ] Configurar auto-delete en `temp-uploads` (24h)

---

## 🧪 Testing

### Auth Testing
```bash
# En Supabase SQL Editor
SELECT * FROM auth.users;

# Crear usuario de prueba
INSERT INTO auth.users (email, encrypted_password)
VALUES ('test@verifysign.com', crypt('TestPass123!', gen_salt('bf')));
```

### Storage Testing
```typescript
// En Netlify Function de prueba
const testUpload = async () => {
  const buffer = Buffer.from('test content');
  const path = await uploadEcoFile(
    'user-uuid-here',
    'doc-uuid-here',
    buffer,
    'test.eco'
  );
  console.log('Uploaded to:', path);

  const url = await getSignedUrl('eco-files', path, 60);
  console.log('Signed URL:', url);
};
```

---

**Última actualización**: 2025-11-09
**Responsable**: Configuración en Supabase Dashboard + integración en código
