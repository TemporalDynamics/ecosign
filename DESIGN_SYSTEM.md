# 🎨 Sistema de Diseño EcoSign - Design System

**Versión:** 1.0.0  
**Fecha:** 2025-11-17  
**Objetivo:** Unificar toda la experiencia UI/UX con un sistema visual consistente y profesional

---

## 0. SISTEMA VISUAL GLOBAL

### 🎨 Paleta de Colores

```css
/* Variables CSS / Tailwind Config */
:root {
  /* Backgrounds */
  --bg-main: #ffffff;           /* Fondo principal de toda la app */
  --bg-soft: #f5f5f5;           /* Franjas suaves, tablas alternadas */
  
  /* Text */
  --text-main: #0f172a;         /* Negro/azul oscuro para títulos */
  --text-muted: #6b7280;        /* Gris medio para textos secundarios */
  
  /* Borders */
  --border-soft: #e5e7eb;       /* Bordes suaves */
  
  /* Accent (ÚNICO color de acento) */
  --accent: #2563eb;            /* Azul principal */
  --accent-hover: #1d4ed8;      /* Azul hover */
  --accent-soft: #dbeafe;       /* Azul suave para chips/badges */
  
  /* Status (mínimos, solo si es absolutamente necesario) */
  --success: #10b981;           /* Verde discreto para success */
  --error: #ef4444;             /* Rojo discreto para errores */
  --warning: #f59e0b;           /* Naranja discreto para warnings */
}
```

**Regla de oro:** Solo UN color de acento (--accent) y sus variantes. Sin degradados.

### 📝 Tipografía

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Jerarquía */
H1: text-3xl font-semibold (30px)
H2: text-2xl font-semibold (24px)
H3: text-lg font-semibold (18px)

/* Body */
Body Large: text-base (16px)
Body Normal: text-sm (14px)
Body Small: text-xs (12px)

/* Text Colors */
Títulos: text-main
Secundarios: text-muted

/* Line Height */
leading-relaxed para mejor legibilidad
```

### 📐 Layout

```css
/* Contenedores */
max-w-6xl mx-auto px-6

/* Espaciado vertical */
Mínimo entre secciones: py-10
Entre elementos: space-y-4 o space-y-6

/* Fondo global */
body { background: --bg-main; }
```

---

## 1. COMPONENTES BASE

### 🔘 Botones

#### Botón Primario
```jsx
<button className="
  bg-accent text-white
  px-5 py-2.5
  rounded-full
  font-medium text-sm
  hover:bg-accent-hover
  transition-colors duration-200
  shadow-sm
">
  Texto del botón
</button>
```

#### Botón Secundario
```jsx
<button className="
  border border-accent text-accent
  bg-white
  px-5 py-2.5
  rounded-full
  font-medium text-sm
  hover:bg-accent-soft
  transition-colors duration-200
">
  Texto del botón
</button>
```

#### Botón Terciario (Link)
```jsx
<button className="
  text-accent
  text-sm font-medium
  hover:underline
">
  Texto del link
</button>
```

### 📦 Cards / Paneles

```jsx
<div className="
  bg-white
  border border-border-soft
  rounded-xl
  shadow-sm
  p-6
">
  Contenido
</div>
```

### 📝 Inputs

```jsx
<input className="
  w-full
  bg-white
  border border-border-soft
  rounded-lg
  px-4 py-2.5
  text-sm
  focus:border-accent focus:ring-2 focus:ring-accent/20
  outline-none
  transition-all
" />
```

### 🏷️ Badges / Chips

```jsx
<span className="
  inline-flex items-center
  px-3 py-1
  bg-accent-soft text-accent
  rounded-full
  text-xs font-medium
">
  Badge
</span>
```

### 💬 Alerts

```jsx
<!-- Info/Nota -->
<div className="
  border-l-4 border-accent
  bg-accent-soft/30
  p-4
  rounded-r-lg
">
  <p className="text-sm text-text-main">Mensaje</p>
</div>

<!-- Error -->
<div className="
  border-l-4 border-error
  bg-error/10
  p-4
  rounded-r-lg
">
  <p className="text-sm text-text-main">Error</p>
  <p className="text-xs text-text-muted mt-1">Detalle</p>
