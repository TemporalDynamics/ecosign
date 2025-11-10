# Guía de Desarrollo Local - VerifySign

Guía rápida para levantar el proyecto localmente y empezar a desarrollar.

---

## 🚀 Quick Start (5 minutos)

### 1. Instalar Dependencias

```bash
# Frontend
cd client
npm install

# Netlify Functions
cd ../netlify
npm install

# Volver a raíz
cd ..
```

### 2. Configurar Variables de Entorno

```bash
# Copiar template
cp client/.env.example client/.env

# Editar con tus credenciales de Supabase
nano client/.env
```

**Variables requeridas**:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
HMAC_SIGN_SECRET=tu-secret-de-32-caracteres-minimo
```

### 3. Levantar Servidor de Desarrollo

#### Opción A: Todo en uno (Recomendado)

```bash
# Instala Netlify CLI global si no lo tienes
npm install -g netlify-cli

# Levanta frontend + functions juntos
netlify dev
```

Esto levanta:
- **Frontend**: http://localhost:8888
- **Functions**: http://localhost:8888/.netlify/functions/*

#### Opción B: Separado (Para debugging)

**Terminal 1** - Frontend:
```bash
cd client
npm run dev
# → http://localhost:5173
```

**Terminal 2** - Functions:
```bash
netlify functions:serve
# → http://localhost:9999/.netlify/functions/*
```

---

## 📁 Estructura del Proyecto

```
verifysign/
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── hooks/           # Custom hooks (useAuth)
│   │   ├── lib/             # Supabase client, API client
│   │   ├── pages/           # Páginas (Landing, Login, Dashboard, Verify)
│   │   └── App.jsx          # Router principal
│   ├── .env                 # Variables de entorno (NO COMMITEAR)
│   └── package.json
│
├── netlify/                 # Backend Serverless
│   ├── functions/
│   │   ├── utils/           # Utilidades compartidas
│   │   ├── generate-link.ts # Crear enlaces NDA
│   │   ├── verify-access.ts # Validar token y desbloquear
│   │   ├── log-event.ts     # Auditoría de accesos
│   │   └── get-csrf-token.ts # Tokens CSRF
│   ├── package.json
│   └── tsconfig.json
│
├── supabase/                # Database + Storage
│   ├── migrations/          # SQL schemas
│   ├── SETUP.md             # Guía de configuración
│   └── ALIGNMENT.md         # Verificación de nombres
│
└── netlify.toml             # Config de Netlify
```

---

## 🧪 Testing

### Frontend

```bash
cd client
npm run dev

# Visitar http://localhost:5173
# Probar flujos:
# 1. Landing page
# 2. Login/Signup
# 3. Dashboard (requiere auth)
# 4. Verify page (público)
```

### Functions (con curl)

```bash
# Test CSRF token
curl http://localhost:8888/.netlify/functions/get-csrf-token

# Test generate-link (requiere auth)
curl -X POST http://localhost:8888/.netlify/functions/generate-link \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_TOKEN" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "documentId": "doc-123",
    "recipientEmail": "test@example.com",
    "expiresInHours": 24,
    "requireNDA": true
  }'
```

### TypeScript

```bash
# Verificar tipos en frontend
cd client
npm run typecheck

# Compilar functions
cd ../netlify
npm run build
```

---

## 🔧 Comandos Útiles

### Build Completo

```bash
# Frontend
cd client && npm run build
# Output: client/dist/

# Functions
cd netlify && npm run build
# Output: netlify/dist/
```

### Linting

```bash
# Frontend (si está configurado)
cd client && npm run lint

# Functions
cd netlify && npm run lint
```

### Git

```bash
# Ver estado
git status

# Crear rama de feature
git checkout -b feature/nombre-feature

# Commit
git add .
git commit -m "feat: descripción del cambio"

# Volver a main
git checkout main
```

---

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

**Causa**: Archivo `.env` no está en `client/` o faltan variables.

**Solución**:
```bash
# Verificar que existe
ls -la client/.env

# Verificar contenido
cat client/.env

# Copiar template si falta
cp client/.env.example client/.env
```

### Error: "Module not found @supabase/supabase-js"

**Causa**: Dependencias no instaladas.

**Solución**:
```bash
cd client
npm install

cd ../netlify
npm install
```

### Functions retornan 500

**Causa**: `SUPABASE_SERVICE_ROLE_KEY` no configurada.

**Solución**:
```bash
# Agregar a .env de Netlify CLI
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbG..." >> .env
```

### Build falla con errores TypeScript

**Causa**: Cambios incompatibles con tipos.

**Solución**:
```bash
# Ver errores detallados
cd netlify
npm run build

# O en frontend
cd client
npm run typecheck
```

---

## 🔒 Variables de Entorno

### Frontend (client/.env)

```env
# Supabase (públicas, OK en frontend)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# HMAC Secret (compartido con backend)
HMAC_SIGN_SECRET=min-32-caracteres-random
```

### Backend (Netlify Functions)

En desarrollo local, Netlify CLI lee de `.env` en la raíz o usa `netlify.toml`.

```env
# Supabase (backend necesita service role)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # ⚠️ NUNCA en frontend

# CSRF
HMAC_SIGN_SECRET=min-32-caracteres-random

# Site URL
NETLIFY_SITE_URL=http://localhost:8888
```

---

## 📚 Recursos

- **Netlify CLI**: https://docs.netlify.com/cli/get-started/
- **Vite Docs**: https://vitejs.dev/guide/
- **Supabase JS**: https://supabase.com/docs/reference/javascript/introduction
- **React Router**: https://reactrouter.com/

---

## 🎯 Flujo de Trabajo Recomendado

### 1. Crear Feature Branch

```bash
git checkout -b feature/nueva-funcionalidad
```

### 2. Desarrollar con Hot Reload

```bash
netlify dev
# Cambios en client/src → auto-reload
# Cambios en functions → auto-recompile
```

### 3. Testing Manual

- Probar en navegador (http://localhost:8888)
- Verificar Network tab en DevTools
- Revisar logs de Functions en terminal

### 4. Verificar Build

```bash
# Build completo
cd client && npm run build
cd ../netlify && npm run build
```

### 5. Commit

```bash
git add .
git commit -m "feat(scope): descripción corta

Detalles opcionales del cambio.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 6. Merge a Main

```bash
git checkout main
git merge feature/nueva-funcionalidad --no-ff
```

---

## 🚀 Deploy (Preview)

```bash
# Deploy a Netlify preview (sin afectar producción)
netlify deploy

# Si todo funciona, deploy a producción
netlify deploy --prod
```

---

**Última actualización**: 2025-11-09

**Tiempo estimado de setup**: 5-10 minutos
