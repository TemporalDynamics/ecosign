# VerifySign - Open Source Digital Trust Layer

<div align="center">

![VerifySign](https://img.shields.io/badge/VerifySign-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.2-blue)
![Vite](https://img.shields.io/badge/Vite-4.5-purple)

**La Verdad de tus Documentos, Verificable por Cualquiera**

[Demo Live](https://verifysign.netlify.app) · [Documentación](docs/) · [Reportar Bug](https://github.com/tuusuario/verifysign/issues)

</div>

---

## 🎯 ¿Qué es VerifySign?

VerifySign es una plataforma **open source** de certificación digital forense que crea evidencia técnica inmutable y verificable públicamente. A diferencia de soluciones cerradas como DocuSign o Adobe Sign, VerifySign:

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

| Característica | VerifySign | DocuSign | OpenSign | Mifiel |
|----------------|------------|----------|----------|--------|
| **Open Source** | ✅ | ❌ | ✅ | ❌ |
| **Verificación Pública** | ✅ | ❌ | ❌ | ⚠️ |
| **Blockchain Anchoring** | ✅ | ❌ | ❌ | ❌ |
| **Formato Forense** | ✅ (.ECO) | ❌ | ❌ | ⚠️ |
| **Post-Signature Tracking** | ✅ | ⚠️ | ❌ | ❌ |
| **Self-Hostable** | ✅ | ❌ | ✅ | ❌ |
| **Costo** | Gratis | $$$ | Gratis | $$ |

> **Nota**: VerifySign complementa (no reemplaza) certificaciones oficiales. La validez legal depende de la jurisdicción.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (Auth + Database + Storage)
- **Cryptography**: eco-packer (SHA-256, Ed25519, Merkle Trees)
- **Blockchain**: OpenTimestamps (Bitcoin) + Polygon
- **E-Signature**: Mifiel API + SignNow API

---

## 📦 Instalación

### Desarrollo Local

```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/verifysign.git
cd verifysign

# Instalar dependencias del cliente
cd client
npm install

# Configurar variables de entorno (opcional para MVP)
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev

# Abrir http://localhost:5173
```

### Build para Producción

```bash
npm run build
npm run preview
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

**¡Queremos que intentes romper VerifySign!**

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
- **Twitter**: [@VerifySignHQ](https://twitter.com/verifysignhq)
- **Email**: contact@verifysign.com

---

## 🙏 Agradecimientos

VerifySign está inspirado en proyectos como:
- [OpenTimestamps](https://opentimestamps.org/) - Timestamping blockchain
- [OpenSign](https://opensignlabs.com/) - E-signature open source
- [Blockcerts](https://www.blockcerts.org/) - Certificados en blockchain

---

## 📊 Proyecto por Temporal Dynamics LLC

VerifySign es parte del ecosistema **VistaNeo/LTC** y el estándar de archivos .ECO/.ECOX.

**¿Por qué Open Source?**

Creemos que la confianza digital debe ser transparente y auditable. No vendemos "firmas mágicas", vendemos **Verdad verificable**.

---

<div align="center">

**⭐ Si te gusta el proyecto, dale una estrella en GitHub ⭐**

Made with ❤️ by the VerifySign community

</div>
