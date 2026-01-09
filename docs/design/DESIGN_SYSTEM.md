# VerifySign Design System
**Sistema de diseño unificado aplicando los 20 Mandamientos**

---

## 0. PRINCIPIOS FUNDAMENTALES

### Espíritu VerifySign
- **Humano**: Hablamos como personas, no como máquinas
- **Simple**: Sin tecnicismos, sin jerga, sin pasos innecesarios
- **Cálido**: Cercano, amable, sin frialdad corporativa
- **Claro**: Directo al punto, sin ambigüedades
- **Minimalista**: Solo lo necesario, nada más
- **Confiable**: Sin exageraciones, sin promesas vacías
- **Sin miedo**: Nunca generamos sospecha ni presión

---

## 1. SISTEMA VISUAL GLOBAL

### Colores

```css
/* Variables de color */
--bg-main: #ffffff        /* Fondo principal - blanco puro */
--bg-soft: #f5f5f5        /* Fondos suaves de secciones */
--text-main: #0f172a      /* Texto principal - casi negro */
--text-muted: #6b7280     /* Texto secundario - gris medio */
--border-soft: #e5e7eb    /* Bordes suaves */
--accent: #2563eb         /* Azul - único color de acento */
--accent-hover: #1d4ed8   /* Azul más oscuro para hover */
--accent-soft: #dbeafe    /* Azul muy suave para badges */
```

**Reglas:**
- Solo UN color de acento: azul
- NO usar: rojo fuerte, amarillo fuerte, verde neón, naranja violento
- NO usar fondos oscuros con texto negro
- NO usar degradados

### Tipografía

**Fuente**: Inter o Roboto (consistente en toda la app)

```css
/* Títulos */
H1: text-3xl font-semibold text-main
H2: text-2xl font-semibold text-main
H3: text-lg font-semibold text-main

/* Textos */
Body principal: text-base text-main leading-relaxed
Body secundario: text-sm text-muted leading-relaxed
Texto pequeño: text-xs text-muted
```

### Layout

```css
/* Contenedores */
max-w-6xl mx-auto px-6

/* Espaciados */
Secciones: py-10 o py-16
Entre elementos: space-y-4 o space-y-6
Cards: p-4 o p-6
```

---

## 2. COMPONENTES BASE

### Botones

**Primario**
```jsx
<button className="bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5 font-medium transition-colors">
  Texto del botón
</button>
```

**Secundario**
```jsx
<button className="border border-accent text-accent hover:bg-accent-soft rounded-lg px-5 py-2.5 font-medium transition-colors">
  Texto del botón
</button>
```

**Link simple**
```jsx
<a className="text-accent hover:text-accent-hover text-sm font-medium">
  Texto del link
</a>
```

### Cards

```jsx
<div className="bg-white border border-soft rounded-xl shadow-sm p-6">
  {/* contenido */}
</div>
```

### Inputs

```jsx
<input 
  className="w-full bg-white border border-soft rounded-lg px-4 py-2.5 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
  type="text"
/>
```

### Alerts / Mensajes

```jsx
<!-- Info (azul suave) -->
<div className="bg-accent-soft border-l-4 border-accent rounded-lg p-4">
  <p className="text-sm text-main">Mensaje informativo</p>
</div>

<!-- Error (NO rojo fuerte, usar texto oscuro) -->
<div className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-4">
  <p className="text-sm text-main font-medium">Algo no salió bien</p>
  <p className="text-xs text-muted mt-1">Descripción del problema</p>
</div>
```

---

## 3. PANTALLAS PRINCIPALES

### LOGIN

**Layout:**
- Fondo: `bg-main` (blanco)
- Contenedor centrado: `max-w-md mx-auto mt-16`

**Estructura:**
```jsx
<div className="max-w-md mx-auto mt-16">
  {/* Logo/Icono */}
  <div className="flex justify-center mb-6">
    <Shield className="w-12 h-12 text-accent" />
  </div>
  
  {/* Título */}
  <h1 className="text-xl font-semibold text-main text-center">
    VerifySign
  </h1>
  
  {/* Subtítulo */}
  <p className="text-sm text-muted text-center mt-2 mb-8">
    Plataforma de certificación digital con trazabilidad forense
  </p>
  
  {/* Card del formulario */}
  <div className="bg-white border border-soft rounded-xl shadow-sm p-6">
    {/* Email input */}
    {/* Password input */}
    {/* Botón primario: "Iniciar sesión" */}
    {/* Link: "Registrarte" */}
  </div>
  
  {/* Continuar como invitado - link simple, NO botón */}
  <p className="text-center mt-4">
    <a href="/guest" className="text-accent text-sm">
      Continuar como invitado
    </a>
  </p>
</div>
```

