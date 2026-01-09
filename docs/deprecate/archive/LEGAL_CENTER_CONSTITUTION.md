# 📜 Centro Legal - Constitución

**Versión:** 2.0  
**Fecha:** 2025-12-17  
**Estado:** Fuente de verdad inmutable  
**Propósito:** Contrato interno para toda implementación relacionada con Centro Legal

---

> **⚠️ REGLA FUNDAMENTAL:**  
> Este documento es la fuente de verdad.  
> Si el código contradice este documento, el código está mal.

---

## 🎯 Principio Rector (manda sobre todo)

> **EcoSign acompaña, no dirige. Informa cuando hace falta, no interrumpe. Da seguridad, no ansiedad.**

### Reglas de oro (no negociables):

1. ❌ Nunca usamos lenguaje de error técnico duro si no es crítico
2. ❌ Nunca culpamos al usuario
3. ❌ Nunca mostramos estados "incompletos" como fracaso
4. ✅ Todo lo que pasa es normalizado
5. ✅ Siempre dejamos claro qué sigue o que ya está bien así
6. ✅ Tono: Calmo, humano, seguro (no jurídico duro, no marketing exagerado)

### Axioma de control:

> **El usuario se siente en control, incluso cuando no interviene.**

- El sistema hace lo correcto por defecto
- El control está disponible, no impuesto
- Empoderamiento silencioso > opciones explícitas
- La inacción es válida (confiar en el sistema es legítimo)

---

## 🏛️ Arquitectura de Estados

### 4 Acciones disponibles:

1. **Certificar documento** (default, siempre activo)
2. **Firmar documento** (Mi Firma)
3. **Flujo de Firmas** (enviar a otros)
4. **NDA** (acuerdo de confidencialidad)

### Estados del flujo:

```typescript
type InitialAction = 'certify' | 'sign' | 'workflow' | 'nda' | null;
type DocumentLoaded = boolean;
type UserHasSignature = boolean;
type SignatureType = 'legal' | 'certified' | null;
type EmailsCount = number;
```

---

## 📐 Reglas de Visibilidad (críticas)

### Regla 1: Origen determina comportamiento

**A) Usuario viene desde Home con acción preseleccionada:**
- Modal se abre con esa acción ya activa
- Panel correspondiente (NDA/Flujo) ya descolapsado si aplica
- Mensaje de bienvenida contextual

**B) Usuario abre Centro Legal desde header (sin acción):**
- Solo dropzone visible
- Acciones (NDA, Mi Firma, Flujo) NO visibles
- **Después de cargar documento → Acciones aparecen**

### Regla 2: Acciones solo visibles si:

```javascript
(documentLoaded === true) || (initialAction !== null)
```

**Nunca** mostrar acciones sin documento, excepto si viene con `initialAction`.

---

## 🎬 Flujos por Acción (detallados)

### 1️⃣ Certificar documento (default)

**Entrada:** Usuario carga documento (cualquier origen)

**Comportamiento:**
1. Toast: "Documento listo. EcoSign no ve tu documento. La certificación está activada por defecto."
2. Escudo visible con tooltip: "Certificación activa. La certificación protege tu documento con trazabilidad verificable. Si querés, podés desactivarla desde acá (no recomendado)."
3. CTA: **"Proteger documento"** (activo desde el inicio)
4. Usuario puede desactivar certificación → Toast warning

**Estados:**
- `forensicEnabled = true` (default)
- `documentLoaded = true`

---

### 2️⃣ Firmar documento (Mi Firma)

**Entrada:** Usuario eligió "Firmar" desde Home O activa "Mi Firma" con documento cargado

**Comportamiento:**

**Cuando se activa (con documento):**
1. Toast: "Vas a poder firmar directamente sobre el documento."
2. Modal de firma se abre automáticamente
3. CTA cambia a: **"Proteger y firmar"** (INACTIVO)

**Cuando usuario dibuja/escribe/sube firma:**
1. Usuario hace clic en "Aplicar firma"
2. Toast: "Firma aplicada correctamente."
3. Modal se cierra
4. **Toast interactivo** aparece (bottom-center, infinito):
   ```
   Elegí el peso legal de tu firma
   [Firma legal] [Firma certificada]
   Podés cambiar esta elección más adelante.
   ```

