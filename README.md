# EcoSign - Open Source Digital Trust Layer

<div align="center">

![EcoSign](https://img.shields.io/badge/EcoSign-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![Vite](https://img.shields.io/badge/Vite-4.5-purple)

**La Verdad de tus Documentos, Verificable por Cualquiera**

[Demo Live](https://verifysign.netlify.app) · [Documentación](docs/README.md) · [Reportar Bug](https://github.com/tuusuario/verifysign/issues)

</div>

---

## 🎯 ¿Qué es EcoSign?

EcoSign es una plataforma **open source** de certificación digital forense que crea evidencia técnica inmutable y verificable públicamente. A diferencia de soluciones cerradas como DocuSign o Adobe Sign, EcoSign:

✅ **Es completamente auditable** - Código abierto para máxima transparencia
✅ **Verificación pública** - Cualquiera puede validar sin cuenta
✅ **Anclaje blockchain** - Prueba de existencia inmutable
✅ **Formato .ECO** - Estándar propietario para evidencia forense
✅ **Sin vendor lock-in** - Controla tus datos y evidencia

---

## 🚀 Características Principales

### 🔐 Certificación .ECO
Genera certificados con:
- Hash SHA-256 único e inmutable
- Timestamp criptográfico certificado
- Firma digital Ed25519
- Anclaje opcional en blockchain (Bitcoin/Polygon)

### 🔍 Verificador Público
- **Sin cuenta necesaria** - Verifica documentos al instante
- **Procesamiento local** - Tu archivo nunca se sube a servidores
- **Verificación blockchain** - Links directos a exploradores públicos
- **Transparencia total** - Todo el proceso es auditable

### 📋 Enlaces Seguros con NDA
- Crea enlaces protegidos que requieren firma de NDA
- Registro de no-repudio reforzado (IP, dispositivo, geolocalización)
- Trazabilidad completa de cada acceso
- Integración con Mifiel (FIEL México) y SignNow

---

## 🆚 Comparativa

| Característica | EcoSign | DocuSign | OpenSign | Mifiel |
|----------------|------------|----------|----------|--------|
| **Open Source** | ✅ | ❌ | ✅ | ❌ |
| **Verificación Pública** | ✅ | ❌ | ❌ | ⚠️ |
| **Blockchain Anchoring** | ✅ | ❌ | ❌ | ❌ |
| **Formato Forense** | ✅ (.ECO) | ❌ | ❌ | ⚠️ |
| **Post-Signature Tracking** | ✅ | ⚠️ | ❌ | ❌ |
| **Self-Hostable** | ✅ | ❌ | ✅ | ❌ |
| **Costo** | Gratis | $$$ | Gratis | $$ |

> **Nota**: EcoSign complementa (no reemplaza) certificaciones oficiales. La validez legal depende de la jurisdicción.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + Vite + Tailwind CSS (`client/`)
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions)
- **Shared Library**: `eco-packer/` para empaquetar/verificar `.eco`
- **Blockchain**: OpenTimestamps (Bitcoin) + Polygon
- **Integraciones**: Mifiel API + SignNow API (opcional)

### Estructura del repositorio

```
verifysign/
├── client/        # Único frontend (Vite + React)
├── eco-packer/    # Librería compartida para certificados
├── supabase/      # Migraciones + funciones edge
├── docs/          # Documentación oficial (ver docs/README.md)
├── scripts/       # Automatizaciones locales
├── vercel.json
└── README.md
```

Referencias clave:
- `docs/architecture.md`: detalle del diseño JAMStack actual.
- `docs/deployment.md`: builds locales, variables y despliegues.
- `docs/api-reference.md`: contratos de funciones/SDK.
- `docs/security.md`: modelo de amenazas, RLS y políticas.

---

## 📦 Instalación

### Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/verifysign.git
cd verifysign

# Instalar dependencias del workspace (root + client + eco-packer)
npm install

# Variables de entorno del cliente
cd client
cp .env.example .env

# Iniciar el frontend (desde la raíz también puedes usar
# `npm run dev --prefix client`)
npm run dev

# Arranca Supabase en paralelo si lo necesitas (CLI oficial)
# supabase start

# Abrir http://localhost:5173
```

### Build para Producción

```bash
npm run build --prefix client
npm run preview --prefix client
```

---

## 🧪 Testing

Vitest security suites rely on the `.env.local` file that `tests/setup.ts` loads before executing any tests. Copy `.env.example` to `.env.local` and populate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; the `CSRF_SECRET` and `NDA_ENCRYPTION_KEY` values already shown in `.env.example` are safe defaults but can be overridden per project. Keeping `client/.env` and `.env.local` in sync allows the suite to map Vite-prefixed variables automatically so the security tests run without missing vars errors.

Run the suites with:

```bash
npm run test
npm run test:security
npm run test:coverage
```

---

## 🎨 Screenshots

### Landing Page
![Landing](docs/screenshots/landing.png)

### Verificador Público
![Verificador](docs/screenshots/verifier.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP (Completado - Nov 2025)
- [x] Landing page profesional
- [x] Verificador público funcional
- [x] Dashboard con modales
- [x] Sistema de rutas completo
- [x] Diseño responsive

### 🔄 Fase 2: Core Features (Semanas 2-4)
- [ ] Integración real con eco-packer
- [ ] Autenticación Supabase
- [ ] Generación real de certificados .ECO
- [ ] Sistema de enlaces NDA funcional
- [ ] Almacenamiento en Supabase Storage

### 🎯 Fase 3: Blockchain (Mes 2)
- [ ] Anclaje en Bitcoin via OpenTimestamps
- [ ] Anclaje en Polygon (bajo costo)
- [ ] Verificador blockchain independiente
- [ ] API pública de verificación

### 🚀 Fase 4: Legal Integrations (Mes 3-4)
- [ ] API Mifiel (FIEL México)
- [ ] API SignNow (Internacional)
- [ ] Sistema de no-repudio avanzado
- [ ] Multi-factor de identidad legal

### 🌟 Fase 5: Comunidad (Mes 5-6)
- [ ] Bug bounty program
- [ ] SDK para desarrolladores
- [ ] Documentación completa
- [ ] API pública RESTful

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Este proyecto busca crear un estándar abierto para confianza digital.

### Cómo Contribuir

1. **Fork** el proyecto
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add: amazing feature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Áreas donde necesitamos ayuda:
- 🔐 Revisión de seguridad / auditoría criptográfica
- 📱 Implementación de aplicaciones móviles
- 🌐 Traducciones (i18n)
- 📚 Documentación técnica
- 🎨 Diseño UX/UI
- ⚖️ Consultoría legal (validez por jurisdicción)

---

## 🐛 Bug Bounty

**¡Queremos que intentes romper EcoSign!**

Estamos preparando un programa de recompensas por vulnerabilidades. Mientras tanto:

- 🔍 Revisa el código y busca fallos de seguridad
- 📧 Reporta vulnerabilidades de forma responsable a: security@verifysign.com
- 💰 Recompensas de $100-$500 USD por vulnerabilidades críticas

### Áreas de interés:
- Bypass de verificación .ECO
- Compromiso de firma digital
- Manipulación de timestamps
- XSS / SQL Injection
- Vulnerabilidades en eco-packer

---

## 🧪 Testing

EcoSign cuenta con una suite completa de **61 tests automatizados** que validan seguridad, funcionalidad y rendimiento.

### 🚀 Quick Start

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (opcional)
cp .env.example .env.test

# 3. Ejecutar tests (funciona sin configuración adicional)
npm test

# Resultado esperado:
# ✓ tests/security/csrf.test.ts (6 tests)
# ✓ tests/security/encryption.test.ts (5 tests)
# ✓ tests/security/file-validation.test.ts (10 tests)
# ✓ tests/security/sanitization.test.ts (19 tests)
# ... Test Files 9 passed (9)
#     Tests 61 passed (61) ✅
```

### 📊 Suite de Tests

| Categoría | Tests | Descripción |
|-----------|-------|-------------|
| **Seguridad** | 57 | CSRF, encryption, XSS, SQL injection, RLS |
| **Unitarios** | 2 | Lógica de negocio aislada |
| **Integración** | 2 | Flujos completos con DB |
| **Total** | **61** | **100% pasando** ✅ |

### 🔒 Tests de Seguridad (57 tests)

- **CSRF Protection** (6 tests) - Tokens, expiración, timing attacks
- **Encryption** (5 tests) - AES-256-GCM, IV aleatorio, detección de alteraciones
- **File Validation** (10 tests) - Magic bytes, MIME types, límites de tamaño
- **Sanitization** (19 tests) - XSS (DOMPurify), SQL injection, path traversal
- **Storage RLS** (6 tests) - Permisos, buckets privados, URLs firmadas
- **Database RLS** (6 tests) - Políticas de acceso, aislamiento entre usuarios
- **Rate Limiting** (5 tests) - Throttling, ventanas de tiempo, persistencia

### 🛠️ Comandos Disponibles

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch (auto-reload)
npm run test:watch

# UI interactiva de Vitest
npm run test:ui

# Generar reporte de cobertura
npm test -- --coverage
# Ver reporte en: coverage/index.html

# Test específico
npm test tests/security/csrf.test.ts

# Verbose output
npm test -- --reporter=verbose
```

### 🔧 Tests con Supabase Local (Opcional)

Para tests de integración completos contra base de datos real:

```bash
# 1. Iniciar Supabase local
npx supabase start

# 2. Los tests detectan automáticamente la instancia local
npm test

# Resultado:
# ✅ Using REAL local Supabase instance at http://127.0.0.1:54321
# ✓ Storage Security Tests (6 tests) - REAL DB ⭐
# ✓ RLS Tests (6 tests) - REAL DB ⭐
```

### 📚 Documentación de Tests

- **[AUDITORIA_TESTS.md](AUDITORIA_TESTS.md)** - Análisis completo de la suite
- **[ANALISIS_MOCKS_VS_REAL.md](ANALISIS_MOCKS_VS_REAL.md)** - Tests reales vs simulados
- **[PASOS_FINALES.md](PASOS_FINALES.md)** - Guía de implementación paso a paso
- **[ISSUE_3_STATUS.md](ISSUE_3_STATUS.md)** - Estado del roadmap de testing

### 🐛 Troubleshooting

**Tests fallan con "env variables missing":**
```bash
cp .env.example .env.test
```

**Tests de Storage/RLS se skipean:**
```bash
# Normal: Requieren Supabase local
npx supabase start
npm test
```

**Ver logs detallados:**
```bash
npm test -- --reporter=verbose
```

### 📈 Métricas

- **Tests Pasando:** 61/61 (100%) ✅
- **Cobertura Estimada:** ~75%
- **Tests Reales:** 100% (sin mocks simulados)
- **Duración:** ~3-5 segundos

---

## 📄 Licencia

Este proyecto está bajo licencia MIT - ver [LICENSE](LICENSE) para detalles.

**Nota importante**: El formato .ECO y el motor LTC (Live Temporal Composition) son tecnologías propietarias de Temporal Dynamics LLC. Este repositorio cubre la interfaz web y el sistema de verificación, NO el motor de composición.

---

## 🔗 Links Útiles

- **Demo Live**: https://verifysign.netlify.app
- **Análisis Diferencial**: [docs/DIFERENCIAL.md](docs/DIFERENCIAL.md)
- **Arquitectura**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **API Docs**: [docs/API.md](docs/API.md)
- **Quick Wins**: [QUICK-WINS-HOY.md](QUICK-WINS-HOY.md)

---

## 💬 Comunidad

- **Discord**: [Próximamente]
- **Twitter**: [@EcoSignHQ](https://twitter.com/verifysignhq)
- **Email**: contact@verifysign.com

---

## 🙏 Agradecimientos

EcoSign está inspirado en proyectos como:
- [OpenTimestamps](https://opentimestamps.org/) - Timestamping blockchain
- [OpenSign](https://opensignlabs.com/) - E-signature open source
- [Blockcerts](https://www.blockcerts.org/) - Certificados en blockchain

---

## 📊 Proyecto por Temporal Dynamics LLC

EcoSign es parte del ecosistema **VistaNeo/LTC** y el estándar de archivos .ECO/.ECOX.

**¿Por qué Open Source?**

Creemos que la confianza digital debe ser transparente y auditable. No vendemos "firmas mágicas", vendemos **Verdad verificable**.

---

<div align="center">

**⭐ Si te gusta el proyecto, dale una estrella en GitHub ⭐**

Made with ❤️ by the EcoSign community

</div>