**❌ PROHIBIDO:**
- Cajas azules con fondo de color
- Degradados
- Múltiples botones grandes
- Textos técnicos

---

### DASHBOARD

#### Header

```jsx
<div className="bg-main border-b border-soft">
  <div className="max-w-6xl mx-auto px-6 py-6">
    {/* Título */}
    <h1 className="text-3xl font-semibold text-main">
      Hola, {userName}
    </h1>
    
    {/* Subtítulo */}
    <p className="text-sm text-muted mt-2">
      Sellá tus documentos, controla cada NDA y verifica tus certificados desde un solo panel
    </p>
    
    {/* Botones de acción */}
    <div className="flex gap-3 mt-6">
      <button className="bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5">
        + Certificar documento
      </button>
      <button className="border border-accent text-accent hover:bg-accent-soft rounded-lg px-5 py-2.5">
        Verificar documento
      </button>
    </div>
  </div>
</div>
```

**❌ PROHIBIDO:**
- Fondo azul detrás de botones
- Cajas de color saturado
- Textos técnicos como "procesar", "subir", "guardar en nuestros servidores"

#### KPIs (contadores)

```jsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
  {/* Card KPI */}
  <div className="bg-white border border-soft rounded-xl p-4">
    <p className="text-xs text-muted">Documentos certificados</p>
    <p className="text-2xl font-semibold text-main mt-1">12</p>
  </div>
  {/* Repetir para otros KPIs */}
</div>
```

#### Panel de certificaciones

```jsx
<div className="mt-10">
  <h2 className="text-2xl font-semibold text-main mb-6">
    Estado de tus certificaciones
  </h2>
  
  {/* Tabla simple con fondo blanco */}
  <div className="bg-white border border-soft rounded-xl overflow-hidden">
    <table className="w-full">
      {/* ... */}
    </table>
  </div>
</div>
```

**Manejo de errores:**
```jsx
<div className="bg-gray-50 border-l-4 border-gray-400 rounded-lg p-4">
  <p className="text-sm text-main font-medium">
    No pudimos cargar tus documentos
  </p>
  <p className="text-xs text-muted mt-1">
    Intentá nuevamente en unos segundos
  </p>
</div>
```

---

### MODAL: CERTIFICAR DOCUMENTO

**Layout:**
- Overlay: `bg-black/40`
- Modal: `max-w-2xl w-full bg-white rounded-2xl shadow-xl p-6`

#### Header del modal

```jsx
<div className="border-b border-soft pb-4 mb-6">
  <h2 className="text-xl font-semibold text-main">
    Certificar documento
  </h2>
  <p className="text-sm text-muted mt-1">
    3 pasos sencillos para generar tu certificado .ECO
  </p>
</div>
```

#### Stepper (3 pasos - SIN paso técnico de "Sellar evidencia")

```jsx
<div className="flex items-center justify-between mb-8">
  {/* Paso 1: Activo */}
  <div className="flex items-center">
    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
      1
    </div>
    <span className="ml-2 text-sm font-medium text-accent">
      Elegí tu archivo
    </span>
  </div>
  
  {/* Línea conectora */}
  <div className="flex-1 h-px bg-border-soft mx-4"></div>
  
  {/* Paso 2: Pendiente */}
  <div className="flex items-center">
    <div className="w-8 h-8 rounded-full border-2 border-soft text-muted flex items-center justify-center text-sm">
      2
    </div>
    <span className="ml-2 text-sm text-muted">
      Firmá
    </span>
  </div>
  
  {/* Línea conectora */}
  <div className="flex-1 h-px bg-border-soft mx-4"></div>
  
  {/* Paso 3: Pendiente */}
  <div className="flex items-center">
    <div className="w-8 h-8 rounded-full border-2 border-soft text-muted flex items-center justify-center text-sm">
      3
    </div>
    <span className="ml-2 text-sm text-muted">
      Listo
    </span>
  </div>
</div>
```

