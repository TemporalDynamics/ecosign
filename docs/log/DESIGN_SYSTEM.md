# 🎨 EcoSign - Sistema de Diseño Minimalista

**Versión:** 2.0.0  
**Fecha:** 2025-01-20  
**Filosofía:** Minimalismo extremo - Blanco, Negro, Gris + Azul Petróleo como único acento

---

## 🎨 Paleta de Colores

### Colores Base (Blanco y Negro)
```css
--color-white: #FFFFFF      /* Fondos principales */
--color-black: #000000      /* Texto principal, botones primarios */
```

### Escala de Grises (Jerarquía)
```css
--gray-50:  #F9FAFB  /* Fondos alternos muy suaves */
--gray-100: #F3F4F6  /* Fondos de cards */
--gray-200: #E5E7EB  /* Bordes suaves */
--gray-300: #D1D5DB  /* Bordes medios */
--gray-400: #9CA3AF  /* Placeholders */
--gray-500: #6B7280  /* Texto terciario */
--gray-600: #4B5563  /* Texto secundario */
--gray-700: #374151  /* Texto principal (alternativa al negro puro) */
--gray-800: #1F2937  /* Hover negro */
--gray-900: #111827  /* Negro alternativo */
```

### Azul Petróleo - Color de Acento (ÚNICO)
```css
--accent:       #0A66C2  /* Principal - Logo, CTAs especiales */
--accent-dark:  #0E4B8B  /* Hover states */
--accent-light: #1478D4  /* Estados activos */
```

### Colores de Estado (Mínimos, solo cuando sea necesario)
```css
--success: #10B981  /* Verde para confirmaciones */
--error:   #EF4444  /* Rojo para errores */
--warning: #F59E0B  /* Amarillo para advertencias */
```

---

## 🎯 Uso del Color de Acento (Azul Petróleo)

### ✅ USAR `accent` (#0A66C2) SOLO para:

1. **Logo "EcoSign"** en header
2. **Botón "Ver cómo funciona"** en landing page
3. **Links críticos** (no todos, solo los importantes)
4. **Hover en navegación principal**
5. **Focus rings** en inputs (`focus:ring-accent`)
6. **Iconos de verificación/certificación** (ocasionalmente)
7. **Badges de Bitcoin/Blockchain** (específicos)

### ❌ NO USAR para:

- Botones primarios generales → usar `bg-black`
- Fondos de secciones → usar `bg-white` o `bg-gray-50`
- Texto de párrafos → usar `text-gray-700`
- Todos los links → mayoría en `text-black`
- Decoraciones o adornos → mantener B/N

---

## 🎨 Componentes UI

### 1. Botones

#### Primario (Negro - Acción principal)
```jsx
className="bg-black hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
```

#### Secundario (Outline - Acción alternativa)
```jsx
className="bg-white border-2 border-black text-black hover:bg-black hover:text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
```

#### Acento (Azul Petróleo - CTA especial)
```jsx
className="bg-accent hover:bg-accent-dark text-white font-semibold py-3 px-6 rounded-lg transition duration-300 shadow-sm"
```

#### Terciario (Subtle - Cancelar)
```jsx
className="text-gray-700 hover:text-black hover:bg-gray-100 font-medium py-2 px-4 rounded-lg transition duration-300"
```

#### Deshabilitado
```jsx
className="opacity-50 cursor-not-allowed bg-gray-400 text-gray-700"
disabled
```

### 2. Inputs y Forms

```jsx
<input 
  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition duration-200"
  placeholder="Ingresa texto..."
/>

<textarea 
  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition duration-200 resize-none"
  rows="4"
/>

<select className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent">
  <option>Opción 1</option>
</select>
```

### 3. Cards

#### Card Simple
```jsx
<div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-accent transition duration-300">
  <h3 className="text-xl font-bold text-black mb-2">Título</h3>
  <p className="text-gray-600">Descripción</p>
</div>
```

#### Card con Fondo Gris
```jsx
<div className="bg-gray-50 border border-gray-200 rounded-xl p-8">
  {/* Content */}
</div>
```

### 4. Badges / Pills

