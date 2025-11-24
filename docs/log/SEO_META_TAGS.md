# 🎯 SEO Meta Tags - EcoSign.app

Este archivo contiene todos los meta tags optimizados para SEO que deben implementarse en cada página.

## 📋 Implementación en React

Para cada página, agregar en el `<head>` usando `react-helmet-async` o directamente en `index.html`:

```bash
npm install react-helmet-async
```

---

## 🏠 Home (Landing Page)

```jsx
// LandingPage.jsx - Agregar en el componente
<Helmet>
  <title>Certificación y Firma Digital Privada | EcoSign</title>
  <meta name="description" content="Protegé tus documentos sin exponerlos. Firma en un paso, obtené prueba de autoría y blindaje legal con blockchain y timestamp RFC 3161." />
  
  {/* Open Graph / Facebook */}
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/" />
  <meta property="og:title" content="Certificación y Firma Digital Privada | EcoSign" />
  <meta property="og:description" content="Protegé tus documentos sin exponerlos. Firma en un paso, obtené prueba de autoría y blindaje legal con blockchain y timestamp RFC 3161." />
  
  {/* Twitter */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://ecosign.app/" />
  <meta name="twitter:title" content="Certificación y Firma Digital Privada | EcoSign" />
  <meta name="twitter:description" content="Protegé tus documentos sin exponerlos. Firma en un paso, obtené prueba de autoría y blindaje legal con blockchain y timestamp RFC 3161." />
  
  {/* Additional SEO */}
  <link rel="canonical" href="https://ecosign.app/" />
  <meta name="keywords" content="firma digital, certificación documentos, blockchain, timestamp, prueba de autoría, firma electrónica, privacidad documentos" />
</Helmet>
```

---

## 📋 Cómo Funciona

```jsx
<Helmet>
  <title>Cómo Funciona EcoSign | Prueba de Autenticidad y Blindaje Digital</title>
  <meta name="description" content="Conocé el proceso: hash local, sello de tiempo legal, blockchain y verificación universal. Tu archivo nunca se sube." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/how-it-works" />
  <meta property="og:title" content="Cómo Funciona EcoSign | Prueba de Autenticidad y Blindaje Digital" />
  <meta property="og:description" content="Conocé el proceso: hash local, sello de tiempo legal, blockchain y verificación universal. Tu archivo nunca se sube." />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://ecosign.app/how-it-works" />
  <meta name="twitter:title" content="Cómo Funciona EcoSign | Prueba de Autenticidad y Blindaje Digital" />
  <meta name="twitter:description" content="Conocé el proceso: hash local, sello de tiempo legal, blockchain y verificación universal. Tu archivo nunca se sube." />
  
  <link rel="canonical" href="https://ecosign.app/how-it-works" />
  <meta name="keywords" content="proceso certificación, hash SHA-256, timestamp RFC 3161, blockchain verificación, privacidad documentos" />
</Helmet>
```

---

## 🔍 Verificar

```jsx
<Helmet>
  <title>Verificar Documento o Archivo .ECO | EcoSign</title>
  <meta name="description" content="Validá cualquier documento firmado o certificado. Verificación instantánea sin cuenta y sin exponer tu archivo." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/verify" />
  <meta property="og:title" content="Verificar Documento o Archivo .ECO | EcoSign" />
  <meta property="og:description" content="Validá cualquier documento firmado o certificado. Verificación instantánea sin cuenta y sin exponer tu archivo." />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://ecosign.app/verify" />
  <meta name="twitter:title" content="Verificar Documento o Archivo .ECO | EcoSign" />
  <meta name="twitter:description" content="Validá cualquier documento firmado o certificado. Verificación instantánea sin cuenta y sin exponer tu archivo." />
  
  <link rel="canonical" href="https://ecosign.app/verify" />
  <meta name="keywords" content="verificar documento, validar firma, archivo ECO, verificación blockchain, autenticidad documento" />
</Helmet>
```

---

## 💰 Precios

```jsx
<Helmet>
  <title>Planes y Precios de EcoSign | Gratis, Pro y Business</title>
  <meta name="description" content="Elegí el plan ideal para certificar, firmar y blindar documentos con privacidad total y trazabilidad forense." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/pricing" />
  <meta property="og:title" content="Planes y Precios de EcoSign | Gratis, Pro y Business" />
  <meta property="og:description" content="Elegí el plan ideal para certificar, firmar y blindar documentos con privacidad total y trazabilidad forense." />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://ecosign.app/pricing" />
  <meta name="twitter:title" content="Planes y Precios de EcoSign | Gratis, Pro y Business" />
  <meta name="twitter:description" content="Elegí el plan ideal para certificar, firmar y blindar documentos con privacidad total y trazabilidad forense." />
  
  <link rel="canonical" href="https://ecosign.app/pricing" />
  <meta name="keywords" content="precios firma digital, planes certificación, pricing EcoSign, costo firma electrónica" />
</Helmet>
```

---

## 🔐 Iniciar Sesión

```jsx
<Helmet>
  <title>Iniciar Sesión | EcoSign</title>
  <meta name="description" content="Accedé a tu cuenta de EcoSign para certificar y firmar documentos con privacidad total." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/login" />
  <meta property="og:title" content="Iniciar Sesión | EcoSign" />
  
  <link rel="canonical" href="https://ecosign.app/login" />
  <meta name="robots" content="noindex, follow" />
</Helmet>
```