</div>
```

---

## 2. PÁGINAS ESPECÍFICAS

### 🔐 LOGIN PAGE

**Objetivo:** Pantalla ultra limpia, sin distracciones

```jsx
<div className="min-h-screen bg-bg-main flex items-center justify-center px-6">
  {/* Card centrada */}
  <div className="w-full max-w-md">
    <div className="bg-white border border-border-soft rounded-xl shadow-sm p-8">
      
      {/* Logo/Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center">
          <LockIcon className="w-6 h-6 text-accent" />
        </div>
      </div>
      
      {/* Títulos */}
      <h1 className="text-xl font-semibold text-text-main text-center mb-2">
        EcoSign
      </h1>
      <p className="text-sm text-text-muted text-center mb-8">
        Plataforma de certificación digital con verificación transparente.
      </p>
      
      {/* Formulario */}
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            Email *
          </label>
          <input 
            type="email"
            className="w-full bg-white border border-border-soft rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
            placeholder="tu@email.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            Contraseña *
          </label>
          <input 
            type="password"
            className="w-full bg-white border border-border-soft rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
          />
        </div>
        
        <button className="w-full bg-accent text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-hover transition-colors">
          Iniciar sesión
        </button>
      </form>
      
      {/* Links */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-text-muted">
          ¿No tienes cuenta?{' '}
          <a href="/signup" className="text-accent font-medium hover:underline">
            Registrarte
          </a>
        </p>
        <p className="text-sm">
          <a href="/guest" className="text-accent hover:underline">
            Continuar como invitado
          </a>
        </p>
      </div>
    </div>
  </div>
</div>
```

**Qué se va:**
- ❌ Fondo azul claro
- ❌ Botón grande "Continuar como invitado"
- ❌ Degradados

**Qué se queda:**
- ✅ Card blanca centrada
- ✅ Formulario simple
- ✅ Links discretos

---

### 🏠 DASHBOARD

**Objetivo:** Quitar caja azul grande, mantener todo blanco y limpio

```jsx
<div className="min-h-screen bg-bg-main">
  {/* Header */}
  <header className="bg-white border-b border-border-soft">
    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-text-main">EcoSign</h1>
      <button className="text-sm text-text-muted hover:text-text-main">
        Cerrar Sesión
      </button>
    </div>
  </header>
  
  {/* Main Content */}
  <main className="max-w-6xl mx-auto px-6 py-10">
    
    {/* Bienvenida SIN CAJA AZUL */}
    <div className="mb-10">
      <h1 className="text-3xl font-semibold text-text-main mb-2">
        Hola, Manu.
      </h1>
      <p className="text-sm text-text-muted mb-6">
        Protegé tus documentos, controla cada NDA y verifica tus certificados desde un solo panel.
      </p>
      
      {/* Botones alineados */}
      <div className="flex flex-wrap gap-3">
        <button className="bg-accent text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-hover">
          + Certificar documento
        </button>
        <button className="border border-accent text-accent bg-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-soft">
          Verificar documento
        </button>
      </div>
    </div>
    
    {/* KPIs - 4 cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
      {/* Card KPI */}
      <div className="bg-white border border-border-soft rounded-xl p-4">
        <p className="text-xs text-text-muted mb-1">Documentos verificados</p>
        <p className="text-2xl font-semibold text-text-main">0</p>
        <p className="text-xs text-text-muted mt-1">Total guardados</p>
      </div>
      
      {/* Repetir para: Firmados legalmente, Sellos de tiempo legales, Verificaciones públicas */}
    </div>
    
    {/* Panel de Verificaciones */}
    <section className="mb-10">
      <h2 className="text-2xl font-semibold text-text-main mb-4">
        Estado de tus verificaciones
      </h2>
      
      {/* Error (si existe) */}
      <div className="border-l-4 border-error bg-error/10 p-4 rounded-r-lg mb-6">
        <p className="text-sm font-medium text-text-main">Error al cargar documentos</p>
        <p className="text-xs text-text-muted mt-1">
          Could not find the table 'public.user_documents' in the schema cache
        </p>
      </div>
      
      {/* Tabla (cuando haya datos) */}
      <div className="bg-white border border-border-soft rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-soft">
            <tr>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Documento</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Estado</th>
              <th className="text-left text-xs font-medium text-text-muted px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {/* Filas aquí */}
          </tbody>
        </table>
      </div>
    </section>
    
    {/* Actividad Reciente */}
    <section>
      <h2 className="text-2xl font-semibold text-text-main mb-4">
        Actividad Reciente
      </h2>
      
      <div className="bg-white border border-border-soft rounded-xl divide-y divide-border-soft">
        {/* Item */}
        <div className="px-4 py-3 hover:bg-bg-soft transition-colors">
          <p className="text-xs text-accent mb-1">Hoy, 10:30 AM</p>
          <p className="text-sm text-text-main">
            Documento "Proyecto Alpha" firmado por juan@empresa.com
          </p>
        </div>
        {/* Más items... */}
      </div>
    </section>
    
  </main>
</div>
```

**Cambios clave:**
- ❌ ELIMINAR caja azul grande de bienvenida
- ✅ Título + subtexto + botones en fondo blanco
- ✅ KPIs en cards blancas con borde suave
- ✅ Alert de error con borde izquierdo accent/error

---

### 📝 MODAL "CERTIFICAR DOCUMENTO"

**Objetivo:** Modal blanco, stepper minimal, sin colores de fondo grandes

```jsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    
    {/* Header */}
    <div className="px-6 py-5 border-b border-border-soft">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-text-main">
          Certificar documento
        </h2>
        <button className="text-text-muted hover:text-text-main">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-text-muted">
        4 pasos sencillos para generar tu archivo .ECO.
      </p>
    </div>
    
    {/* Stepper Minimal */}
    <div className="px-6 py-5 border-b border-border-soft">
      <div className="flex items-center justify-between">
        {/* Paso 1 - Activo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-medium">
            1
          </div>
          <span className="text-sm font-medium text-accent">Subir documento</span>
        </div>
        
        <div className="flex-1 h-px bg-border-soft mx-3"></div>
        
        {/* Paso 2 - Inactivo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-border-soft text-text-muted flex items-center justify-center text-sm">
            2
          </div>
          <span className="text-sm text-text-muted">Firma legal</span>
        </div>
        
        {/* Repetir para pasos 3 y 4... */}
      </div>
    </div>
    
    {/* Body - Paso 1: Subir documento */}
    <div className="px-6 py-6">
      <div className="border-2 border-dashed border-border-soft rounded-xl py-12 text-center hover:border-accent transition-colors cursor-pointer">
        <FileIcon className="w-12 h-12 text-accent mx-auto mb-3" />
        <p className="text-sm font-medium text-text-main mb-1">
          Arrastrá tu documento o hacé clic para elegirlo
        </p>
        <p className="text-xs text-text-muted">
          PDF, Word, Excel, etc. (Máx 10MB)
        </p>
      </div>
    </div>
    
    {/* Footer */}
    <div className="px-6 py-4 border-t border-border-soft flex justify-end gap-3">
      <button className="border border-border-soft text-text-main bg-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-bg-soft">
        Cancelar
      </button>
      <button className="bg-accent text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-hover">
        Siguiente
      </button>
    </div>
    
  </div>
</div>
```

#### PASO 2: Firma Legal (SIN CAJA AZUL GRANDE)

```jsx
<div className="px-6 py-6 space-y-6">
  
  {/* Documento listo */}
  <div className="bg-bg-soft rounded-lg p-4 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-text-main">Documento listo</p>
      <p className="text-xs text-text-muted">thor-firmado.pdf</p>
      <p className="text-xs text-text-muted">285.81 KB</p>
    </div>
    <CheckCircle className="w-6 h-6 text-success" />
  </div>
  
  {/* Bloque de firma (sin caja azul gigante) */}
  <div>
    <h3 className="text-sm font-medium text-text-main mb-2">
      Firma legal (recomendada)
    </h3>
    <p className="text-xs text-text-muted mb-4">
      Usamos proveedores alineados con marcos como eIDAS, ESIGN y UETA para que la firma tenga validez legal internacional.
    </p>
    
    {/* Firma + Preview en 2 columnas */}
    <div className="grid grid-cols-2 gap-4">
      
      {/* Columna 1: Cuadro de firma */}
      <div className="border border-border-soft rounded-lg p-4">
        <p className="text-xs text-text-muted mb-3">1. FIRMA AUTÓGRAFA</p>
        <div className="border-b-2 border-text-main h-20 flex items-end pb-2">
          {/* Firma canvas o imagen */}
          <span className="text-2xl font-signature">Manu</span>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Podés redibujarla cuando quieras.
        </p>
        <button className="text-xs text-accent mt-2 hover:underline">
          🧹 Limpiar
        </button>
      </div>
      
      {/* Columna 2: Preview del PDF */}
      <div className="border border-border-soft rounded-lg p-4">
        <p className="text-xs text-text-muted mb-2">2. POSICIÓN EN EL DOCUMENTO</p>
        <div className="bg-bg-soft rounded h-40 flex items-center justify-center">
          <p className="text-xs text-text-muted">Vista previa del PDF</p>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Arrastrá la firma sobre el documento y ajustá el tamaño con la esquina inferior derecha.
        </p>
      </div>
      
    </div>
    
    {/* Inputs adicionales */}
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div>
        <label className="block text-xs font-medium text-text-main mb-2">
          Título del documento
        </label>
        <input className="w-full bg-white border border-border-soft rounded-lg px-3 py-2 text-sm" value="thor.pdf" />
      </div>
      <div>
        <label className="block text-xs font-medium text-text-main mb-2">
          Nombre del firmante
        </label>
        <input className="w-full bg-white border border-border-soft rounded-lg px-3 py-2 text-sm" value="María López" />
      </div>
    </div>
    <div className="mt-4">
      <label className="block text-xs font-medium text-text-main mb-2">
        Email del firmante *
      </label>
      <input type="email" className="w-full bg-white border border-border-soft rounded-lg px-3 py-2 text-sm" placeholder="firma@empresa.com" />
    </div>
    
    {/* Botón primario */}
    <button className="w-full bg-accent text-white px-5 py-3 rounded-full font-medium text-sm hover:bg-accent-hover mt-6">
      Firmar con SignNow
    </button>

    {/* Micro-copy tranquilizador */}
    <div className="text-xs text-text-muted text-center mt-3">
      Al firmar, recibirás el documento firmado y tu constancia digital por email. Solo vos decidís con quién compartirlos.
    </div>

    {/* Link alternativo */}
    <button className="w-full text-sm text-accent hover:underline mt-3">
      Continuar solo con verificación (sin firma legal)
    </button>
  </div>

</div>
```

#### PASO 3: Sellar Evidencia (SIN CARDS DE COLORES)

```jsx
<div className="px-6 py-6 space-y-4">
  
  <p className="text-sm text-text-muted mb-4">
    Elegí cómo querés sellar tu documento:
  </p>
  
  {/* Opción 1: Sello de tiempo */}
  <div className="border border-border-soft rounded-lg px-4 py-3 flex items-center justify-between hover:border-accent transition-colors">
    <div className="flex-1">
      <p className="text-sm font-medium text-text-main mb-1">
        🕐 Sello de tiempo con validez legal
      </p>
      <p className="text-xs text-text-muted">
        Sella la hora exacta en un servidor auditado.
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked className="sr-only peer" />
      <div className="w-11 h-6 bg-accent rounded-full peer-focus:ring-2 peer-focus:ring-accent/20"></div>
    </label>
  </div>
  
  {/* Opción 2: Verificación pública */}
  <div className="border border-border-soft rounded-lg px-4 py-3 flex items-center justify-between hover:border-accent transition-colors">
    <div className="flex-1">
      <p className="text-sm font-medium text-text-main mb-1">
        🔗 Verificación pública
      </p>
      <p className="text-xs text-text-muted">
        Huella digital registrada en registro público.
      </p>
      <p className="text-xs text-warning mt-1">
        ⏱️ Proceso: 4-24 horas • Recibirás email cuando esté confirmado.
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked className="sr-only peer" />
      <div className="w-11 h-6 bg-accent rounded-full peer-focus:ring-2 peer-focus:ring-accent/20"></div>
    </label>
  </div>
  
  {/* Opción 3: VerifyTracker */}
  <div className="border border-border-soft rounded-lg px-4 py-3 flex items-center justify-between hover:border-accent transition-colors">
    <div className="flex-1">
      <p className="text-sm font-medium text-text-main mb-1">
        📊 VerifyTracker (opcional)
      </p>
      <p className="text-xs text-text-muted">
        Rastrea quién accede y cuándo.
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" />
      <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-accent peer-focus:ring-2 peer-focus:ring-accent/20"></div>
    </label>
  </div>
  
  {/* Botón final */}
  <button className="w-full bg-accent text-white px-5 py-3 rounded-full font-medium text-sm hover:bg-accent-hover mt-6">
    Generar archivo .ECO
  </button>
  
</div>
```

**Cambios clave en modal:**
- ❌ Eliminar cajas de colores grandes (azul, verde, naranja)
- ✅ Cards blancas con borde suave
- ✅ Switches en --accent
- ✅ Hover sutil con border-accent

---

### ✅ MODAL "VERIFICAR DOCUMENTO"

```jsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
    
    {/* Header */}
    <div className="px-6 py-5 border-b border-border-soft">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-text-main">
          Verificar documento
        </h2>
        <button className="text-text-muted hover:text-text-main">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-text-muted">
        Comprobá si un documento coincide con su archivo .ECO.
      </p>
    </div>
    
    {/* Body */}
    <div className="px-6 py-6 space-y-4">
      
      {/* Input 1 */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-2">
          Documento firmado (PDF u otro)
        </label>
        <div className="border-2 border-dashed border-border-soft rounded-lg py-8 text-center hover:border-accent transition-colors cursor-pointer">
          <FileIcon className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-sm text-text-muted">Arrastrá o hacé clic</p>
        </div>
      </div>
      
      {/* Input 2 */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-2">
          Archivo .ECO
        </label>
        <div className="border-2 border-dashed border-border-soft rounded-lg py-8 text-center hover:border-accent transition-colors cursor-pointer">
          <FileIcon className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-sm text-text-muted">Arrastrá o hacé clic</p>
        </div>
      </div>
      
      {/* Botón */}
      <button className="w-full bg-accent text-white px-5 py-3 rounded-full font-medium text-sm hover:bg-accent-hover">
        Verificar coincidencia
      </button>
      
      {/* Resultado (cuando exista) */}
      {/* SUCCESS */}
      <div className="border-l-4 border-success bg-success/10 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-main">Coincide</p>
            <p className="text-xs text-text-muted mt-1">
              Este documento es idéntico al que se verificó con este archivo .ECO.
            </p>
          </div>
        </div>
      </div>
      
      {/* ERROR */}
      <div className="border-l-4 border-error bg-error/10 p-4 rounded-r-lg">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-main">No coincide</p>
            <p className="text-xs text-text-muted mt-1">
              El documento no es igual al que se verificó con este archivo .ECO.
            </p>
          </div>
        </div>
      </div>
      
    </div>
    
  </div>
</div>
```

---

## 3. LANDING PAGE - UNIFICADA

### 🎯 Hero

```jsx
<section className="bg-bg-main py-20">
  <div className="max-w-4xl mx-auto text-center px-6">
    
    <h1 className="text-4xl md:text-5xl font-semibold text-text-main mb-6 leading-tight">
      Tu trabajo merece una verdad que nadie pueda cuestionar.
    </h1>
    
    <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto">
      Certificá tus documentos sin exponer el contenido. Firmá una sola vez y obtené evidencia verificable para siempre.
    </p>
    
    <div className="flex flex-wrap justify-center gap-4">
      <button className="bg-accent text-white px-6 py-3 rounded-full font-medium hover:bg-accent-hover">
        Comenzar gratis
      </button>
      <button className="text-accent font-medium hover:underline">
        Cómo funciona →
      </button>
    </div>
    
  </div>
</section>
```

### 📋 Sección: Protegé tus documentos

```jsx
<section className="bg-bg-main py-16">
  <div className="max-w-6xl mx-auto px-6">
    
    <h2 className="text-3xl font-semibold text-text-main text-center mb-4">
      Protegé tus documentos con el formato .ECO
    </h2>
    
    <p className="text-text-muted text-center max-w-2xl mx-auto mb-12">
      Un contenedor portable que prueba cuándo, quién y qué se certificó, sin exponer tu contenido.
    </p>
    
    {/* Grid de features */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Feature 1 */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
          <ShieldIcon className="w-6 h-6 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Privacidad total
        </h3>
        <p className="text-sm text-text-muted">
          Solo la huella digital se registra públicamente. Tu contenido nunca se expone.
        </p>
      </div>
      
      {/* Feature 2 */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-6 h-6 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Sello de tiempo legal
        </h3>
        <p className="text-sm text-text-muted">
          Certificación que prueba la hora exacta de creación.
        </p>
      </div>
      
      {/* Feature 3 */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
          <LinkIcon className="w-6 h-6 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Verificación pública
        </h3>
        <p className="text-sm text-text-muted">
          Huella digital inmutable en redes públicas.
        </p>
      </div>
      
    </div>
    
  </div>
</section>
```

### 🔢 Sección: 4 Pasos

```jsx
<section className="bg-bg-soft py-16">
  <div className="max-w-6xl mx-auto px-6">
    
    <h2 className="text-3xl font-semibold text-text-main text-center mb-12">
      Certificá en 4 pasos
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      
      {/* Paso 1 */}
      <div className="bg-white border border-border-soft rounded-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center mx-auto mb-4 font-semibold">
          1
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Elegís tu archivo
        </h3>
        <p className="text-sm text-text-muted">
          PDF, Word, Excel, imágenes, código. Cualquier formato.
        </p>
      </div>
      
      {/* Paso 2 */}
      <div className="bg-white border border-border-soft rounded-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center mx-auto mb-4 font-semibold">
          2
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Firmás en un solo paso
        </h3>
        <p className="text-sm text-text-muted">
          Firma legal con proveedores eIDAS/ESIGN o solo verificación.
        </p>
      </div>
      
      {/* Paso 3 */}
      <div className="bg-white border border-border-soft rounded-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center mx-auto mb-4 font-semibold">
          3
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Sellás tu evidencia
        </h3>
        <p className="text-sm text-text-muted">
          Sello de tiempo + verificación pública + tracking opcional.
        </p>
      </div>
      
      {/* Paso 4 */}
      <div className="bg-white border border-border-soft rounded-xl p-6 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center mx-auto mb-4 font-semibold">
          4
        </div>
        <h3 className="text-lg font-semibold text-text-main mb-2">
          Guardás tus dos archivos
        </h3>
        <p className="text-sm text-text-muted">
          Original + .ECO. Verificables en cualquier momento.
        </p>
      </div>
      
    </div>
    
  </div>
</section>
```

### 📖 Sección: Cómo lo hacemos (puntos 3-7)

```jsx
<section className="bg-bg-main py-16">
  <div className="max-w-4xl mx-auto px-6">
    
    <h2 className="text-3xl font-semibold text-text-main text-center mb-12">
      Cómo lo hacemos
    </h2>
    
    <div className="space-y-12">
      
      {/* Punto 3 */}
      <div className="flex gap-6">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold">3</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-main mb-3">
            Generamos tu huella digital única
          </h3>
          <p className="text-text-muted mb-4">
            Calculamos la huella digital de tu archivo. Esta identidad digital es única e irrepetible: si cambiás un solo píxel, la huella cambia completamente.
          </p>
          <div className="border-l-4 border-accent bg-accent-soft/30 p-4 rounded-r-lg">
            <p className="text-sm text-text-main">
              La huella digital es como tu huella: identifica el archivo sin revelar su contenido.
            </p>
          </div>
        </div>
      </div>
      
      {/* Punto 4 */}
      <div className="flex gap-6">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold">4</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-main mb-3">
            Múltiples firmas, en orden y sin fricción
          </h3>
          <p className="text-text-muted mb-4">
            ¿Necesitás que varias personas firmen el mismo documento? También podés hacerlo. Cargás los correos en el orden que necesites.
          </p>
          <div className="border-l-4 border-accent bg-accent-soft/30 p-4 rounded-r-lg">
            <p className="text-sm text-text-main">
              Cuando A firma → el sistema envía el documento firmado a B → luego a C → y así sucesivamente.
            </p>
          </div>
        </div>
      </div>

      {/* Punto 5 */}
      <div className="flex gap-6">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold">5</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-main mb-3">
            Sellamos el sello de tiempo
          </h3>
          <p className="text-text-muted mb-4">
            Consultamos un servidor certificado de autoridad de fechas. Esto prueba que tu archivo existía en ese momento exacto.
          </p>
          <div className="border-l-4 border-accent bg-accent-soft/30 p-4 rounded-r-lg">
            <p className="text-sm text-text-main">
              El sello de tiempo es legalmente válido en más de 100 países bajo convenios internacionales.
            </p>
          </div>
        </div>
      </div>

      {/* Punto 6 */}
      <div className="flex gap-6">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold">6</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-main mb-3">
            Guardamos tu .ECO original en tu nube
          </h3>
          <p className="text-text-muted mb-4">
            Tu documento original y tu .ECO quedan almacenados inalterados en tu espacio seguro dentro de EcoSign.
          </p>
          <div className="border-l-4 border-accent bg-accent-soft/30 p-4 rounded-r-lg">
            <p className="text-sm text-text-main font-medium mb-1">
              ¿Qué pasa si alguien modifica los archivos?
            </p>
            <p className="text-sm text-text-main">
              Si alguien los manipula fuera de aquí, el archivo .ECO deja en evidencia la diferencia. La huella original no coincidirá.
            </p>
          </div>
        </div>
      </div>

      {/* Punto 7 */}
      <div className="flex gap-6">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold">7</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-main mb-3">
            Verificación pública (opcional)
          </h3>
          <p className="text-text-muted mb-4">
            Registramos tu huella digital en redes públicas. Una vez registrada, es permanente e imposible de alterar.
          </p>
          <div className="border-l-4 border-accent bg-accent-soft/30 p-4 rounded-r-lg">
            <p className="text-sm text-text-main">
              La verificación pública tarda 4-24 horas. Te avisamos por email cuando esté confirmada. Podés verificarlo en exploradores públicos.
            </p>
          </div>
        </div>
      </div>
      
      {/* Punto 7 */}
      <div className="flex gap-6">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-semibold">7</span>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-main mb-3">
            Podés verificarlo siempre
          </h3>
          <p className="text-text-muted mb-4">
            Subís el .ECO + el archivo original a nuestro verificador. Si coinciden, ves un resultado VERDE. Si no, ROJO.
          </p>
          <div className="border-l-4 border-accent bg-accent-soft/30 p-4 rounded-r-lg">
            <p className="text-sm text-text-main">
              La verificación es gratuita y pública. No necesitás cuenta para verificar un .ECO.
            </p>
          </div>
        </div>
      </div>
      
    </div>
    
  </div>
</section>
```

**Cambios clave en landing:**
- ❌ Eliminar fondos oscuros/grises
- ❌ Eliminar cajas de colores grandes
- ✅ Todo en blanco con secciones alternadas bg-bg-soft
- ✅ Notas/recuadros con borde izquierdo accent
- ✅ Iconos en círculos accent-soft

---

## 4. CHECKLIST DE IMPLEMENTACIÓN

### Paso 1: Configurar variables globales

```css
/* tailwind.config.js o globals.css */
:root {
  --bg-main: #ffffff;
  --bg-soft: #f5f5f5;
  --text-main: #0f172a;
  --text-muted: #6b7280;
  --border-soft: #e5e7eb;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --accent-soft: #dbeafe;
  --success: #10b981;
  --error: #ef4444;
  --warning: #f59e0b;
}
```

### Paso 2: Crear componentes base

```bash
client/src/components/ui/
├── Button.jsx          # Primario, secundario, terciario
├── Card.jsx            # Card base
├── Input.jsx           # Input base
├── Badge.jsx           # Chips/badges
├── Alert.jsx           # Alerts (info, error, warning)
└── Modal.jsx           # Modal base
```

### Paso 3: Actualizar páginas en orden

1. ✅ LoginPage
2. ✅ Dashboard
3. ✅ Modal CertificarDocumento (3 pasos)
4. ✅ Modal VerificarDocumento
5. ✅ Landing (Hero + 4 pasos + Cómo lo hacemos)

### Paso 4: Testing visual

- [ ] Login responsive (mobile + desktop)
- [ ] Dashboard sin caja azul
- [ ] Modal stepper sin colores grandes
- [ ] Landing toda blanca
- [ ] Hover states funcionan
- [ ] Focus states en inputs

---

## 5. ANTI-PATTERNS A EVITAR

### ❌ NO HACER:

1. **Degradados**
   ```css
   /* MAL */
   background: linear-gradient(to right, #3b82f6, #2563eb);
   ```

2. **Múltiples colores de acento**
   ```css
   /* MAL */
   --accent-orange: #f97316;
   --accent-green: #10b981;
   ```

3. **Cajas grandes de colores**
   ```jsx
   {/* MAL */}
   <div className="bg-blue-500 p-10">
     <h1 className="text-white">Bienvenido</h1>
   </div>
   ```

4. **Bordes de colores saturados**
   ```css
   /* MAL */
   border: 3px solid #3b82f6;
   ```

### ✅ SÍ HACER:

1. **Un solo acento**
   ```css
   /* BIEN */
   --accent: #2563eb;
   color: var(--accent);
   ```

2. **Fondos blancos con bordes suaves**
   ```jsx
   {/* BIEN */}
   <div className="bg-white border border-border-soft rounded-xl p-6">
     <h2 className="text-text-main">Título</h2>
   </div>
   ```

3. **Alerts con borde izquierdo**
   ```jsx
   {/* BIEN */}
   <div className="border-l-4 border-accent bg-accent-soft/30 p-4">
     <p className="text-sm text-text-main">Nota importante</p>
   </div>
   ```

---

## 6. GUÍA DE MIGRACIÓN RÁPIDA

### Antes → Después

```jsx
// ❌ ANTES (Dashboard con caja azul)
<div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 rounded-lg">
  <h1 className="text-white text-2xl">Bienvenido a EcoSign</h1>
  <p className="text-white/80">Sellá tus documentos...</p>
  <button className="bg-white text-blue-600 px-6 py-3 rounded-lg">
    + Certificar documento
  </button>
</div>

// ✅ DESPUÉS (Limpio, sin caja de color)
<div className="mb-10">
  <h1 className="text-3xl font-semibold text-text-main mb-2">
    Hola, Manu.
  </h1>
  <p className="text-sm text-text-muted mb-6">
    Protegé tus documentos, controla cada NDA y verifica tus verificaciones.
  </p>
  <div className="flex gap-3">
    <button className="bg-accent text-white px-5 py-2.5 rounded-full hover:bg-accent-hover">
      + Certificar documento
    </button>
  </div>
</div>
```

---

## 7. RECURSOS

### Iconos (Lucide React)
```bash
npm install lucide-react
```

```jsx
import { 
  Lock, Shield, Clock, Link2, FileText, 
  CheckCircle, XCircle, AlertTriangle,
  ChevronRight, X
} from 'lucide-react';
```

### Fuentes (Inter)
```html
<!-- En index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 8. TIMELINE DE IMPLEMENTACIÓN

### Día 1 (4 horas)
- ✅ Configurar variables CSS
- ✅ Crear componentes UI base
- ✅ Migrar LoginPage
- ✅ Migrar Dashboard (header + KPIs)

### Día 2 (4 horas)
- ✅ Modal CertificarDocumento (Paso 1 y 2)
- ✅ Modal CertificarDocumento (Paso 3)
- ✅ Modal VerificarDocumento

### Día 3 (4 horas)
- ✅ Landing Hero + Features
- ✅ Landing 4 Pasos
- ✅ Landing Cómo lo hacemos

### Día 4 (2 horas)
- ✅ Testing responsive
- ✅ Ajustes finales
- ✅ Deploy

**Total:** ~14 horas de trabajo

---

## 🎯 RESULTADO ESPERADO

Al finalizar, EcoSign tendrá:

✅ **Consistencia visual 100%**
- Un solo color de acento (azul #2563eb)
- Tipografía uniforme
- Espaciado predecible

✅ **UX limpia y profesional**
- Sin cajas de colores grandes
- Sin degradados
- Todo blanco con acentos mínimos

✅ **Componentes reutilizables**
- Botones, cards, inputs, alerts estandarizados
- Fácil de mantener y escalar

✅ **Experiencia coherente**
- Login → Dashboard → Modales → Landing
- Mismo look & feel en todas las pantallas

---

## 8. EXPERIENCIA PARTY B - FIRMA TRANSPARENTE

### 🛡️ "Acuerdo de Transparencia" Modal (Antes de firmar)

**Objetivo:** Informar al firmante sobre la generación de su certificado .ECO privado antes de firmar

```jsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

    {/* Header */}
    <div className="flex items-start gap-3 mb-4">
      <Shield className="w-6 h-6 text-accent mt-1" />
      <div>
        <h2 className="text-lg font-semibold text-text-main mb-2">
          Antes de firmar
        </h2>
        <p className="text-sm text-text-muted">
          Para protegerte, EcoSign generará una copia firmada del documento y una constancia digital que te enviaremos a tu correo.
        </p>
      </div>
    </div>

    {/* Content */}
    <div className="bg-bg-soft rounded-lg p-4 mb-6">
      <p className="text-sm font-medium text-text-main mb-2">Esto significa que:</p>
      <ul className="text-sm text-text-muted space-y-2">
        <li className="flex items-start gap-2">
          <span className="text-accent mt-1 flex-shrink-0">•</span>
          <span>Tu documento no se almacena públicamente.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-accent mt-1 flex-shrink-0">•</span>
          <span>Tu firma se usa solo para este documento.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-accent mt-1 flex-shrink-0">•</span>
          <span>Recibís una constancia digital para que puedas demostrar lo que firmaste.</span>
        </li>
      </ul>
    </div>

    {/* Footer */}
    <div className="flex justify-end gap-3">
      <button className="border border-border-soft text-text-main bg-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-bg-soft">
        Cancelar
      </button>
      <button className="bg-accent text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-hover">
        Continuar
      </button>
    </div>

  </div>
</div>
```

### ✍️ Modal de Firma con Copy Tranquilizador

**Objetivo:** Incluir micro-copy tranquilizador en el modal de firma

```jsx
{/* Micro-copy tranquilizador en el modal de firma */}
<div className="text-xs text-text-muted text-center mt-4">
  Al firmar, recibirás el documento firmado y tu constancia digital por email. Solo vos decidís con quién compartirlos.
</div>
```

### ✅ Pantalla de Éxito para Party B

**Objetivo:** Confirmar al firmante que su firma fue exitosa y qué recibirá

```jsx
<div className="min-h-screen bg-bg-main flex items-center justify-center px-6">
  <div className="w-full max-w-md">
    <div className="bg-white border border-border-soft rounded-xl shadow-sm p-8 text-center">

      {/* Success Icon */}
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>

      <h1 className="text-xl font-semibold text-text-main mb-4">
        ¡Firma realizada con éxito!
      </h1>

      <p className="text-sm text-text-muted mb-6">
        Ya enviamos a tu email:
      </p>

      <div className="text-left space-y-3 mb-8">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
          <span className="text-sm text-text-main">El documento firmado</span>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
          <span className="text-sm text-text-main">Tu constancia digital (archivo .ECO)</span>
        </div>
      </div>

      <p className="text-xs text-text-muted mb-6">
        Podés cerrar esta ventana.
        <br />
        Si necesitás algo, buscá el email en tu bandeja.
      </p>

      <button className="w-full bg-accent text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-accent-hover">
        Cerrar
      </button>
    </div>
  </div>
</div>
```

### ✉️ Email Template para Party B

**Objetivo:** Email que recibe el firmante con su documento firmado y constancia digital

```html
Asunto: Tu documento firmado y tu constancia digital

Cuerpo:

Hola [Nombre],

Ya firmaste el documento [nombre].

Adjuntamos:
✔ Tu copia firmada
✔ Tu constancia digital (.ECO), que sirve como comprobante para demostrar qué versión del documento aceptaste.

Nadie puede ver tus archivos desde EcoSign.
Solo vos decidís con quién compartirlos.

Gracias,
EcoSign
```

---

**Preparado por:** GitHub Copilot CLI
**Fecha:** 2025-11-17
**Status:** ✅ LISTO PARA IMPLEMENTAR

**¡A unificar la experiencia!** 🎨✨