**Cuando usuario elige tipo:**
1. Toast se cierra
2. Si elige "Legal" → Toast: "Firma legal seleccionada"
3. Si elige "Certificada" → Abre modal de subtipos
4. CTA se activa: **"Proteger y firmar"** (activo)

**Estados:**
- `mySignature = true`
- `userHasSignature = true` (después de aplicar)
- `signatureType = 'legal' | 'certified'` (después de elegir)

**Validaciones CTA:**
- ❌ CTA inactivo si: `!userHasSignature || !signatureType`
- ✅ CTA activo si: `userHasSignature && signatureType !== null`

**Toasts de error:**
- Si intenta finalizar sin firma: "Elegí el tipo de firma para continuar." (bottom-right)

---

### 3️⃣ Flujo de Firmas

**Entrada:** Usuario eligió "Flujo de Firmas" desde Home O activa "Flujo" con documento cargado

**Comportamiento:**

**Cuando se activa:**
1. Panel de flujo de firmas se abre
2. Toast: "Agregá los correos de las personas que deben firmar o recibir el documento."
3. CTA cambia a: **"Proteger y enviar mails"** (INACTIVO)

**Cuando usuario agrega primer mail válido:**
1. Toast: "Destinatario agregado correctamente."
2. CTA se activa: **"Proteger y enviar mails"** (activo)

**Estados:**
- `workflowEnabled = true`
- `emailInputs = [{ email, name, requireLogin, requireNda }]`

**Validaciones CTA:**
- ❌ CTA inactivo si: `emailInputs.filter(e => e.email.trim()).length === 0`
- ✅ CTA activo si: `emailInputs.some(e => e.email.trim() !== '')`

**Toasts de error:**
- Si intenta finalizar sin mails: "Agregá al menos un correo para continuar." (bottom-right)

---

### 4️⃣ NDA

**Entrada:** Usuario eligió "NDA" desde Home O activa "NDA" con documento cargado

**Comportamiento:**

**Cuando se activa:**
1. Panel NDA se abre con texto editable
2. CTA: **"Proteger documento"** (activo)
3. Usuario puede editar NDA libremente

**Cuando carga documento (si viene desde Home):**
1. Toast genérico de documento cargado
2. Modal informativo: "Si querés, podés firmarlo y/o enviarlo (Flujo de Firmas), o sino Finalizar"

**Estados:**
- `ndaEnabled = true`
- `ndaText = string` (editable)

**Validaciones CTA:**
- ✅ Siempre activo (NDA no bloquea)

---

### 5️⃣ Combinaciones

#### Mi Firma + Flujo de Firmas:

**Orden de ejecución:**
1. Usuario carga documento
2. Si tiene "Mi Firma" activa → Modal de firma se abre primero
3. Usuario firma → Toast tipos → Elige tipo
4. **CTA sigue INACTIVO** aunque tenga firma
5. Debe agregar ≥1 mail en panel Flujo
6. Cuando agrega mail → CTA se ACTIVA
7. CTA: **"Proteger, firmar y enviar mails"**

**Validaciones CTA:**
```javascript
if (mySignature && !signatureType) return false;
if (workflowEnabled && !emailInputs.some(e => e.email.trim())) return false;
return true;
```

**Toasts informativos:**
- Si firma OK pero faltan mails: "Firma lista. Agregá los destinatarios para continuar."
- Si mails OK pero falta firma: "Destinatarios listos. Falta tu firma para continuar."

---

## 🎨 CTA Dinámico (corazón del sistema)

### Función de texto:

```javascript
const getCTAText = () => {
  const actions = ['Proteger']; // Siempre presente (certificación default)
  
  if (mySignature && userHasSignature && signatureType) {
    actions.push('firmar');
  }
  
  if (workflowEnabled && emailInputs.some(e => e.email.trim())) {
    actions.push('enviar mails');
  }
  
  return actions.join(' y ');
};
```

### Posibles textos:

- `"Proteger documento"` (solo certificar)
- `"Proteger y firmar"` (certificar + firma)
- `"Proteger y enviar mails"` (certificar + flujo)
- `"Proteger, firmar y enviar mails"` (todo junto)

### Función de estado:

