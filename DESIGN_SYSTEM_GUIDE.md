# 🎨 VerifySign Design System - Guía Completa

## 📋 Índice
1. [Principios de Diseño](#principios-de-diseño)
2. [Paleta de Colores](#paleta-de-colores)
3. [Tipografía](#tipografía)
4. [Espaciado](#espaciado)
5. [Componentes](#componentes)
6. [Páginas a Actualizar](#páginas-a-actualizar)

---

## Principios de Diseño

### ✨ Minimalismo Real
- **Fondo blanco puro** (`bg-white`) en toda la aplicación
- **Sin cajas innecesarias** - solo en casos funcionales (PDF preview, demo video)
- **Mucho aire** - espaciado generoso entre elementos
- **Separadores invisibles** - padding en vez de líneas divisorias
- **Máximo 2 tamaños de títulos** por sección

### 🎯 Jerarquía Visual Clara
- Negro para títulos principales
- Gris oscuro para subtítulos
- Gris medio para texto de soporte
- Color solo en CTAs y elementos de acción

---

## Paleta de Colores

### Colores Principales
```jsx
// Fondo
bg-white           // #ffffff - Fondo principal de toda la app

// Texto
text-black         // #000000 - Títulos principales, navegación activa
text-gray-900      // #111827 - Títulos secundarios
text-gray-700      // #374151 - Subtítulos, texto principal
text-gray-600      // #4B5563 - Texto secundario, descripciones
text-gray-500      // #6B7280 - Microcopy, hints

// Botones Primarios (CTAs)
bg-black           // #000000 - Botón primario
hover:bg-gray-800  // #1F2937 - Hover botón primario
text-white         // #ffffff - Texto en botones primarios

// Botones Secundarios
bg-white           // #ffffff - Fondo botón secundario
border-black       // #000000 - Borde botón secundario
border-2           // 2px de grosor
text-black         // #000000 - Texto botón secundario
hover:bg-black     // #000000 - Hover fondo
hover:text-white   // #ffffff - Hover texto

// Elementos de UI (solo cuando es necesario)
bg-gray-100        // #F3F4F6 - Fondo de demo video, área de archivo
bg-gray-200        // #E5E7EB - Placeholder video
```

### ❌ Colores ELIMINADOS (no usar)
```jsx
// NO USAR ESTOS:
bg-gray-50         // Eliminado - usar bg-white
bg-blue-*          // Eliminados - sin azules de acento
text-blue-*        // Eliminados - sin azules
border-gray-100    // Eliminado - sin bordes sutiles en cajas
bg-blue-100        // Eliminado - sin fondos de color en íconos
```

---

## Tipografía

### Tamaños de Fuente
```jsx
// HERO / Landing Principal
text-7xl           // 72px - Solo para hero principal (lg:text-7xl)
text-6xl           // 60px - Hero en tablet (sm:text-6xl)
text-5xl           // 48px - Hero en mobile (text-5xl)

// Títulos de Sección
text-5xl           // 48px - Títulos principales desktop (md:text-5xl)
text-4xl           // 36px - Títulos principales mobile (text-4xl)

// Subtítulos
text-2xl           // 24px - Subtítulos grandes (md:text-2xl)
text-xl            // 20px - Subtítulos medianos (text-xl)

// Texto Normal
text-lg            // 18px - Texto destacado
text-base          // 16px - Texto normal (default)
text-sm            // 14px - Microcopy, footer

// Peso de Fuente
font-bold          // 700 - Títulos principales
font-semibold      // 600 - Subtítulos, CTAs
font-medium        // 500 - Links de navegación
font-normal        // 400 - Texto normal
```

### Espaciado de Línea
```jsx
leading-tight      // 1.25 - Títulos grandes
leading-relaxed    // 1.625 - Párrafos largos
leading-normal     // 1.5 - Texto normal (default)
```

---

## Espaciado

### Padding Vertical de Secciones
```jsx
// Secciones principales
py-24              // 96px - Todas las secciones de landing

// Hero
pt-32 pb-24        // 128px top, 96px bottom (mobile)
md:pt-40 md:pb-32  // 160px top, 128px bottom (desktop)

// Navegación
h-16               // 64px - Altura fija de navbar

// Footer
py-12              // 48px - Footer
```

### Gaps y Espacios Internos
```jsx
// Entre elementos de grid
gap-16             // 64px - Elementos de beneficios (3 columnas)
gap-x-12 gap-y-8   // 48px horizontal, 32px vertical - Grid editorial

// Entre pasos/elementos listados
space-y-12         // 48px - Entre pasos numerados

// Botones
gap-4              // 16px - Entre botones en mobile
sm:gap-6           // 24px - Entre botones en desktop
```

### Max Width (Contenedores)
```jsx
max-w-7xl          // 1280px - Navegación, footer
max-w-5xl          // 1024px - Hero, secciones amplias
max-w-4xl          // 896px - Cómo funciona, CTA final
max-w-3xl          // 768px - Párrafos largos
max-w-2xl          // 672px - Microcopy
```

---

## Componentes

### 1. Navegación (Navigation Bar)
```jsx
<nav className="bg-white fixed w-full top-0 z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16 items-center">
      {/* Logo */}
      <Link to="/" className="flex items-center space-x-3">
        <span className="text-2xl font-bold text-black">VerifySign</span>
      </Link>
      
      {/* Links Desktop */}
      <div className="hidden md:flex items-center space-x-8">
        <Link to="/path" className="text-gray-600 hover:text-black font-medium transition duration-200">
          Texto Link
        </Link>
        
        {/* CTA Principal */}
        <Link
          to="/login"
          className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
        >
          Comenzar Gratis
        </Link>
      </div>
    </div>
  </div>
</nav>
```

### 2. Botones

#### Botón Primario (CTA)
```jsx
<Link
  to="/path"
  className="bg-black hover:bg-gray-800 text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
>
  Comenzar Gratis
</Link>
```

#### Botón Secundario
```jsx
<Link
  to="/path"
  className="bg-white border-2 border-black text-black hover:bg-black hover:text-white font-semibold py-4 px-10 rounded-lg transition duration-300 text-lg"
>
  Ver cómo funciona
</Link>
```

#### Botón en Navbar (Compacto)
```jsx
<Link
  to="/login"
  className="bg-black hover:bg-gray-800 text-white font-semibold px-6 py-2.5 rounded-lg transition duration-300"
>
  Comenzar Gratis
</Link>
```

### 3. Hero Section
```jsx
<header className="pt-32 pb-24 md:pt-40 md:pb-32 bg-white">
  <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight text-black mb-8">
      Título Principal
    </h1>
    <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto mb-12 leading-relaxed">
      Subtítulo descriptivo
    </p>
    
    {/* Botones */}
    <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-8">
      {/* Botón primario + secundario */}
    </div>
    
    {/* Microcopy */}
    <p className="text-sm text-gray-500 max-w-2xl mx-auto">
      Texto pequeño de soporte
    </p>
  </div>
</header>
```

### 4. Sección Estándar
```jsx
<section className="py-24 bg-white">
  <div className="max-w-5xl mx-auto px-6 lg:px-8">
    <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 text-center">
      Título de Sección
    </h2>
    <p className="text-xl text-gray-700 max-w-3xl mx-auto mb-16 text-center leading-relaxed">
      Descripción de la sección
    </p>
    
    {/* Contenido */}
  </div>
</section>
```

### 5. Grid de Beneficios (Sin Cajas)
```jsx
<div className="grid md:grid-cols-3 gap-16 text-center">
  <div>
    <Lock className="w-10 h-10 text-black mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-black mb-3">Título</h3>
    <p className="text-gray-600">Descripción</p>
  </div>
  
  {/* Repetir para cada columna */}
</div>
```

### 6. Pasos Numerados
```jsx
<div className="space-y-12">
  <div className="text-center md:text-left">
    <div className="inline-block bg-black text-white text-3xl font-bold w-14 h-14 rounded-full flex items-center justify-center mb-4">
      1
    </div>
    <h3 className="text-2xl font-semibold text-black mb-2">Título del Paso</h3>
    <p className="text-lg text-gray-600">Descripción del paso</p>
  </div>
  
  {/* Repetir para cada paso */}
</div>
```

### 7. Grid Editorial (Sin Cajas)
```jsx
<div className="grid md:grid-cols-2 gap-x-12 gap-y-8 text-lg text-gray-700">
  <div>
    <h3 className="font-semibold text-black mb-2">Título</h3>
    <p>Descripción</p>
  </div>
  
  {/* Repetir para cada item */}
</div>
```

### 8. Área de Demo/Video (ÚNICA CAJA PERMITIDA)
```jsx
<div className="bg-gray-100 rounded-xl p-8 max-w-4xl mx-auto">
  <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
    {/* Contenido del demo */}
  </div>
</div>
```

### 9. Footer
```jsx
<footer className="bg-white py-12">
  <div className="max-w-7xl mx-auto px-6 text-center">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
      {/* Logo */}
      <div>
        <span className="text-2xl font-bold text-black">VerifySign</span>
        <p className="text-sm text-gray-600 mt-3">Descripción</p>
      </div>
      
      {/* Columnas de links */}
      <div>
        <h4 className="font-semibold text-black mb-3">Categoría</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>
            <a href="/path" className="hover:text-black">Link</a>
          </li>
        </ul>
      </div>
    </div>
    
    {/* Copyright */}
    <div className="pt-8 space-y-3 text-sm text-gray-600">
      <p>© 2025 VerifySign</p>
    </div>
  </div>
</footer>
```

### 10. Íconos
```jsx
// Importar de lucide-react
import { Shield, Lock, CheckCircle, FileText, Upload, Eye } from 'lucide-react';

// Usar con tamaño y color consistente
<Lock className="w-10 h-10 text-black mx-auto mb-4" />
<Shield className="w-10 h-10 text-black mx-auto mb-4" />
<CheckCircle className="w-10 h-10 text-black mx-auto mb-4" />

// Para botones/navegación
<Icon className="w-6 h-6 text-gray-600" />
```

---

## Páginas a Actualizar

### ✅ Completado
- ✅ `LandingPage.jsx` - Landing principal

### 🔄 Pendientes de Actualizar

#### Alta Prioridad (UI pública)
1. **LoginPage.jsx** - Página de login
2. **VerifyPage.jsx** - Verificador público
3. **PricingPage.jsx** - Página de precios
4. **HowItWorksPage.jsx** - Cómo funciona

#### Media Prioridad (Dashboard)
5. **DashboardPage.jsx** - Dashboard principal
6. **DashboardVerifyPage.jsx** - Verificador en dashboard
7. **DashboardPricingPage.jsx** - Precios en dashboard
8. **DashboardStartPage.jsx** - Onboarding
9. **DashboardNav.jsx** - Navegación dashboard

#### Baja Prioridad (Páginas Secundarias)
10. **GuestPage.jsx** - Acceso guest
11. **AccessPage.jsx** - Acceso general
12. **NdaPage.jsx** - NDA
13. **NdaAccessPage.jsx** - Acceso NDA

#### Componentes
14. **CertificationModal.jsx** - Modal de certificación
15. **CertificationFlow.jsx** - Flujo de certificación
16. **DocumentList.jsx** - Lista de documentos
17. **VerificationSummary.jsx** - Resumen verificación
18. **LegalProtectionOptions.jsx** - Opciones legales
19. **SignatureWorkshop.jsx** - Taller de firmas

#### Páginas Legales/Soporte (crear si no existen)
20. **/terms** - Términos y condiciones
21. **/privacy** - Política de privacidad
22. **/security** - Página de seguridad
23. **/help** - Centro de ayuda
24. **/contact** - Contacto
25. **/status** - Estado del sistema

---

## Reglas de Implementación

### ✅ HACER
1. Usar `bg-white` como fondo principal
2. Títulos en `text-black`, descripciones en `text-gray-600/700`
3. Botones primarios siempre negros
4. Íconos en `text-black` de 10x10 (w-10 h-10)
5. Espaciado generoso: `py-24` en secciones
6. Max-width apropiado para legibilidad
7. Mobile-first con breakpoints sm/md/lg
8. Transiciones suaves: `transition duration-300`

### ❌ NO HACER
1. NO usar `bg-gray-50` o `bg-gray-100` como fondo de sección
2. NO usar colores azules (`text-blue-*`, `bg-blue-*`)
3. NO crear cajas con borders y fondos (excepto demo/video)
4. NO usar más de 2 tamaños de títulos por sección
5. NO crear separadores visuales (líneas)
6. NO usar gradientes o sombras complejas
7. NO agregar animaciones complejas
8. NO usar íconos de colores (solo negro)

---

## Checklist de Migración

Para cada página/componente:

```markdown
- [ ] Cambiar `bg-gray-50` → `bg-white`
- [ ] Eliminar cajas innecesarias (border + bg-color)
- [ ] Botones primarios → Negro (`bg-black hover:bg-gray-800`)
- [ ] Botones secundarios → Outline negro
- [ ] Títulos → `text-black` con tamaños correctos
- [ ] Texto secundario → `text-gray-600` o `text-gray-700`
- [ ] Íconos → `text-black w-10 h-10`
- [ ] Eliminar `text-blue-*` y `bg-blue-*`
- [ ] Espaciado vertical → `py-24` en secciones
- [ ] Comprobar mobile (responsive)
- [ ] Verificar que funcionalidad no se rompe
```

---

## Ejemplo Comparativo

### ❌ ANTES (Estilo Viejo)
```jsx
<div className="bg-gray-50 py-16">
  <div className="p-6 rounded-xl border border-gray-100 hover:border-blue-200 bg-white">
    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
      <Shield className="w-6 h-6 text-blue-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Título</h3>
    <p className="text-gray-600">Descripción</p>
  </div>
</div>
```

### ✅ DESPUÉS (Estilo Nuevo)
```jsx
<section className="py-24 bg-white">
  <div>
    <Shield className="w-10 h-10 text-black mx-auto mb-4" />
    <h3 className="text-xl font-semibold text-black mb-3">Título</h3>
    <p className="text-gray-600">Descripción</p>
  </div>
</section>
```

---

**Última actualización**: 2025-01-19
**Versión**: 1.0.0
**Basado en**: PR #4 - Landing Page Restructure
