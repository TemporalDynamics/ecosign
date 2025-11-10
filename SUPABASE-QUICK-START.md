# ⚡ Supabase Quick Start - 15 Minutos

Versión ULTRA RÁPIDA para configurar Supabase. Para detalles completos ver `SUPABASE-SETUP-CHECKLIST.md`.

---

## 🎯 Lo que vas a hacer:

1. Ejecutar 2 archivos SQL
2. Crear 5 buckets
3. Configurar email (SMTP)
4. Copiar 3 credenciales

**Tiempo**: 15-20 minutos

---

## 📝 PASO 1: SQL Migrations (5 min)

### Ir a: **Database > SQL Editor** en Supabase

### Query 1: Core Schema

1. Click **New query**
2. Abrir archivo: `supabase/migrations/001_core_schema.sql`
3. Copiar TODO el contenido (333 líneas)
4. Pegar en SQL Editor
5. Click **RUN** ▶️
6. Verificar: "Success. No rows returned"

### Query 2: Storage Policies

1. Click **New query**
2. Abrir archivo: `supabase/migrations/002_storage_policies.sql`
3. Copiar TODO el contenido (179 líneas)
4. Pegar en SQL Editor
5. Click **RUN** ▶️
6. Verificar: "Success"

✅ **Hecho**: 6 tablas + RLS policies creadas

---

## 📦 PASO 2: Storage Buckets (3 min)

### Ir a: **Storage > Files**

### Eliminar bucket existente:
1. Click en `nda-signature` → ⋮ → Delete

### Crear 5 buckets nuevos:

Click **New bucket** y crear CADA UNO:

| Name | Public | MIME Types | Size Limit |
|------|--------|------------|------------|
| `eco-files` | ❌ Private | `application/octet-stream` | 50 MB |
| `ecox-files` | ❌ Private | `application/octet-stream` | 10 MB |
| `nda-signatures` | ❌ Private | `image/png, image/jpeg, image/svg+xml` | 2 MB |
| `proofs` | ✅ **Public** | `application/octet-stream` | 1 MB |
| `temp-uploads` | ❌ Private | `*` | 100 MB |

### Lifecycle Rule (temp-uploads):

1. **Storage > Settings** (tab)
2. Scroll a "Lifecycle Rules"
3. **Add rule**:
   - Bucket: `temp-uploads`
   - Delete after: `1` day
4. **Save**

✅ **Hecho**: 5 buckets configurados

---

## 📧 PASO 3: Email (SMTP) - 5 min

### Opción A: Gmail (Más Rápido)

1. Ir a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Crear App Password → Copiar (16 chars)
3. En Supabase:
   - **Authentication > Settings**
   - Scroll a "SMTP Settings"
   - **Enable Custom SMTP**
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `tucorreo@gmail.com`
   - Password: `[App Password copiado]`
   - Sender: `tucorreo@gmail.com`
   - **Save**

### Opción B: Resend (Producción)

1. Ir a [resend.com](https://resend.com) → Sign up
2. **API Keys** → Create → Copiar key
3. En Supabase:
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: `[API key de Resend]`
   - Sender: `noreply@tudominio.com`
   - **Save**

### URL Configuration:

**Authentication > URL Configuration**

```
Site URL: http://localhost:5173

Redirect URLs:
http://localhost:5173/**
http://localhost:8888/**
```

✅ **Hecho**: Emails funcionando

---

## 🔑 PASO 4: Copiar Credenciales (2 min)

### Ir a: **Settings > API**

Copiar 3 valores:

1. **Project URL**
2. **anon public** key
3. **service_role secret** key ⚠️

### Pegar en: `client/.env`

```bash
# Supabase
VITE_SUPABASE_URL=https://tbxowirrvgtvfnxcdqks.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (copiar anon key completa)

# Backend
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (copiar service role key)

# HMAC Secret (generar random)
HMAC_SIGN_SECRET=ejecuta-openssl-rand-base64-32-y-pega-aqui
```

### Generar HMAC_SIGN_SECRET:

```bash
openssl rand -base64 32
```

Copiar output y pegar en HMAC_SIGN_SECRET

✅ **Hecho**: Credenciales configuradas

---

## ✅ Verificar que Funciona

```bash
cd client
npm run dev
```

1. Abrir http://localhost:5173
2. Click "Iniciar Sesión"
3. Click "Crear cuenta"
4. Email: `test@tudominio.com`
5. Password: `Test123456`
6. Click "Registrarse"
7. **Verificar**: Mensaje "Revisa tu email"
8. **Verificar email**: Debería llegar (revisar spam)
9. Click link → **Verificar**: Redirige a /dashboard

### Si todo funciona:

✅ **Supabase configurado 100%**

---

## 📊 Checklist Rápido

- [ ] SQL Migration 1 ejecutada (6 tablas creadas)
- [ ] SQL Migration 2 ejecutada (storage policies)
- [ ] 5 buckets creados
- [ ] Lifecycle rule en temp-uploads
- [ ] SMTP configurado (Gmail o Resend)
- [ ] 3 credenciales copiadas a .env
- [ ] Test signup exitoso
- [ ] Email de confirmación recibido

---

## 🆘 Problemas?

| Error | Solución |
|-------|----------|
| "relation does not exist" | Re-ejecutar migration 001 |
| "No such bucket" | Crear los 5 buckets |
| Email no llega | Revisar SMTP en Auth > Settings > Logs |
| "Missing env vars" | Verificar .env tiene las 3 variables |

---

## 📞 Siguiente Paso

Una vez que el signup funciona:

**Próximo**: Integrar eco-packer en Netlify Functions

**Archivo**: `netlify/functions/generate-link.ts`

---

**Tiempo total**: 15-20 minutos

**Archivos SQL**: Ya están en `supabase/migrations/`

**Guía completa**: `SUPABASE-SETUP-CHECKLIST.md`