```javascript
const isCTAEnabled = () => {
  // Solo certificar: siempre activo
  if (!mySignature && !workflowEnabled && !ndaEnabled) return true;
  
  // Si "Mi Firma" activa: debe tener firma Y tipo elegido
  if (mySignature) {
    if (!userHasSignature) return false;
    if (!signatureType) return false;
  }
  
  // Si "Flujo" activo: debe tener ≥1 mail
  if (workflowEnabled && !emailInputs.some(e => e.email.trim())) return false;
  
  // NDA nunca bloquea
  
  return true;
};
```

### Estados visuales:

```javascript
className={`w-full px-6 py-4 rounded-xl font-semibold text-lg transition ${
  file && isCTAEnabled()
    ? 'bg-black text-white hover:bg-gray-800'
    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
}`}
```

---

## 💬 Copy de Toasts (inmutables)

### Tipos de mensajes (solo 4):

1. **Modal inicial** (una vez, opcional)
2. **Toasts positivos** (arriba derecha) ✅
3. **Toasts informativos** (arriba derecha) ℹ️
4. **Toasts de alerta** (abajo derecha) ⚠️

### Modal inicial de bienvenida:

**Título:** "Bienvenido al Centro Legal"

**Texto principal:**
```
Para iniciar el proceso, subí el documento que querés firmar o certificar.
```

**Pregunta clave:**
```
¿Querés que te acompañemos durante el proceso?
```

**Explicación:**
```
Pensá en EcoSign como alguien que acompaña, pero que es ciego.
No vemos tu documento ni su contenido.

Si activás la guía, te mostraremos mensajes breves en momentos clave 
para que sepas qué está pasando. Podés desactivarla en cualquier momento.
```

**Botones:**
- "Sí, acompañame"
- "No, gracias"
- Checkbox: "No volver a mostrar"

**Versiones condicionales:**

Si `initialAction === 'sign'`:
```
+ "Como elegiste firmar, se abrirá el modal de firma automáticamente."
```

Si `initialAction === 'workflow'`:
```
+ "Como elegiste Flujo de Firmas, cargá los mails de los destinatarios."
```

Si `initialAction === 'nda'`:
```
+ "El panel NDA está listo para editar. Luego podés firmar y/o enviarlo."
```

---

### Documento cargado (unificado):

**Toast informativo (arriba derecha):**
```
Documento listo.
EcoSign no ve tu documento.
La certificación está activada por defecto.
```

**Duración:** 4 segundos  
**Icono:** ✓

---

### Certificación desactivada:

**Toast warning (arriba derecha):**
```
La certificación fue desactivada.
El documento tendrá menor protección.
```

**Duración:** 4 segundos  
**Icono:** ⚠️

---

### Mi Firma activada:

**Toast informativo (arriba derecha):**
```
Vas a poder firmar directamente sobre el documento.
```

**Duración:** 3 segundos  
**Icono:** ✍️

---

### Firma aplicada:

**Toast positivo (arriba derecha):**
```
Firma aplicada correctamente.
```

**Duración:** 2 segundos  
**Icono:** ✓

---

### Elección de peso legal:

**Toast interactivo (bottom-center, infinito):**

HTML personalizado:
```jsx
<div className="bg-white p-5 rounded-xl shadow-2xl border border-gray-200 max-w-sm">
  <h4 className="font-semibold text-gray-900 mb-3">
    Elegí el peso legal de tu firma
  </h4>
  <div className="flex gap-3 mb-2">
    <button className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-medium">
      Firma legal
    </button>
    <button className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium">
      Firma certificada
    </button>
  </div>
  <p className="text-xs text-gray-500 text-center">
    Podés cambiar esta elección más adelante.
  </p>
</div>
```

---

### Tipo de firma elegido:

**Toast positivo (arriba derecha):**
```
Firma legal seleccionada
```
O
```
Firma certificada seleccionada
```

**Duración:** 2 segundos

---

### Flujo de firmas activado:

**Toast informativo (arriba derecha):**
```
Agregá los correos de las personas que deben firmar o recibir el documento.
```

**Duración:** 3 segundos

---

### Destinatario agregado:

**Toast positivo (arriba derecha):**
```
Destinatario agregado correctamente.
```

**Duración:** 2 segundos

---

### Errores - Sin tipo de firma:

