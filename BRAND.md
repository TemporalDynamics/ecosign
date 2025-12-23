# EcoSign Brand Assets

> **Versión oficial del logo:** Diciembre 2024
> **No modificar** - Esta es la versión definitiva.

---

## 🎯 La regla madre

**Logo vivo** (HTML/CSS) → App, web, lugares donde escala y responde
**Logo imagen** (PNG) → Emails, PDFs, certificados, lugares estáticos

**Nunca mezclar estilos.**

---

## 📦 Assets disponibles

### Logo completo (E + coSign)

```
/client/public/assets/images/brand/logo/
├── ecosign-logo.png         # Versión base (1x)
├── ecosign-logo@2x.png      # Retina display (2x)
├── ecosign-logo@3x.png      # Alta resolución (3x)
└── ecosign-logo-email.png   # Optimizado para email headers
```

**Características:**
- ✅ E cursiva integrada como primera letra
- ✅ Sin punto
- ✅ Color: `#0E4B8B` (azul EcoSign)
- ✅ Fondo transparente

### Favicon / App Icon (solo E)

```
/client/public/assets/images/brand/favicon/
├── ecosign-icon-512.png    # PWA / Android
├── ecosign-icon-192.png    # PWA manifest
├── ecosign-icon-180.png    # Apple touch icon
├── favicon-32x32.png       # Browser tab
└── favicon-16x16.png       # Browser tab (small)
```

---

## 🔧 Uso técnico

### En la app (logo vivo)

**Componente React:**
```tsx
import Logo from './components/Logo';

<Logo to="/" variant="option-c" />
```

**Ubicación:** `/client/src/components/Logo.tsx`
**Tamaño actual en header:** `h-[32px]`

### En emails / PDFs (logo imagen)

**HTML (email):**
```html
<img src="https://ecosign.app/assets/images/brand/logo/ecosign-logo.png"
     alt="EcoSign"
     height="32"
     style="height: 32px; width: auto;" />
```

**Para retina displays:** Usar `@2x` con width/height específicos
```html
<img src="ecosign-logo@2x.png"
     width="174" height="60"
     style="width: 174px; height: 60px;" />
```

### En PDFs / Certificados

Usar: `ecosign-logo@3x.png` (máxima calidad)

---

## ⚠️ NO hacer

❌ **No rediseñar** - El logo está cerrado
❌ **No cambiar colores** - Solo `#0E4B8B`
❌ **No agregar punto** - La E no tiene punto
❌ **No crear "variantes creativas"** - Una sola versión oficial
❌ **No mezclar** logo vivo + logo imagen en el mismo contexto
❌ **No usar** el logo antiguo (`logo.png`) - Está deprecado

---

## 📏 Tamaños recomendados

| Contexto | Tamaño | Asset |
|----------|--------|-------|
| Header web | 32px altura | Logo vivo (componente React) |
| Email header | 32-40px altura | `ecosign-logo.png` o `@2x` |
| PDF cover | 60-80px altura | `ecosign-logo@3x.png` |
| PDF footer | 24-32px altura | `ecosign-logo@2x.png` |
| Certificado | 48-60px altura | `ecosign-logo@3x.png` |
| Favicon | 32x32 / 16x16 | `favicon-*.png` |
| PWA icon | 512x512 | `ecosign-icon-512.png` |

---

## 🎨 Especificaciones técnicas

**Color principal:**
- Hex: `#0E4B8B`
- RGB: `rgb(14, 75, 139)`
- Nombre: Azul EcoSign

**Tipografía del logo:**
- Fuente: Inter / San Francisco (bold)
- Peso: 700 (bold)
- La E cursiva es parte del logo, no texto

**Formato:**
- Master: PNG con transparencia
- Resoluciones: 1x, 2x, 3x
- Fondo: Siempre transparente

---

## 📝 Filosofía de diseño

EcoSign no es una marca de consumo, es un **protocolo de infraestructura**.

El logo comunica:
- **Fundación** - La E es estructural, no decorativa
- **Sistema** - Integración tipográfica cohesiva
- **Confianza** - Elegancia sin ostentación
- **Apertura** - Sin encierros visuales (no hay recuadro)

El resultado: **No parece branding. Parece lenguaje.**

---

## 🔒 Versión final

Esta es la versión definitiva del logo EcoSign.
**Fecha de cierre:** Diciembre 2024

No hay versiones alternativas.
No hay "pendientes de diseño".
**Este tema está cerrado.**

---

*Generado con Claude Code - Diciembre 2024*