---

## 📄 Términos de Servicio

```jsx
<Helmet>
  <title>Términos de Servicio | EcoSign</title>
  <meta name="description" content="Conocé las condiciones de uso del servicio de certificación digital EcoSign." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/terms" />
  <meta property="og:title" content="Términos de Servicio | EcoSign" />
  <meta property="og:description" content="Conocé las condiciones de uso del servicio de certificación digital EcoSign." />
  
  <link rel="canonical" href="https://ecosign.app/terms" />
  <meta name="keywords" content="términos de servicio, condiciones de uso, legal EcoSign" />
</Helmet>
```

---

## 🔒 Política de Privacidad

```jsx
<Helmet>
  <title>Política de Privacidad | EcoSign</title>
  <meta name="description" content="EcoSign no sube ni almacena tu archivo. Descubrí cómo protegemos tus datos." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/privacy" />
  <meta property="og:title" content="Política de Privacidad | EcoSign" />
  <meta property="og:description" content="EcoSign no sube ni almacena tu archivo. Descubrí cómo protegemos tus datos." />
  
  <link rel="canonical" href="https://ecosign.app/privacy" />
  <meta name="keywords" content="política de privacidad, protección de datos, privacidad documentos, GDPR" />
</Helmet>
```

---

## 🛡️ Seguridad

```jsx
<Helmet>
  <title>Seguridad y Estándares Técnicos | EcoSign</title>
  <meta name="description" content="Hash SHA-256, sellos RFC 3161 y blockchain. Conocé cómo cuidamos la integridad de tu trabajo." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/security" />
  <meta property="og:title" content="Seguridad y Estándares Técnicos | EcoSign" />
  <meta property="og:description" content="Hash SHA-256, sellos RFC 3161 y blockchain. Conocé cómo cuidamos la integridad de tu trabajo." />
  
  <link rel="canonical" href="https://ecosign.app/security" />
  <meta name="keywords" content="seguridad documentos, SHA-256, RFC 3161, blockchain seguridad, timestamp legal" />
</Helmet>
```

---

## 🆘 Ayuda

```jsx
<Helmet>
  <title>Ayuda y Preguntas Frecuentes | EcoSign</title>
  <meta name="description" content="Respuestas rápidas sobre cómo firmar, certificar, verificar y proteger tu trabajo." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/help" />
  <meta property="og:title" content="Ayuda y Preguntas Frecuentes | EcoSign" />
  <meta property="og:description" content="Respuestas rápidas sobre cómo firmar, certificar, verificar y proteger tu trabajo." />
  
  <link rel="canonical" href="https://ecosign.app/help" />
  <meta name="keywords" content="ayuda EcoSign, FAQ, preguntas frecuentes, soporte firma digital" />
</Helmet>
```

---

## 📬 Contacto

```jsx
<Helmet>
  <title>Contacto | EcoSign</title>
  <meta name="description" content="Escribinos para soporte, dudas o problemas con tu certificación o firmas." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/contact" />
  <meta property="og:title" content="Contacto | EcoSign" />
  <meta property="og:description" content="Escribinos para soporte, dudas o problemas con tu certificación o firmas." />
  
  <link rel="canonical" href="https://ecosign.app/contact" />
  <meta name="keywords" content="contacto EcoSign, soporte técnico, ayuda certificación" />
</Helmet>
```

---

## 📡 Estado del Servicio

```jsx
<Helmet>
  <title>Estado del Servicio | EcoSign</title>
  <meta name="description" content="Consultá el estado y disponibilidad de los sistemas de EcoSign." />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://ecosign.app/status" />
  <meta property="og:title" content="Estado del Servicio | EcoSign" />
  <meta property="og:description" content="Consultá el estado y disponibilidad de los sistemas de EcoSign." />
  
  <link rel="canonical" href="https://ecosign.app/status" />
  <meta name="keywords" content="estado servicio, disponibilidad EcoSign, uptime, status page" />
</Helmet>
```

---

## 🚀 Instalación de react-helmet-async

1. **Instalar dependencia:**
```bash
npm install react-helmet-async
```

2. **Configurar en App.jsx:**
```jsx
import { HelmetProvider } from 'react-helmet-async';

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <div className="App">
          <Routes>
            {/* Tus rutas */}
          </Routes>
        </div>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
```

3. **Usar en cada página:**
```jsx
import { Helmet } from 'react-helmet-async';

const MyPage = () => {
  return (
    <>
      <Helmet>
        <title>Mi Título</title>
        <meta name="description" content="Mi descripción" />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Contenido de la página */}
      </div>
    </>
  );
};
```

---

## 📊 Métricas y Verificación

### Google Search Console
1. Verificar propiedad del dominio `ecosign.app`
2. Subir `sitemap.xml`
3. Monitorear indexación y errores

### Schema.org (Structured Data)
Agregar datos estructurados en el futuro para mejorar snippets en Google:
- Organization
- WebSite
- FAQPage (en /help)
- ContactPage (en /contact)

---

**Última actualización**: 2025-01-19
**Próximos pasos**: Implementar react-helmet-async y agregar meta tags a cada página