**Toast error (abajo derecha):**
```
Elegí el tipo de firma para continuar.
```

---

### Errores - Sin mails:

**Toast error (abajo derecha):**
```
Agregá al menos un correo para continuar.
```

---

### Errores - Sin firma en canvas:

**Toast error (abajo derecha):**
```
Completá tu firma para continuar.
```

---

### Combinaciones - Firma lista, faltan mails:

**Toast informativo (arriba derecha):**
```
Firma lista. Agregá los destinatarios para continuar.
```

---

### Combinaciones - Mails listos, falta firma:

**Toast informativo (arriba derecha):**
```
Destinatarios listos. Falta tu firma para continuar.
```

---

### Finalización exitosa:

**Toast positivo (arriba derecha):**

Según acciones activas:
```
Documento protegido correctamente.
```
O
```
Documento firmado y protegido correctamente.
```
O
```
Documento protegido y enviado correctamente.
```
O
```
Documento firmado, protegido y enviado correctamente.
```

**Duración:** 3 segundos

---

### Errores reales (pocos y claros):

**Error al cargar archivo (abajo derecha):**
```
No pudimos cargar el archivo. Intentá nuevamente.
```

**Error inesperado (abajo derecha):**
```
Ocurrió un error inesperado. No se perdió ningún dato.
```

---

## 🛡️ Tooltip del Escudo (inmutable)

**Título:** "Certificación activa"

**Texto principal:**
```
La certificación protege tu documento con trazabilidad verificable.
```

**Texto secundario (gris, más pequeño):**
```
Si querés, podés desactivarla desde acá (no recomendado).
```

---

## 🚫 Qué NO hacer (anti-reglas)

### En copy:

❌ No decir "guardar" ni "subir" en momento de carga  
❌ No decir "blockchain", "Bitcoin", "Polygon" en UI principal  
❌ No decir "legal" en el primer mensaje  
❌ No usar lenguaje de error técnico ("ECONNREFUSED", "500", etc.)  
❌ No culpar al usuario ("Olvidaste...", "No completaste...")  
❌ No pedir confirmaciones innecesarias ("¿estás seguro?")

### En flujo:

❌ No mostrar acciones sin documento (excepto con initialAction)  
❌ No bloquear descarga por certificación pendiente  
❌ No permitir finalizar sin firma si "Mi Firma" está activa  
❌ No permitir finalizar sin mails si "Flujo" está activo  
❌ No mostrar estados "incompletos" como error  
❌ No atrapar al usuario (siempre hay salida/cancelación)

### En estados:

❌ No mutar estado de forma implícita  
❌ No asumir orden de eventos  
❌ No confiar en side-effects para lógica crítica  
❌ No mezclar estado UI con estado de dominio

---

## 📊 Contrato con Backend (inmutable)

### Estados que NO cambian:

- `forensicEnabled: boolean`
- `forensicConfig: { useLegalTimestamp, usePolygonAnchor, useBitcoinAnchor }`
- `signatureType: 'legal' | 'certified' | null`
- `emailInputs: Array<{ email, name, requireLogin, requireNda }>`
- `ndaText: string`

### Edge Functions que consumen estos estados:

- `legal-timestamp` (lee `forensicConfig.useLegalTimestamp`)
- `anchor-polygon` (lee `forensicConfig.usePolygonAnchor`)
- `anchor-bitcoin` (lee `forensicConfig.useBitcoinAnchor`)
- `start-signature-workflow` (lee `emailInputs`)
- `process-signature` (lee `signatureType`)

**Regla de oro:** Ninguna reimplementación puede cambiar estos contratos.

---

## 📝 Política de Pull Requests

### Toda PR que toque Centro Legal debe:

1. **Citar qué regla de esta Constitución respeta**
2. **Si propone cambiar una regla, justificar por qué**
3. **Demostrar que no rompe contratos con backend**
4. **Incluir testing manual de escenarios afectados**

### Template de PR para Centro Legal:

```markdown
## Cambios en Centro Legal

### Reglas de LEGAL_CENTER_CONSTITUTION.md que respeta:
- [ ] Regla X (sección Y)
- [ ] Regla Z

### Reglas que propone modificar:
- Ninguna / [Regla a cambiar + justificación]

### Contratos con backend afectados:
- Ninguno / [Función + cambio]

### Testing manual completado:
- [ ] Escenario 1
- [ ] Escenario 2
...

### Diff de comportamiento:
Antes: [comportamiento viejo]
Después: [comportamiento nuevo]
```