**❌ PROHIBIDO:**
- Paso de "Sellar evidencia" con switches técnicos
- Mencionar "timestamp", "blockchain", "anclaje", "hash"
- Mostrar opciones técnicas al usuario

#### PASO 1: Elegí tu archivo

```jsx
<div>
  <h3 className="text-lg font-semibold text-main mb-4">
    Elegí tu archivo
  </h3>
  
  {/* Zona de drop */}
  <div className="border-2 border-dashed border-soft rounded-xl py-12 text-center hover:border-accent transition-colors cursor-pointer">
    <FileText className="w-12 h-12 text-accent mx-auto mb-4" />
    <p className="text-sm text-main font-medium">
      Arrastrá tu documento o hacé clic para elegirlo
    </p>
    <p className="text-xs text-muted mt-2">
      PDF, Word, Excel, imágenes (máx 50MB)
    </p>
  </div>
  
  {/* Botón siguiente */}
  <button className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5 mt-6">
    Siguiente
  </button>
</div>
```

**❌ PROHIBIDO:**
- Decir "subir documento"
- Decir "guardar en nuestros servidores"
- Mostrar procesos técnicos como "calculando hash..."

#### PASO 2: Firmá (con firma legal)

```jsx
<div>
  <h3 className="text-lg font-semibold text-main mb-2">
    Firma legal (recomendada)
  </h3>
  
  <p className="text-sm text-muted mb-6">
    Usamos proveedores alineados con marcos como eIDAS, ESIGN y UETA para que la firma tenga validez legal internacional
  </p>
  
  {/* Vista previa del documento + cuadro de firma */}
  <div className="grid grid-cols-2 gap-4">
    {/* Preview PDF */}
    <div className="border border-soft rounded-lg p-4 bg-gray-50">
      {/* Miniatura del documento */}
    </div>
    
    {/* Canvas de firma */}
    <div className="border border-soft rounded-lg p-4">
      <p className="text-xs text-muted mb-2">Firmá aquí con tu dedo o mouse</p>
      <canvas className="w-full h-32 border border-soft rounded bg-white"></canvas>
    </div>
  </div>
  
  {/* Botones */}
  <div className="flex gap-3 mt-6">
    <button className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5">
      Firmar con SignNow
    </button>
    <button className="border border-soft text-muted hover:bg-gray-50 rounded-lg px-4">
      Limpiar
    </button>
  </div>
  
  {/* Link opcional */}
  <p className="text-center mt-4">
    <a href="#" className="text-accent text-sm">
      Continuar solo con certificación (sin firma legal)
    </a>
  </p>
</div>
```

**❌ PROHIBIDO:**
- Cuadros azules grandes con advertencias
- Mencionar "firma criptográfica", "hash", "metadatos"
- Mostrar IP del firmante u otros datos técnicos
- Frases como "esto genera un certificado inmutable"

#### PASO 3: Listo

```jsx
<div className="text-center py-8">
  <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
  
  <h3 className="text-xl font-semibold text-main mb-2">
    Tu certificado está listo
  </h3>
  
  <p className="text-sm text-muted mb-8">
    Guardamos tu documento original y tu certificado .ECO en tu cuenta. Podés descargarlos cuando quieras
  </p>
  
  {/* Botones de acción */}
  <div className="flex gap-3 justify-center">
    <button className="bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5">
      Descargar .ECO
    </button>
    <button className="border border-accent text-accent hover:bg-accent-soft rounded-lg px-5 py-2.5">
      Ver en mi panel
    </button>
  </div>
</div>
```

**❌ PROHIBIDO:**
- Mostrar procesos técnicos como "generando hash", "anclando en blockchain"
- Términos como "inmutable", "irreversible", "permanentemente"
- Pop-ups múltiples de descarga

---

### MODAL: VERIFICAR DOCUMENTO

**Layout:** Mismo que modal de certificar

