# Supabase - Guía de Configuración Completa

Esta guía te lleva paso a paso para configurar Supabase alineado con las Netlify Functions.

---

## 📋 Checklist de Configuración

### ✅ Paso 1: Crear Proyecto en Supabase

1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click en "New Project"
3. Configurar:
   - **Name**: verifysign-production (o verifysign-dev)
   - **Database Password**: Guardar en 1Password/Bitwarden
   - **Region**: Elegir más cercana (ej: us-east-1)
4. Esperar ~2 minutos a que se cree

---

### ✅ Paso 2: Copiar Credenciales

En el dashboard del proyecto, ir a **Settings > API**:

```bash
# Copiar estos valores a .env
SUPABASE_URL=https://xxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # Key pública (frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Key privada (backend ONLY)
```

**⚠️ IMPORTANTE**:
- `ANON_KEY` → Solo frontend (public)
- `SERVICE_ROLE_KEY` → Solo backend/Netlify Functions (NEVER expose)

Agregar a:
- `.env.example` (sin valores reales)
- `.env` local (valores reales, NUNCA commitear)
- Netlify Dashboard > Site Settings > Environment Variables

---

### ✅ Paso 3: Ejecutar Migraciones SQL

#### 3.1 Core Schema

1. Ir a **SQL Editor** en Supabase Dashboard
2. Crear nueva query
3. Copiar contenido de `supabase/migrations/001_core_schema.sql`
4. Click **Run**
5. Verificar que aparecen 6 tablas en **Database > Tables**:
   - ✅ documents
   - ✅ links
   - ✅ recipients
   - ✅ nda_acceptances
   - ✅ access_events
   - ✅ anchors

#### 3.2 Storage Policies

**PRIMERO crear los buckets** (ver Paso 4), luego:

1. En **SQL Editor**, crear nueva query
2. Copiar contenido de `supabase/migrations/002_storage_policies.sql`
3. Click **Run**
4. Verificar policies en **Storage > Policies**

---

### ✅ Paso 4: Crear Storage Buckets

Ir a **Storage** en Dashboard y crear 5 buckets:

| Bucket Name | Public | Description |
|-------------|--------|-------------|
| `eco-files` | ❌ No | Archivos .ECO generados |
| `ecox-files` | ❌ No | Archivos .ECOX (historial completo) |
| `nda-signatures` | ❌ No | Firmas de NDA |
| `proofs` | ✅ Yes | Pruebas de blockchain (verificación pública) |
| `temp-uploads` | ❌ No | Uploads temporales |

**Para cada bucket**:
1. Click **New Bucket**
2. Name: (ver tabla arriba)
3. Public: (ver tabla arriba)
4. Click **Create Bucket**

#### 4.1 Configurar Lifecycle (temp-uploads)

1. Click en bucket `temp-uploads`
2. **Lifecycle** tab
3. Click **Add rule**
4. Config:
   ```json
   {
     "action": "delete",
     "condition": { "age": 86400 }
   }
   ```
5. Save

---

### ✅ Paso 5: Configurar Authentication

#### 5.1 Email Provider

1. Ir a **Authentication > Providers**
2. Habilitar **Email**
3. Configurar SMTP (opción A o B):

**Opción A: Resend (Recomendado)**
```bash
# Crear cuenta en https://resend.com
# Copiar API key

# En Supabase:
Settings > Authentication > SMTP Settings
- SMTP Host: smtp.resend.com
- SMTP Port: 587
- SMTP User: resend
- SMTP Pass: re_XXXXXXXXXXXX (API key)
- From Email: noreply@verifysign.com
```

**Opción B: Gmail (Solo dev)**
```bash
# Crear App Password en Google Account
# https://myaccount.google.com/apppasswords

Settings > Authentication > SMTP Settings
- SMTP Host: smtp.gmail.com
- SMTP Port: 587
- SMTP User: tu-email@gmail.com
- SMTP Pass: xxxx xxxx xxxx xxxx (16 chars)
- From Email: tu-email@gmail.com
```