```jsx
<!-- Success -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200">
  ✓ Verificado
</span>

<!-- Warning -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
  ⏳ Pendiente
</span>

<!-- Info / Neutral -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200">
  ℹ Información
</span>

<!-- Accent (Bitcoin/Blockchain) -->
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-accent border border-blue-200">
  ₿ Bitcoin
</span>
```

### 5. Modales

```jsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
    <!-- Header -->
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <h2 className="text-2xl font-bold text-black">Título Modal</h2>
      <button className="text-gray-400 hover:text-black">
        <X className="w-6 h-6" />
      </button>
    </div>
    
    <!-- Body -->
    <div className="p-6">
      {/* Content */}
    </div>
    
    <!-- Footer -->
    <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
      <button className="bg-white border-2 border-black text-black hover:bg-black hover:text-white py-2 px-6 rounded-lg">
        Cancelar
      </button>
      <button className="bg-black hover:bg-gray-800 text-white py-2 px-6 rounded-lg">
        Confirmar
      </button>
    </div>
  </div>
</div>
```

### 6. Loading States

```jsx
<button className="flex items-center justify-center bg-black text-white">
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  Cargando...
</button>
```

---

## 📝 Tipografía

### Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

### Headings

```jsx
<h1 className="text-5xl md:text-6xl font-bold text-black mb-4">
  Hero Title
</h1>

<h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
  Section Title
</h2>

<h3 className="text-3xl md:text-4xl font-bold text-black mb-3">
  Subsection
</h3>

<h4 className="text-2xl font-bold text-black mb-2">
  Card Title
</h4>

<h5 className="text-xl font-semibold text-black mb-2">
  Small Title
</h5>
```

### Body Text

```jsx
<!-- Principal -->
<p className="text-lg text-gray-700 leading-relaxed">
  Texto principal con buena legibilidad y espaciado.
</p>

<!-- Secundario -->
<p className="text-base text-gray-600">
  Texto secundario, descripciones.
</p>

<!-- Terciario / Metadatos -->
<p className="text-sm text-gray-500">
  Metadatos, helpers, timestamps.
</p>

<!-- Pequeño / Footnotes -->
<p className="text-xs text-gray-400">
  Información adicional, legal.
</p>
```

### Links

```jsx
<!-- Link con acento (importante) -->
<a href="#" className="text-accent hover:text-accent-dark font-medium underline">
  Link importante
</a>

<!-- Link principal (negro) -->
<a href="#" className="text-black hover:text-accent font-medium">
  Link estándar
</a>

<!-- Link secundario -->
<a href="#" className="text-gray-600 hover:text-black underline">
  Link secundario
</a>
```

---

## 🖼️ Layouts

### Container Principal
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Secciones con Alternancia de Fondos

```jsx
<!-- Fondo blanco -->
<section className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</section>

<!-- Fondo gris suave (alternar) -->
<section className="py-20 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</section>
```

### Header
```jsx
<header className="sticky top-0 z-50 bg-white border-b border-gray-200 backdrop-blur-lg bg-white/90">
  <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-2xl font-bold text-accent">EcoSign</span>
    </div>
    {/* Nav items */}
  </nav>
</header>
```

### Footer
```jsx
<footer className="py-16 bg-black text-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</footer>
```

---

## 🎭 Estados y Transiciones

### Hover States
```jsx
/* Botones */
hover:bg-gray-800

/* Links */
hover:text-accent

/* Cards */
hover:border-accent
hover:shadow-md

/* Iconos */
hover:scale-105
```

### Focus States
```jsx
/* Inputs */
focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent

/* Botones */
focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent
```

### Disabled States
```jsx
opacity-50 cursor-not-allowed
```

### Transiciones
```jsx
/* Estándar (mayoría de elementos) */
transition duration-300

/* Rápida (hover sutil) */
transition duration-200

/* Lenta (animaciones especiales) */
transition duration-500
```

---

## 📐 Espaciado

### Padding/Margin Interno
- `p-2` = 8px (muy pequeño)
- `p-4` = 16px (pequeño)
- `p-6` = 24px (medio - cards)
- `p-8` = 32px (grande - modales)
- `p-12` = 48px (muy grande)