---

## 🧪 Testing Checklist (exhaustivo)

### Escenario 1: Header sin acción
- [ ] Abrir Centro Legal desde header
- [ ] Solo dropzone visible
- [ ] Modal bienvenida con mensaje base
- [ ] Acciones NO visibles
- [ ] Subir documento
- [ ] Toast correcto ("Documento listo...")
- [ ] Acciones aparecen (NDA, Mi Firma, Flujo)
- [ ] CTA: "Proteger documento" (activo)
- [ ] Hacer clic en CTA → Finaliza correctamente

### Escenario 2: Home → Certificar
- [ ] Hacer clic en "Certificar documento" en Home
- [ ] Modal se abre
- [ ] Mensaje bienvenida tiene contexto de certificación
- [ ] Subir documento
- [ ] Toast correcto
- [ ] CTA: "Proteger documento" (activo)
- [ ] Escudo visible con tooltip
- [ ] Hacer clic en CTA → Finaliza
- [ ] Toast: "Documento protegido correctamente"

### Escenario 3: Home → Firmar
- [ ] Hacer clic en "Firmar documento" en Home
- [ ] Modal se abre
- [ ] Subir documento
- [ ] Toast: "Documento listo..."
- [ ] Toast: "Vas a poder firmar..."
- [ ] Modal de firma se abre automáticamente
- [ ] Dibujar firma
- [ ] Hacer clic en "Aplicar firma"
- [ ] Toast: "Firma aplicada correctamente"
- [ ] Toast interactivo aparece (bottom-center)
- [ ] Hacer clic en "Firma legal"
- [ ] Toast: "Firma legal seleccionada"
- [ ] CTA: "Proteger y firmar" (activo)
- [ ] Hacer clic en CTA → Finaliza
- [ ] Toast: "Documento firmado y protegido correctamente"

### Escenario 4: Home → Flujo
- [ ] Hacer clic en "Crear Flujo de Firmas" en Home
- [ ] Modal se abre
- [ ] Panel Flujo ya descolapsado
- [ ] Toast: "Agregá los correos..."
- [ ] Subir documento
- [ ] Toast: "Documento listo..."
- [ ] CTA: "Proteger y enviar mails" (INACTIVO/gris)
- [ ] Intentar hacer clic en CTA → No hace nada o toast error
- [ ] Agregar mail válido en campo
- [ ] Toast: "Destinatario agregado correctamente"
- [ ] CTA se vuelve ACTIVO (negro)
- [ ] Hacer clic en CTA → Finaliza
- [ ] Toast: "Documento protegido y enviado correctamente"

### Escenario 5: Home → NDA
- [ ] Hacer clic en "Enviar NDA" en Home
- [ ] Modal se abre
- [ ] Panel NDA ya descolapsado
- [ ] Texto NDA editable
- [ ] Subir documento
- [ ] Toast: "Documento listo..."
- [ ] CTA: "Proteger documento" (activo)
- [ ] Hacer clic en CTA → Finaliza

### Escenario 6: Firmar + Flujo (combinado)
- [ ] Header → Abrir Centro Legal
- [ ] Subir documento
- [ ] Activar "Mi Firma"
- [ ] Toast: "Vas a poder firmar..."
- [ ] Modal firma se abre
- [ ] Aplicar firma
- [ ] Elegir "Firma legal"
- [ ] CTA: "Proteger y firmar" pero sigue INACTIVO ⚠️
- [ ] Activar "Flujo de Firmas"
- [ ] CTA cambia a: "Proteger, firmar y enviar mails" (INACTIVO)
- [ ] Agregar mail
- [ ] Toast: "Destinatario agregado"
- [ ] CTA se ACTIVA
- [ ] Hacer clic en CTA → Finaliza
- [ ] Toast: "Documento firmado, protegido y enviado correctamente"

### Escenario 7: Desactivar certificación
- [ ] Subir documento
- [ ] Hacer clic en escudo (desactivar)
- [ ] Toast: "La certificación fue desactivada..."
- [ ] CTA sigue funcionando (no bloquea)