```jsx
<div>
  <h2 className="text-xl font-semibold text-main mb-2">
    Verificar documento
  </h2>
  <p className="text-sm text-muted mb-8">
    Comprobá si un documento coincide con su archivo .ECO
  </p>
  
  {/* Inputs de archivos */}
  <div className="space-y-4 mb-6">
    {/* Input 1: Documento */}
    <div>
      <label className="block text-sm font-medium text-main mb-2">
        Documento firmado (PDF u otro)
      </label>
      <input type="file" className="w-full" />
    </div>
    
    {/* Input 2: Certificado .ECO */}
    <div>
      <label className="block text-sm font-medium text-main mb-2">
        Certificado .ECO
      </label>
      <input type="file" className="w-full" />
    </div>
  </div>
  
  {/* Botón verificar */}
  <button className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5">
    Verificar coincidencia
  </button>
  
  {/* Resultado (condicional) */}
  {/* Ver siguiente sección */}
</div>
```

#### Resultado de verificación: COINCIDE ✅

```jsx
<div className="mt-6 bg-accent-soft border-l-4 border-accent rounded-lg p-4">
  <div className="flex items-start gap-3">
    <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-medium text-main">
        Coincide
      </p>
      <p className="text-xs text-muted mt-1">
        Este documento es idéntico al que se certificó con este archivo .ECO
      </p>
    </div>
  </div>
</div>
```

#### Resultado de verificación: NO COINCIDE ❌

```jsx
<div className="mt-6 bg-gray-50 border-l-4 border-gray-400 rounded-lg p-4">
  <div className="flex items-start gap-3">
    <AlertTriangle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-medium text-main">
        No coincide
      </p>
      <p className="text-xs text-muted mt-1">
        El documento no es igual al que se certificó con este archivo .ECO
      </p>
    </div>
  </div>
</div>
```

**❌ PROHIBIDO:**
- Usar rojo fuerte o colores agresivos
- Términos como "falsificación", "fraude", "manipulación"
- Mostrar detalles técnicos de hashes o metadatos

---

## 4. LANDING PAGE

### Hero Section

```jsx
<section className="bg-main py-16">
  <div className="max-w-4xl mx-auto px-6 text-center">
    {/* Título principal */}
    <h1 className="text-4xl md:text-5xl font-semibold text-main leading-tight">
      Tu trabajo merece una verdad que nadie pueda cuestionar
    </h1>
    
    {/* Subtítulo */}
    <p className="text-lg text-muted mt-6 leading-relaxed">
      Certificá tus documentos sin exponer el contenido. Firmá una sola vez y obtené evidencia verificable para siempre
    </p>
    
    {/* Botones */}
    <div className="flex gap-4 justify-center mt-8">
      <button className="bg-accent hover:bg-accent-hover text-white rounded-lg px-6 py-3 font-medium">
        Comenzar gratis
      </button>
      <a href="#como-funciona" className="text-accent hover:text-accent-hover font-medium px-6 py-3">
        Cómo funciona
      </a>
    </div>
  </div>
</section>
```

**❌ PROHIBIDO:**
- Frases como "revolucionamos", "cambia todo para siempre"
- Promesas exageradas
- Fondos oscuros o degradados

### Sección: Protegé tus documentos

```jsx
<section className="bg-main py-16">
  <div className="max-w-4xl mx-auto px-6">
    <h2 className="text-3xl font-semibold text-main text-center mb-4">
      Protegé tus documentos con el formato .ECO
    </h2>
    
    <p className="text-base text-muted text-center max-w-2xl mx-auto leading-relaxed">
      Cada documento certificado genera un archivo .ECO que contiene la evidencia completa de autenticidad. Sin exponer el contenido original, solo la prueba
    </p>
  </div>
</section>
```

### Sección: 4 pasos

```jsx
<section className="bg-main py-16">
  <div className="max-w-6xl mx-auto px-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Paso 1 */}
      <div className="bg-white border border-soft rounded-xl p-6">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center font-semibold mb-4">
          1
        </div>
        <h3 className="text-base font-semibold text-main mb-2">
          Elegís tu archivo
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          Seleccionás el documento que querés certificar desde tu computadora
        </p>
      </div>
      
      {/* Paso 2 */}
      <div className="bg-white border border-soft rounded-xl p-6">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center font-semibold mb-4">
          2
        </div>
        <h3 className="text-base font-semibold text-main mb-2">
          Firmás en un solo paso
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          Una firma rápida con validez legal internacional, sin complicaciones
        </p>
      </div>
      
      {/* Paso 3 */}
      <div className="bg-white border border-soft rounded-xl p-6">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center font-semibold mb-4">
          3
        </div>
        <h3 className="text-base font-semibold text-main mb-2">
          Sellás tu evidencia
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          VerifySign genera automáticamente tu certificado con todas las pruebas
        </p>
      </div>
      
      {/* Paso 4 */}
      <div className="bg-white border border-soft rounded-xl p-6">
        <div className="w-10 h-10 rounded-full border-2 border-accent text-accent flex items-center justify-center font-semibold mb-4">
          4
        </div>
        <h3 className="text-base font-semibold text-main mb-2">
          Guardás tus dos archivos
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          Tu documento original y tu .ECO quedan seguros en tu cuenta
        </p>
      </div>
    </div>
  </div>
</section>
```

