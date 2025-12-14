# 🚀 Guía de Desarrollo Local

## ✅ Setup Completo

### 1. Variables de Entorno
El archivo `.env` ya está configurado con las credenciales de Supabase:
```bash
VITE_SUPABASE_URL=https://uiyojopjbhooxrmamaiw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

✅ **Estas claves son PÚBLICAS** - son seguras para el browser
❌ **Nunca commitear claves privadas** (service_role, jwt_secret, etc)

### 2. Levantar el servidor local

#### Opción A: Script helper (recomendado)
```bash
npm run dev:local
```

#### Opción B: Vite directo
```bash
npm run dev
```

El servidor estará en: http://localhost:5174/

### 3. Build para producción

```bash
npm run build
```

Esto ejecuta:
1. Validación de variables de entorno
2. Build optimizado con Vite
3. Output en `dist/`

## 🔒 Seguridad Verificada

### ✅ Variables protegidas
- `.env` está en `.gitignore`
- `.env.local` está en `.gitignore`
- Ningún archivo .env está trackeado en git

### ✅ Variables expuestas (correcto)
Solo estas variables **públicas** van al bundle:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### ❌ Variables NUNCA expuestas
Estas nunca deben estar en el código del cliente:
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `DATABASE_URL`
- Claves privadas de firma

## 📝 Comandos disponibles

```bash
# Desarrollo
npm run dev              # Vite server
npm run dev:local        # Con variables de .env cargadas

# Build
npm run build            # Build con validación
npm run build:skip-validation  # Build sin validar

# Quality
npm run lint             # ESLint check
npm run lint:fix         # ESLint autofix
npm run typecheck        # TypeScript check
```

## 🔧 Troubleshooting

### Error: "Variable is empty or undefined"
```bash
# Verificar que .env existe y tiene las variables
cat .env

# Usar el script helper que carga automáticamente
npm run dev:local
```

### Error: "Expected identifier but found '}'"
Syntax error en algún archivo `.tsx` - revisar el último archivo modificado.

### Port en uso
Vite automáticamente busca otro puerto disponible (5174, 5175, etc).

## 🎯 Workflow Recomendado

**Para desarrollo de UI/UX:**
```bash
npm run dev:local  # Ver cambios en tiempo real
```

**Para testing pre-deploy:**
```bash
npm run build      # Verificar que compile sin errores
```

**Para deploy:**
- Push a GitHub
- Vercel hace el deploy automático
- Variables de entorno en Vercel Dashboard

## ⚖️ Metodología: Local vs Deploy

### ✅ Desarrollar en local
- Frontend (UI, componentes, routing)
- Lógica de cliente
- Estilos y diseño
- Validaciones de formularios

### ✅ Probar en Vercel
- Edge Functions (Supabase)
- Flujos completos de autenticación
- Integraciones externas (SignNow, etc)
- Performance en producción

### 🎯 Balance ideal
70% local (feedback rápido) + 30% deploy (testing real)