### Escenario 8: Errores de validación
- [ ] Activar "Mi Firma"
- [ ] Subir documento
- [ ] Modal se abre
- [ ] NO dibujar firma
- [ ] Hacer clic en "Aplicar firma"
- [ ] Toast error: "Completá tu firma para continuar"
- [ ] Dibujar firma
- [ ] Aplicar firma
- [ ] NO elegir tipo
- [ ] Hacer clic en CTA
- [ ] Toast error: "Elegí el tipo de firma para continuar"

### Escenario 9: Navegación sin bloqueos
- [ ] Subir documento
- [ ] Abrir modal de firma
- [ ] Cerrar modal sin aplicar (X o Volver)
- [ ] Modal se cierra
- [ ] No hay estado corrupto
- [ ] Poder volver a abrir

---

## 🏗️ Estructura de Implementación (nuevo componente)

### Archivo nuevo: `LegalCenterModalV2.jsx`

**Estructura interna sugerida:**

```javascript
// ===== ESTADOS (agrupados por función) =====
// Control de documento
const [file, setFile] = useState(null);
const [documentLoaded, setDocumentLoaded] = useState(false);
const [documentPreview, setDocumentPreview] = useState(null);

// Acciones activas
const [mySignature, setMySignature] = useState(initialAction === 'sign');
const [workflowEnabled, setWorkflowEnabled] = useState(initialAction === 'workflow');
const [ndaEnabled, setNdaEnabled] = useState(initialAction === 'nda');

// Estado de firma
const [userHasSignature, setUserHasSignature] = useState(false);
const [signatureType, setSignatureType] = useState(null);
const [signatureMode, setSignatureMode] = useState('none');

// Estado de flujo
const [emailInputs, setEmailInputs] = useState([{ email: '', name: '', requireLogin: true, requireNda: true }]);

// Certificación
const [forensicEnabled, setForensicEnabled] = useState(true);
const [forensicConfig, setForensicConfig] = useState({
  useLegalTimestamp: true,
  usePolygonAnchor: true,
  useBitcoinAnchor: true
});

// ===== FUNCIONES HELPER (declarativas) =====
const getCTAText = () => { /* ... */ };
const isCTAEnabled = () => { /* ... */ };
const getWelcomeMessage = () => { /* ... */ };
const getSuccessMessage = () => { /* ... */ };

// ===== HANDLERS (lógica de interacción) =====
const handleFileSelect = (e) => { /* ... */ };
const handleApplySignature = () => { /* ... */ };
const handleFinalize = async () => { /* ... */ };

// ===== RENDER (JSX limpio) =====
return (
  <div className="modal">
    {/* Grid fijo: NDA | Documento | Flujo */}
    {/* Acciones visibles solo si (documentLoaded || initialAction) */}
    {/* CTA dinámico con getCTAText() e isCTAEnabled() */}
  </div>
);
```

---

## 🎯 Criterios de Éxito

### Antes de mergear a main:

- [ ] Todos los 9 escenarios de testing pasan
- [ ] Copy exacto según este documento
- [ ] CTA dinámico funciona correctamente
- [ ] Validaciones bloquean cuando corresponde
- [ ] Toasts aparecen en posición/duración correcta
- [ ] Modal de firma se abre automáticamente cuando debe
- [ ] Panel Flujo/NDA se abre automáticamente cuando debe
- [ ] No hay regresiones en flujo viejo (si coexisten)
- [ ] Edge functions reciben estados correctos
- [ ] Diff identificó código obsoleto eliminable

---

## 🔄 Versionado de esta Constitución

### Cómo proponer cambios a este documento:

1. **Abrir issue:** "Propuesta de cambio a LEGAL_CENTER_CONSTITUTION.md"
2. **Justificar:** Por qué la regla actual no funciona
3. **Demostrar:** Con ejemplos de UX o bugs
4. **Aprobar:** Consenso de equipo antes de modificar

### Historial de versiones:

- **v2.0** (2025-12-17): Versión inicial post-Fase 5
  - Incorpora principios de flujo certificación-primero
  - Define 4 acciones + combinaciones
  - Establece CTA dinámico
  - Copy de toasts inmutable

---

**Este documento protege al producto, al equipo y a las decisiones futuras.**