**❌ PROHIBIDO:**
- Cajas con fondos de color
- Términos técnicos como "hash", "blockchain", "timestamp"
- Pasos innecesarios o microdecisiones

### Sección: Cómo lo hacemos (puntos técnicos simplificados)

**Estructura general:**
- Fondo blanco
- Cada punto como sección vertical con icono, título y texto
- Notas importantes en recuadro suave (NO fondos saturados)

#### Ejemplo de punto técnico bien redactado:

```jsx
<div className="max-w-3xl mx-auto px-6 py-8">
  {/* Icono */}
  <Shield className="w-8 h-8 text-accent mb-4" />
  
  {/* Título */}
  <h3 className="text-xl font-semibold text-main mb-3">
    Guardamos tu .ECO original en tu nube
  </h3>
  
  {/* Texto explicativo */}
  <p className="text-base text-muted leading-relaxed mb-4">
    Tu documento original y tu .ECO quedan en tu espacio personal dentro de VerifySign, sin modificaciones
  </p>
  
  {/* Nota importante */}
  <div className="bg-bg-soft border-l-4 border-accent rounded-lg p-4">
    <p className="text-sm text-main">
      Si alguien modifica los archivos fuera de tu cuenta, el certificado deja en evidencia la diferencia
    </p>
  </div>
</div>
```

**❌ PROHIBIDO:**
- Términos como "guardar en nuestros servidores", "retener archivos"
- Mencionar infraestructura (Supabase, AWS, etc.)
- Frases técnicas como "computar", "parsear", "indexar"
- Palabras que suenen invasivas: "monitoreo", "rastreo", "vigilancia"

---

## 5. TEXTOS Y MENSAJES

### Mensajes de carga / progreso

**✅ BIEN:**
- "Preparando tu certificado..."
- "Ya casi está listo..."
- "Finalizando..."

**❌ MAL:**
- "Generando hash SHA-256..."
- "Calculando timestamp..."
- "Anclando en blockchain..."
- "Procesando firma criptográfica..."

### Mensajes de éxito

**✅ BIEN:**
- "Tu certificado está listo"
- "Listo. Guardamos todo en tu cuenta"
- "Certificado creado correctamente"

**❌ MAL:**
- "Hash generado exitosamente"
- "Timestamp RFC 3161 aplicado"
- "Documento anclado en Bitcoin"

### Mensajes de error

**✅ BIEN:**
- "Algo no salió bien. Intentá nuevamente"
- "No pudimos procesar tu archivo"
- "El archivo es demasiado grande (máx 50MB)"

**❌ MAL:**
- "Error al computar hash SHA-256"
- "Fallo en el timestamp del servidor"
- "Cuidado, esto no se puede deshacer"

### Textos de ayuda / tooltips

**✅ BIEN:**
- "Tu archivo .ECO contiene todas las pruebas de autenticidad"
- "Podés compartir tu .ECO sin exponer el contenido original"

**❌ MAL:**
- "El hash SHA-256 certifica la integridad criptográfica"
- "El timestamp RFC 3161 garantiza la inmutabilidad"

---

## 6. PALABRAS PROHIBIDAS - CHECKLIST COMPLETO

### ❌ Palabras que generan miedo o sospecha
- cualquiera
- público
- expuesto
- subido / subir
- guardar en nuestros servidores
- retener archivos
- bloquear
- intervenir
- controlar tu documento

### ❌ Tecnicismos
- hash
- SHA-256
- RFC 3161
- timestamp
- blockchain
- Bitcoin / Polygon
- anclaje / anclar
- firma criptográfica
- IP del firmante
- metadatos técnicos
- términos de ingeniería

