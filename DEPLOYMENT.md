# VerifySign - Guía de Deployment Rápido

Guía para deployar VerifySign a producción en **Netlify + Supabase**.

---

## 🎯 Pre-requisitos

- [ ] Cuenta en [Netlify](https://netlify.com)
- [ ] Cuenta en [Supabase](https://supabase.com)
- [ ] Cuenta en [Resend](https://resend.com) o Gmail para SMTP
- [ ] Repo en GitHub (fork o clone)

---

## 📦 PASO 1: Configurar Supabase

### 1.1 Crear Proyecto

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Config:
   - Name: `verifysign-production`
   - Database Password: (guardar en lugar seguro)
   - Region: Más cercana a tus usuarios
4. Esperar ~2 minutos

### 1.2 Ejecutar Migraciones SQL

1. Ir a **SQL Editor**
2. Copiar y ejecutar `supabase/migrations/001_core_schema.sql`
3. Verificar que se crearon 6 tablas

### 1.3 Crear Storage Buckets

1. Ir a **Storage**
2. Crear 5 buckets (TODOS PRIVADOS excepto `proofs`):
   - `eco-files` (Private)
   - `ecox-files` (Private)
   - `nda-signatures` (Private)
   - `proofs` (Public)
   - `temp-uploads` (Private)

### 1.4 Aplicar Storage Policies

1. Volver a **SQL Editor**
2. Copiar y ejecutar `supabase/migrations/002_storage_policies.sql`

### 1.5 Configurar Auth

**Email Provider**:
1. Ir a **Authentication > Providers**
2. Habilitar **Email**
3. Configurar SMTP:

**Resend (Recomendado)**:
```
Host: smtp.resend.com
Port: 587
User: resend
Pass: re_XXXXXXXXXXXX (tu API key de Resend)
From: noreply@tudominio.com
```

**Email Templates**:
1. Ir a **Authentication > Email Templates**
2. Personalizar "Confirm Signup" y "Reset Password"
3. Agregar branding de VerifySign

**URLs**:
1. Ir a **Authentication > URL Configuration**
2. Site URL: `https://tudominio.netlify.app`
3. Redirect URLs: `https://tudominio.netlify.app/**`

### 1.6 Copiar Credenciales

En **Settings > API**, copiar:
- `SUPABASE_URL`
- `anon` key → `SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 PASO 2: Configurar Netlify

### 2.1 Conectar Repositorio

1. Login en [Netlify](https://netlify.com)
2. Click **Add new site > Import an existing project**
3. Conectar con GitHub
4. Seleccionar repo `verifysign`

### 2.2 Build Settings

```
Build command: cd client && npm install && npm run build
Publish directory: client/dist
Functions directory: netlify/functions
```

### 2.3 Environment Variables

Ir a **Site Settings > Environment Variables** y agregar:

```bash
# Supabase (Frontend + Backend)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # SOLO BACKEND

# CSRF Secret (generar random de 32+ chars)
HMAC_SIGN_SECRET=tu-secret-aqui-minimo-32-caracteres

# Site URL (actualizar después de tener dominio)
NETLIFY_SITE_URL=https://tudominio.netlify.app
URL=https://tudominio.netlify.app
```

### 2.4 Deploy

1. Click **Deploy site**
2. Esperar ~2-3 minutos
3. Verificar que el build fue exitoso

---

## ✅ PASO 3: Verificar Deployment

### 3.1 Test de Frontend

1. Ir a `https://tudominio.netlify.app`
2. Verificar que carga la landing page
3. Click en **Verificar** → debe cargar VerifyPage

### 3.2 Test de Auth

1. Click **Comenzar Gratis** o **Iniciar Sesión**
2. Crear cuenta de prueba
3. Verificar email de confirmación
4. Confirmar cuenta
5. Login
6. Verificar que redirige a `/dashboard`

### 3.3 Test de Functions

```bash
# Test CSRF token
curl https://tudominio.netlify.app/.netlify/functions/get-csrf-token

# Debería retornar:
# {
#   "success": true,
#   "data": {
#     "token": "...",
#     "expires_in": 3600
#   }
# }
```

### 3.4 Test de Storage

1. Login en Supabase Dashboard
2. Ir a **Storage > eco-files**
3. Verificar que las policies están activas (candado cerrado)

---

## 🔧 PASO 4: Configuración Opcional

### 4.1 Dominio Personalizado

**Netlify**:
1. Ir a **Domain Settings**
2. Add custom domain: `verifysign.com`
3. Configurar DNS según instrucciones
4. Habilitar HTTPS automático

**Supabase**:
1. Actualizar Auth URL Configuration con nuevo dominio
2. Actualizar `NETLIFY_SITE_URL` en Netlify env vars

### 4.2 Monitoreo

**Netlify**:
- Ver logs: **Deploys > [deploy] > Functions log**
- Alertas: **Site Settings > Notifications**

**Supabase**:
- Query performance: **Database > Query Performance**
- Auth logs: **Authentication > Logs**

---

## 🐛 Troubleshooting

### Build falla

**Error: Missing environment variables**
✅ Verificar que TODAS las env vars están configuradas en Netlify

**Error: Cannot find module '@supabase/supabase-js'**
✅ Verificar que `client/package.json` tiene la dependencia

### Functions no responden

**Error: 500 Internal Server Error**
✅ Ver logs en Netlify: **Functions log**
✅ Verificar `SUPABASE_SERVICE_ROLE_KEY` configurada

**Error: Invalid CSRF token**
✅ Verificar `HMAC_SIGN_SECRET` configurado
✅ Token expira en 1h, obtener nuevo

### Auth no funciona

**Email de confirmación no llega**
✅ Verificar SMTP en Supabase Auth > Settings
✅ Revisar Auth > Logs para ver errores

**Error: "Email not confirmed"**
✅ Usuario debe confirmar email antes de login
✅ O deshabilitar confirmación en Auth > Settings (solo dev)

---

## 📊 Checklist de Go-Live

Antes de publicar:

- [ ] Supabase configurado (tablas + buckets + auth)
- [ ] Netlify deployed exitosamente
- [ ] Environment variables configuradas
- [ ] SMTP funcionando (test de signup)
- [ ] Dominio personalizado configurado
- [ ] HTTPS habilitado
- [ ] Auth flow testeado end-to-end
- [ ] Functions respondiendo correctamente
- [ ] Storage policies activas
- [ ] Email templates personalizados
- [ ] Logs y monitoring configurados

---

## 🚨 Seguridad Post-Deployment

### Inmediatamente

1. **Rotar secrets** si fueron expuestos en logs públicos
2. **Verificar RLS** en Supabase (todas las tablas)
3. **Test de penetración básico**:
   - Intentar acceder a `/dashboard` sin auth
   - Intentar subir archivo >50MB
   - Intentar CSRF attack
4. **Configurar rate limiting** a nivel Netlify (si disponible)

### Semanalmente

- Revisar logs de Functions (errores, rate limits)
- Revisar Auth logs (intentos fallidos)
- Verificar Storage usage (no superar free tier)

---

## 📈 Escalabilidad

### Free Tier Limits

**Netlify**:
- 100GB bandwidth/mes
- 125K function invocations/mes

**Supabase**:
- 500MB database
- 1GB file storage
- 50K monthly active users

**Cuando superar**:
- Netlify Pro: $19/mes
- Supabase Pro: $25/mes

---

## 🎓 Recursos

- [Netlify Docs](https://docs.netlify.com)
- [Supabase Docs](https://supabase.com/docs)
- [Troubleshooting Functions](https://docs.netlify.com/functions/troubleshooting/)

---

**Tiempo estimado de deployment**: 30-45 minutos

**Última actualización**: 2025-11-09
