# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### 🔧 Mantenimiento
- ✅ Correcciones TypeScript en Netlify Functions (unused variables)
- ✅ Creada guía de desarrollo local (LOCAL-DEV.md)
- ✅ Build verificado exitosamente (client + functions)

---

## [0.2.0] - 2025-11-09 - WEEK 1 COMPLETE ✅

### 🔒 Seguridad (Semana 1 - COMPLETADA ✅)
- ✅ Protección de código fuente de `eco-packer` (patente en trámite)
- ✅ Actualizado `.gitignore` para excluir archivos sensibles
- ✅ **COMMIT 1**: Validación de entrada en VerifyPage
  - Validar extensiones (.eco, .ecox, .pdf, .zip)
  - Límite de 50MB por archivo
  - Validación de MIME types
  - Mensajes de error visuales claros
- ✅ **COMMIT 2**: CSP y headers de seguridad robustos
  - Content Security Policy completo
  - Permissions Policy (hardware bloqueado)
  - HSTS con preload (1 año)
  - Headers separados app vs API
  - CORS configurado para Netlify Functions
- ✅ **COMMIT 3**: Estructura completa de Netlify Functions
  - 4 endpoints: generate-link, verify-access, log-event, get-csrf-token
  - 6 utilidades: supabase, response, validation, rateLimit, csrf, storage
  - TypeScript strict mode + ES2022
  - Rate limiting implementado (10-100 req/min por endpoint)
  - CSRF protection con timing-attack prevention
  - Input validation robusta
  - README completo con documentación de API

### 🗄️ Base de Datos (Supabase - COMPLETADA ✅)
- ✅ Esquema SQL completo (`001_core_schema.sql`)
  - 6 tablas con RLS habilitadas
  - 15 índices optimizados
  - 12 RLS policies
  - Constraints de integridad
- ✅ Storage policies (`002_storage_policies.sql`)
  - 5 buckets configurados
  - Lifecycle auto-delete (temp-uploads 24h)
  - Public access para proofs
- ✅ Guía de configuración completa (`SETUP.md`)
  - Paso a paso desde cero
  - Configuración Auth (SMTP + templates)
  - Testing procedures
  - Troubleshooting
- ✅ Verificación de alineación (`ALIGNMENT.md`)
  - 100% nombres TypeScript ↔ SQL alineados
  - Event types, status, chain validados

### 📚 Documentación
- ✅ Creado `CHANGELOG.md` para tracking de releases
- ✅ Creado `supabase/PENDING.md` → migrado a `SETUP.md`
- ✅ Creado `eco-packer/README-PUBLIC.md` (solo API pública)
- ✅ Creado `netlify/README.md` (documentación de Functions)
- ✅ Creado `supabase/SETUP.md` (guía completa de configuración)
- ✅ Creado `supabase/ALIGNMENT.md` (verificación de nombres)

### 🎨 Frontend (Supabase Integration - COMPLETADA ✅)
- ✅ Cliente Supabase para frontend (`supabaseClient.ts`)
  - Singleton con auto-refresh tokens
  - Database types completos
  - Helpers: getCurrentUser, getCurrentSession, signOut
- ✅ Hook `useAuth` para React
  - signIn, signUp, signOut, resetPassword
  - Loading states y error handling
  - Session persistence
- ✅ Componente `ProtectedRoute`
  - HOC para rutas privadas
  - Redirect automático a /login
  - Loading spinner mientras verifica auth
- ✅ `LoginPage` reescrito con Supabase Auth
  - Login/Signup real (elimina mock)
  - Password reset funcional
  - Validación de inputs
  - Mensajes de error/success visuales
- ✅ API Client (`api.ts`)
  - Helper para Netlify Functions
  - Auto-manejo de CSRF tokens (caché)
  - Auto-manejo de Authorization headers
  - Endpoints: generateLink, verifyAccess, logEvent
- ✅ Routes actualizadas
  - Dashboard ahora es ruta protegida
  - Separación clara público vs privado
- ✅ Documentación
  - `client/README.md` - Guía completa
  - `.env.example` - Template de variables
  - `DEPLOYMENT.md` - Guía paso a paso

### ⏳ Próximos Pasos (Semana 2)
- [ ] Configurar Supabase (seguir SETUP.md o DEPLOYMENT.md)
- [ ] Deploy a Netlify staging
- [ ] Integrar eco-packer real en generate-link function
- [ ] Implementar validación de OTP (2FA)
- [ ] Testing E2E del flujo completo
- [ ] Lanzar bug bounty program

---

## [0.1.0] - 2025-11-09

### ✨ Agregado
- Landing page profesional con diseño unificado
- Verificador público con UI completa
- Dashboard con modales de certificación
- Sistema de tooltips pedagógicos
- Integración de Lucide React (pictogramas profesionales)
- Documentación completa (README, ARCHITECTURE, PRE-RELEASE)
- CI/CD con GitHub Actions
- Estructura de Netlify Functions (base)

### 🎨 UI/UX
- Tema claro unificado (blanco + gradientes cyan/blue)
- Componentes reutilizables: CardWithImage, Tooltip, Button
- Responsive design completo
- Eliminación de emojis, reemplazo por iconos profesionales

### 📚 Documentación
- `PRE-RELEASE.md` - Estado del Developer Preview
- `QUICK-WINS-HOY.md` - Estrategia de lanzamiento
- `SECURITY.md` - Política de seguridad
- `CONTRIBUTING.md` - Guía de contribución

### 🔧 Infraestructura
- Netlify deployment configurado
- Supabase schema inicial (tablas `cases`, `signatures`)
- Variables de entorno documentadas en `.env.example`

---

## Formato de Commits

Usaremos commits descriptivos siguiendo este patrón:

```
tipo(scope): descripción corta

[cuerpo opcional con detalles]

[footer opcional con referencias]
```

**Tipos**:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `security`: Mejora de seguridad
- `docs`: Documentación
- `style`: Formato, sin cambios de código
- `refactor`: Refactorización de código
- `test`: Agregar/modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplo**:
```
security(verify): agregar validación de tipo y tamaño de archivo

- Validar extensiones permitidas (.eco, .ecox, .pdf, .zip)
- Limitar tamaño máximo a 50MB
- Validar MIME types básicos
- Mostrar errores claros al usuario

Relacionado: #12
```

---

## [Próximos Releases]

### v0.2.0 - Blindaje de Seguridad (Semana 1)
- [ ] Validación de entrada en uploads
- [ ] Rate limiting en Netlify Functions
- [ ] CSRF protection
- [ ] CSP headers completos
- [ ] Supabase Auth integrado

### v0.3.0 - Backend Funcional (Semana 2)
- [ ] Netlify Functions: `generate-link`, `verify-access`, `log-event`
- [ ] Integración real con eco-packer
- [ ] Supabase RLS policies completas
- [ ] Storage con URLs firmadas

### v0.4.0 - Diferenciadores (Semana 3-4)
- [ ] OpenTimestamps - Anclaje en Bitcoin
- [ ] Watermark dinámico en viewer
- [ ] Dashboard de accesos con export CSV/JSON
- [ ] Preparación para Mifiel/SignNow

---

**Última actualización**: 2025-11-09
