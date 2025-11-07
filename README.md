# VerifySign

**Plataforma de certificación digital con trazabilidad forense y soberanía de datos**

[![Status](https://img.shields.io/badge/status-production%20ready-success)](.)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

## 🎯 Descripción

VerifySign es una plataforma completa de certificación digital que implementa el paradigma .ECO/.ECOX. Permite proteger, firmar y verificar documentos con evidencia criptográfica verificable, independiente de la plataforma.

**"No vendemos firmas, vendemos Verdad"**

### Características Principales

- ✅ **Certificación .ECO**: Genera certificados con hash SHA-256, timestamp y proof criptográfico
- ✅ **Verificación Independiente**: Verifica autenticidad sin depender de la plataforma
- ✅ **Firma Digital de NDA**: Flujo completo de acuerdos de confidencialidad
- ✅ **Dashboard Completo**: Gestión y visualización de certificados
- ✅ **Trazabilidad Forense**: Logs append-only con auditoría completa
- ✅ **Soberanía de Datos**: Usuario propietario absoluto de sus certificados
- ✅ **Seguridad Multicapa**: RLS, cifrado AES-256, rotación de claves

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase (ya configurada)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/verifysign.git
cd verifysign

# Instalar dependencias
npm install
cd app && npm install && cd ..

# Iniciar desarrollo
npm run dev
```

Abre `http://localhost:8888` en tu navegador.

**Variables de entorno** (`.env`):
```env
VITE_SUPABASE_URL=https://tjuftdwehouvfcxqvxxb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

> ⚠️ Ya está configurado. No necesitas modificar nada para empezar.

Para más detalles, consulta [QUICKSTART.md](./QUICKSTART.md)

## 📚 Documentación

### Guías Principales
- [**QUICKSTART.md**](./QUICKSTART.md) - Inicio rápido en 5 minutos
- [**VERIFYSIGN_ARCHITECTURE.md**](./VERIFYSIGN_ARCHITECTURE.md) - Arquitectura completa del sistema
- [**IMPLEMENTATION_GUIDE.md**](./IMPLEMENTATION_GUIDE.md) - Guía de implementación detallada
- [**SECURITY.md**](./SECURITY.md) - Documento de seguridad y mejores prácticas
- [**SUMMARY.md**](./SUMMARY.md) - Resumen ejecutivo del proyecto

### API y Desarrollo
- [**API_DOCS.md**](./API_DOCS.md) - Documentación de endpoints

## 🏗️ Arquitectura

### Stack Tecnológico
```
Frontend:  React 19 + TypeScript + Tailwind CSS
Backend:   Netlify Functions (Node.js)
Database:  Supabase (PostgreSQL + RLS)
Auth:      Supabase Auth (JWT)
Crypto:    CryptoJS (SHA-256, AES-256)
```

### Componentes Principales
- **CryptoService** - Generación y verificación de .ECO
- **SupabaseService** - Gestión de base de datos
- **KeyManagementService** - Rotación de claves automática
- **mint-eco** - Function de minteo de certificados
- **anchor** - Function de anclaje criptográfico

## 🗃️ Base de Datos

### Tablas Implementadas

#### `eco_records`
Certificados .ECO generados con trazabilidad completa.
- Metadata completa del documento
- Hash SHA-256 para verificación
- Referencia a transacción blockchain
- Estados: pending, anchored, verified, revoked

#### `access_logs`
Logs append-only de auditoría forense.
- Registro inmutable de acciones
- IP, user-agent y metadata
- Acciones: created, accessed, verified, downloaded

#### `nda_signatures`
Firmas digitales de acuerdos de confidencialidad.
- Datos del firmante
- Token de acceso temporal (7 días)
- Firma criptográfica
- Timestamps de verificación

## 🔒 Seguridad

### Implementado
- ✅ Hash SHA-256 para integridad de documentos
- ✅ Proof criptográfico de no-repudio
- ✅ Row Level Security (RLS) en todas las tablas
- ✅ Cifrado AES-256 para claves
- ✅ Rotación automática de claves (90 días)
- ✅ Logs append-only inmutables
- ✅ HTTPS obligatorio (TLS 1.3)
- ✅ Headers de seguridad (CSP, HSTS, etc.)

### Gestión de Amenazas
Ver [SECURITY.md](./SECURITY.md) para modelo de amenazas completo y medidas de mitigación.

## 🚀 Deploy

### Netlify (Recomendado)

```bash
# Conectar a Netlify
netlify login
netlify init

# Deploy
netlify deploy --prod
```

**Configuración**:
- Build command: `cd app && npm run build`
- Publish directory: `app/dist`
- Functions directory: `netlify/functions`

Ver [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) para deployment detallado.

## 💡 Flujos de Usuario

### 1. Generar Certificado .ECO (Modo Invitado)
```
Usuario → Sube archivo → Ingresa email →
Backend calcula hash SHA-256 → Genera .ECO →
Ancla hash → Usuario descarga certificado
```

### 2. Verificar Documento
```
Usuario → Sube .ECO → (Opcional) Sube original →
Sistema verifica integridad → Compara hash →
Consulta BD → Muestra resultado ✅/❌
```

### 3. Firmar NDA
```
Usuario → Link con documentId → Ve documento →
Lee términos → Completa datos → Firma →
Token generado (7 días) → .ECO de trazabilidad
```

## 🧪 Testing

```bash
# Unit tests (cuando estén implementados)
cd app
npm test

# Build de producción
npm run build
```

## 🛠️ Desarrollo

### Estructura del Proyecto
```
verifysign/
├── app/                     # Frontend React
│   ├── src/
│   │   ├── pages/          # Páginas principales
│   │   ├── components/     # Componentes reutilizables
│   │   └── lib/            # Servicios core
│   └── package.json
├── netlify/
│   └── functions/          # Funciones serverless
├── supabase/
│   └── migrations/         # Migraciones de BD
└── [docs].md               # Documentación
```

### Comandos Útiles

```bash
npm run dev          # Desarrollo con Netlify Dev
cd app && npm run build  # Compilar aplicación
netlify deploy       # Deploy a producción
```

## 📈 Roadmap

### Corto Plazo
- [ ] Integración blockchain real (Polygon/Ethereum)
- [ ] Generación de .ECOX público
- [ ] Email notifications
- [ ] Rate limiting en functions

### Medio Plazo
- [ ] API pública para verificación
- [ ] SDK para desarrolladores
- [ ] Plugin para navegadores
- [ ] Firma digital X.509

### Largo Plazo
- [ ] Red descentralizada de validadores
- [ ] Marketplace de certificaciones
- [ ] Protocolo interoperable

## 📄 Licencia

MIT License - Ver [LICENSE](./LICENSE) para más detalles.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

- **Email**: dev@verifysign.com
- **Documentación**: Ver archivos `.md` en el repositorio
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/verifysign/issues)

---

**VerifySign** - Tu documento, tu prueba, tu soberanía.

Made with ❤️ by the VerifySign Team