### Secciones
- Vertical entre secciones: `py-20` (80px)
- Horizontal container: `px-4 sm:px-6 lg:px-8`

### Gaps (Flexbox/Grid)
- `gap-2` = 8px
- `gap-4` = 16px
- `gap-6` = 24px
- `gap-8` = 32px

---

## 🎨 Iconos

### Librería
- **Lucide React** (consistente, minimalista)

### Colores
```jsx
<!-- Estándar -->
<Icon className="w-5 h-5 text-gray-700" />

<!-- Importante / Acento -->
<Icon className="w-5 h-5 text-accent" />

<!-- Secundario -->
<Icon className="w-5 h-5 text-gray-400" />

<!-- En botones negros -->
<Icon className="w-5 h-5 text-white" />
```

### Tamaños
- `w-4 h-4` = 16px (pequeño)
- `w-5 h-5` = 20px (estándar)
- `w-6 h-6` = 24px (medio)
- `w-8 h-8` = 32px (grande)
- `w-12 h-12` = 48px (muy grande - hero)

---

## ✅ Principios de Diseño

### 1. **Minimalismo Extremo**
- Solo blanco, negro y grises como base
- Azul petróleo SOLO para acentos críticos
- Sin gradientes, sin texturas
- Diseño limpio, espaciado generoso

### 2. **Jerarquía Visual Clara**
- Títulos en negro bold
- Texto principal en gris oscuro (`text-gray-700`)
- Metadatos en gris claro (`text-gray-500`)
- Acento azul SOLO para elementos críticos

### 3. **Consistencia Total**
- Mismo estilo de botones en toda la app
- Mismos espaciados y márgenes
- Mismas transiciones (`duration-300`)
- Mismo border-radius (`rounded-lg` = 8px)

### 4. **Accesibilidad**
- Contraste mínimo 4.5:1 para texto normal
- Contraste mínimo 3:1 para texto grande
- Focus states siempre visibles
- Tamaños de click mínimo 44x44px

### 5. **Responsive First**
- Mobile-first approach
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Texto escalable: `text-base md:text-lg`

---

## 🚫 Qué Evitar

❌ **Colores múltiples** (rojo, verde, amarillo como primarios)  
❌ **Gradientes** complejos o decorativos  
❌ **Sombras excesivas** (solo `shadow-sm` o `shadow-md` si es necesario)  
❌ **Animaciones** complejas o distractoras  
❌ **Fondos** con texturas o imágenes  
❌ **Más de 2 tipografías**  
❌ **Bordes** de colores variados o decorativos  
❌ **Usar azul petróleo** indiscriminadamente  

---

## ✅ Buenas Prácticas

✓ **Usar azul petróleo (#0A66C2) SOLO para:**
  - Logo EcoSign
  - Botón "Ver cómo funciona"
  - Links críticos (no todos)
  - Hover en navegación principal
  - Focus rings
  
✓ **Mantener jerarquía** con tamaños y pesos tipográficos, no con colores

✓ **Espaciado generoso** entre elementos (respiración visual)

✓ **Transiciones suaves** de 300ms para interacciones

✓ **Responsive desde mobile-first**

✓ **Texto legible** con contraste suficiente

✓ **Cards con bordes** sutiles, no con sombras fuertes

✓ **Botones primarios en negro**, secundarios en outline

---

## 📋 Checklist de Diseño

Antes de publicar un componente, verificar:

- [ ] Solo usa blanco, negro, grises + azul petróleo como acento
- [ ] El azul petróleo está usado SOLO en elementos críticos
- [ ] Contraste de texto cumple WCAG AA (4.5:1)
- [ ] Focus states son visibles
- [ ] Transiciones son suaves (300ms)
- [ ] Espaciado es consistente con el sistema
- [ ] Responsive en mobile, tablet y desktop
- [ ] Botones tienen mínimo 44x44px de área clickeable
- [ ] Sin gradientes ni decoraciones innecesarias
- [ ] Tipografía usa Inter y escala correcta

---

**Diseñado para EcoSign - Verdad Verificable**  
*"Minimalismo que inspira confianza"*