### ❌ Palabras que indican riesgo o conflicto
- fraude
- manipulación
- falsificación
- disputa
- amenaza
- vulnerabilidad
- irreversible

### ❌ Palabras industriales o mecánicas
- procesar
- computar
- parsear
- indexar
- despliegue
- compilar

### ❌ Palabras invasivas
- monitoreo
- rastreo
- vigilancia
- seguimiento
- tracking (excepto en "VerifyTracker" con contexto humano)

### ❌ Promesas exageradas
- "la justicia digital llegó"
- "revolucionamos la forma de firmar"
- "cambia todo para siempre"
- "somos los más seguros del mundo"

### ❌ Frases que generan presión
- "si no hacés esto podés quedar desprotegido"
- "lo recomendable es..."
- "si no aceptás, no podemos continuar"
- "cuidado, esto queda para siempre"

---

## 7. FLUJO PARA INVITADOS (ROL B)

### Página de acceso con NDA

```jsx
<div className="max-w-2xl mx-auto px-6 py-16">
  {/* Header */}
  <div className="text-center mb-8">
    <Shield className="w-12 h-12 text-accent mx-auto mb-4" />
    <h1 className="text-2xl font-semibold text-main">
      {senderName} te compartió un documento
    </h1>
    <p className="text-sm text-muted mt-2">
      Para acceder, necesitamos que aceptes un acuerdo de confidencialidad
    </p>
  </div>
  
  {/* NDA Card */}
  <div className="bg-white border border-soft rounded-xl p-6 mb-6">
    <h2 className="text-lg font-semibold text-main mb-4">
      Acuerdo de Confidencialidad
    </h2>
    
    {/* Texto del NDA (scrolleable) */}
    <div className="bg-bg-soft rounded-lg p-4 max-h-64 overflow-y-auto mb-6">
      <p className="text-sm text-main leading-relaxed">
        {ndaText}
      </p>
    </div>
    
    {/* Formulario */}
    <div className="space-y-4 mb-6">
      <input 
        type="text" 
        placeholder="Tu nombre completo"
        className="w-full bg-white border border-soft rounded-lg px-4 py-2.5"
      />
      <input 
        type="email" 
        placeholder="Tu email"
        className="w-full bg-white border border-soft rounded-lg px-4 py-2.5"
      />
    </div>
    
    {/* Checkbox */}
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" className="mt-1" />
      <span className="text-sm text-main">
        Acepto los términos del acuerdo de confidencialidad y entiendo que este acceso queda registrado
      </span>
    </label>
    
    {/* Botón */}
    <button className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5 mt-6">
      Aceptar y acceder
    </button>
  </div>
  
  {/* CTA sutil para registro */}
  <p className="text-center text-sm text-muted">
    ¿Querés guardar tus propios certificados? 
    <a href="/register" className="text-accent ml-1">
      Creá tu cuenta gratis
    </a>
  </p>
</div>
```

### Página de descarga post-NDA

```jsx
<div className="max-w-2xl mx-auto px-6 py-16">
  {/* Éxito */}
  <div className="text-center mb-8">
    <CheckCircle className="w-16 h-16 text-accent mx-auto mb-4" />
    <h1 className="text-2xl font-semibold text-main">
      Gracias, {recipientName}
    </h1>
    <p className="text-sm text-muted mt-2">
      Ya podés acceder al documento
    </p>
  </div>
  
  {/* Card con info del documento */}
  <div className="bg-white border border-soft rounded-xl p-6 mb-6">
    <div className="flex items-start gap-4">
      <FileText className="w-8 h-8 text-accent flex-shrink-0" />
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-main">
          {documentTitle}
        </h2>
        <p className="text-sm text-muted mt-1">
          Compartido por {senderName}
        </p>
      </div>
    </div>
    
    {/* Botones de descarga */}
    <div className="flex gap-3 mt-6">
      <button className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-lg px-5 py-2.5">
        Descargar documento
      </button>
      <button className="flex-1 border border-accent text-accent hover:bg-accent-soft rounded-lg px-5 py-2.5">
        Descargar .ECO
      </button>
    </div>
  </div>
  
  {/* Info adicional */}
  <div className="bg-accent-soft border-l-4 border-accent rounded-lg p-4">
    <p className="text-sm text-main">
      Tu acceso a este documento quedó registrado de forma segura
    </p>
  </div>
</div>
```