#### 5.2 Email Templates

1. Ir a **Authentication > Email Templates**

**Confirm Signup**:
```html
<h2>Bienvenido a EcoSign</h2>
<p>Haz click en el siguiente enlace para confirmar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar Email</a></p>

<p style="color: #666; font-size: 12px;">
  Este link expira en 24 horas.
</p>
```

**Reset Password**:
```html
<h2>Restablecer Contraseña</h2>
<p>Haz click en el siguiente enlace para restablecer tu contraseña:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer</a></p>

<p style="color: #666; font-size: 12px;">
  Este link expira en 1 hora. Si no solicitaste esto, ignora este email.
</p>
```

---

### ✅ Paso 6: Configurar URLs de Redirección

1. Ir a **Authentication > URL Configuration**
2. Agregar URLs:

**Site URL** (producción):
```
https://verifysign.app
```

**Redirect URLs** (permitir múltiples):
```
https://verifysign.app/**
http://localhost:5173/**
http://localhost:8888/**
```

---

### ✅ Paso 7: Integrar Frontend

#### 7.1 Instalar Supabase Client

```bash
cd client
npm install @supabase/supabase-js
```

#### 7.2 Crear Cliente Supabase

**Archivo**: `client/src/lib/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 7.3 Actualizar LoginPage

**Archivo**: `client/src/pages/LoginPage.jsx`

```typescript
import { supabase } from '../lib/supabaseClient';

const handleLogin = async (email: string, password: string) => {
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

const handleSignup = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    setError(error.message);
  } else {
    setMessage('Revisa tu email para confirmar tu cuenta');
  }
};
```

---

### ✅ Paso 8: Variables de Entorno en Netlify

1. Ir a Netlify Dashboard > Site Settings > Environment Variables
2. Agregar:

```bash
# Supabase
SUPABASE_URL=https://xxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # SOLO BACKEND

# CSRF Secret
HMAC_SIGN_SECRET=tu-secret-de-32-chars-minimo

# Site URL
NETLIFY_SITE_URL=https://verifysign.netlify.app
```

3. Click **Save**
4. Redeploy site

---

## 🧪 Testing

### Test 1: Verificar Conexión

```bash
# En SQL Editor de Supabase
SELECT * FROM documents;
-- Debería retornar empty table (no error)
```

### Test 2: Test de Auth

```typescript
// En browser console (dev)
import { supabase } from './lib/supabaseClient';

// Crear usuario test
const { data, error } = await supabase.auth.signUp({
  email: 'test@verifysign.com',
  password: 'TestPass123!'
});

console.log({ data, error });
```

### Test 3: Test de RLS

```sql
-- Login como usuario test en Supabase Dashboard > SQL Editor
-- Set user context:
SET request.jwt.claim.sub = 'user-uuid-here';

-- Intentar leer documentos de otro usuario (debería fallar):
SELECT * FROM documents WHERE owner_id != 'user-uuid-here';
-- Expected: empty (RLS bloqueó)
```

### Test 4: Test de Storage

```typescript
// En browser console
const { data, error } = await supabase.storage
  .from('eco-files')
  .list();

console.log({ data, error });
// Expected: success, empty list
```

---

## 🐛 Troubleshooting

### Error: "relation does not exist"
- ✅ Ejecutar `001_core_schema.sql` en SQL Editor

### Error: "Bucket not found"
- ✅ Crear buckets manualmente en Storage UI

### Error: "Permission denied for table"
- ✅ Verificar RLS policies con:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'documents';
  ```

### Auth: Email no llega
- ✅ Verificar SMTP settings en Auth > Settings
- ✅ Revisar logs en Auth > Logs
- ✅ Verificar dominio no esté en spam

---

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [RLS Deep Dive](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

**Última actualización**: 2025-11-09
**Status**: ✅ Listo para configurar