**❌ PROHIBIDO para invitados:**
- Mostrar configuraciones técnicas
- Exponer decisiones de seguridad
- Términos como "tracking", "monitoreo", "vigilancia"
- Forzar descarga inmediata con pop-ups

---

## 8. CHECKLIST DE VALIDACIÓN

Antes de implementar cualquier pantalla o componente, verificar:

- [ ] NO usa ninguna palabra prohibida de la lista
- [ ] NO muestra tecnicismos (hash, timestamp, blockchain, etc.)
- [ ] NO genera miedo ni sospecha ("expuesto", "público", "cualquiera")
- [ ] NO mezcla roles A y B (invitado ve configuraciones de dueño)
- [ ] NO usa colores agresivos (rojo fuerte, amarillo fuerte, verde neón)
- [ ] NO rompe consistencia (múltiples tipos de botones, tipografías)
- [ ] SÍ usa lenguaje humano, cálido y simple
- [ ] SÍ mantiene solo azul como color de acento
- [ ] SÍ explica beneficios para el usuario (qué recibe, qué puede hacer)
- [ ] SÍ mantiene el espíritu VerifySign en cada texto

---

## 9. EJEMPLOS DE ANTES/DESPUÉS

### Ejemplo 1: Botón de certificar

**❌ ANTES:**
```
"Procesar y anclar documento"
```

**✅ DESPUÉS:**
```
"Certificar documento"
```

---

### Ejemplo 2: Mensaje de progreso

**❌ ANTES:**
```
"Generando hash SHA-256 del documento..."
"Calculando timestamp RFC 3161..."
"Anclando en Bitcoin blockchain..."
```

**✅ DESPUÉS:**
```
"Preparando tu certificado..."
"Ya casi está listo..."
```

---

### Ejemplo 3: Modal de firma

**❌ ANTES:**
```
Título: "Configuración de firma criptográfica"
Switches:
- [ ] Incluir timestamp RFC 3161
- [ ] Anclar en blockchain pública
- [ ] Generar hash SHA-256
- [ ] Capturar IP del firmante
```

**✅ DESPUÉS:**
```
Título: "Firmá tu documento"
Subtítulo: "Una firma rápida con validez legal internacional"
[Canvas de firma]
[Botón: "Firmar con SignNow"]
```

---

### Ejemplo 4: Resultado de verificación

**❌ ANTES:**
```
❌ Hash mismatch detected
El hash SHA-256 del documento no coincide con el valor almacenado en el certificado .ECO. Posible manipulación o falsificación del archivo original.
```

**✅ DESPUÉS:**
```
⚠️ No coincide
El documento no es igual al que se certificó con este archivo .ECO
```

---

### Ejemplo 5: Texto de landing

**❌ ANTES:**
```
"Revolucionamos la certificación digital con blockchain y criptografía de nivel militar. Nuestra plataforma procesa documentos y genera hashes inmutables anclados en Bitcoin para garantizar prueba forense irrefutable."
```

**✅ DESPUÉS:**
```
"Certificá tus documentos sin exponer el contenido. Firmá una sola vez y obtené evidencia verificable para siempre."
```

---

## 10. IMPLEMENTACIÓN: PASOS PARA EL DEV

### Fase 1: Auditoría
1. Buscar en TODO el código todas las palabras prohibidas
2. Hacer lista de componentes que las usan
3. Priorizar por impacto (landing > dashboard > modales)

### Fase 2: Cambios críticos
1. Reemplazar textos en landing page
2. Actualizar modales de certificar y verificar
3. Simplificar dashboard (quitar fondos azules)
4. Revisar mensajes de error y éxito

### Fase 3: Componentes base
1. Crear variables de color según este sistema
2. Unificar botones (primario/secundario)
3. Estandarizar cards y alerts
4. Homogeneizar tipografía

### Fase 4: Testing
1. Revisar cada pantalla contra checklist de validación
2. Verificar que NO aparezca ninguna palabra prohibida
3. Confirmar que el tono sea humano y cálido
4. Validar que ROL A y ROL B no se mezclen

---

**FIN DEL DESIGN SYSTEM**

Este documento debe ser la **única fuente de verdad** para cualquier decisión de UX, UI o copywriting en VerifySign. Si algo no está aquí, se consulta primero contra los 20 Mandamientos antes de implementar.
