# 🔄 Migración de Servicios Legacy → V2

**Fecha:** 2025-12-17  
**Objetivo:** Migrar servicios/helpers/contratos sin refactorizar lógica de negocio

---

## 📋 Análisis del Legacy

### 1. Servicios / Llamadas a Backend (a migrar)

#### Edge Functions identificadas:
- `process-signature` → Procesamiento de firma
- `start-signature-workflow` → Iniciar flujo de firmas
- `legal-timestamp` → TSA timestamp
- `anchor-polygon` → Anclaje en Polygon
- `anchor-bitcoin` → Anclaje en Bitcoin

#### Helpers de backend:
- `certifyFile()` → Certificación completa
- `saveUserDocument()` → Guardar documento en Supabase
- `downloadEcox()` → Descargar certificado
- `signWithSignNow()` → Integración SignNow
- `applySignatureToPDF()` → Aplicar firma a PDF
- `addSignatureSheet()` → Añadir hoja de firma
- `anchorToPolygon()` → Wrapper de anclaje Polygon

### 2. Handlers críticos (lógica de negocio)

#### `handleCertify()` → Core de certificación
- Orquesta: TSA + Polygon + Bitcoin
- Payload con forensicConfig
- Manejo de errores y toasts

#### `handleFinalizeClick()` → Ya migrado parcialmente
- Validaciones (✅ hecho)
- Descarga PDF
- Guardado documento
- Animación y cierre

#### `handleSignNowEdit()` → Edición de PDF
- Modal SignNow
- Callback de documento firmado
- Actualización de preview

### 3. Helpers reutilizables (lógica pura)

#### Derivadores de estado:
```javascript
// ¿Puede finalizar?
const canFinalize = () => {
  if (!file) return false;
  if (mySignature && !userHasSignature) return false;
  if (mySignature && !signatureType) return false;
  if (workflowEnabled && !emailInputs.some(e => e.email.trim())) return false;
  return true;
};
```

#### Validadores:
```javascript
// Validar emails
const hasValidEmails = () => emailInputs.some(e => e.email.trim());

// Firma lista
const hasSignatureReady = () => userHasSignature && signatureType;
```

### 4. Contratos de estado (inmutables)

Ya migrados en V2:
- ✅ `forensicEnabled`
- ✅ `forensicConfig`
- ✅ `signatureType`
- ✅ `emailInputs`
- ✅ `ndaText`

Faltantes críticos:
- ⚠️ `downloadPdfChecked` / `savePdfChecked` (opciones de descarga)
- ⚠️ `certificateData` (respuesta de certificación)
- ⚠️ `showSignatureOnPreview` (control modal firma)
- ⚠️ Estados de SignNow

---

## 🎯 Plan de Migración (orden específico)

### Fase 1: Estados faltantes (sin romper nada)
1. Copiar estados de descarga/guardado del legacy
2. Copiar estados de certificateData
3. Copiar estados de SignNow (aunque no se use ahora)

### Fase 2: handleCertify completo
1. Copiar función completa desde legacy
2. Mantener estructura de try/catch
3. Mantener toasts originales (excepto los de Constitución)
4. Verificar que envía mismo payload

### Fase 3: handleFinalizeClick completo
1. Ya tiene validaciones (✅)
2. Añadir lógica de descarga PDF
3. Añadir lógica de guardado
4. Mantener animación y cierre

### Fase 4: Handlers de firma
1. handleSignNowEdit (integración SignNow)
2. Callbacks de firma aplicada
3. Actualización de preview

### Fase 5: Helpers de validación
1. Extraer canFinalize (aunque ya existe isCTAEnabled)
2. Extraer hasValidEmails
3. Consolidar con funciones Constitución

---

## ⚠️ Reglas estrictas

### NO hacer:
- ❌ Cambiar nombres de campos en payload
- ❌ Cambiar orden de ejecución de servicios
- ❌ Modificar lógica de try/catch
- ❌ Eliminar código "por si acaso"
- ❌ Cambiar copy (usar Constitución)
- ❌ Optimizar sin aprobaión

### SÍ hacer:
- ✅ Copiar funciones completas
- ✅ Mantener comentarios críticos
- ✅ Respetar contratos backend
- ✅ Documentar qué se migró
- ✅ Testing de cada fase

---

## 📊 Checklist de migración

### Estados:
- [ ] downloadPdfChecked / savePdfChecked
- [ ] certificateData completo
- [ ] showSignatureOnPreview
- [ ] Estados SignNow

### Servicios:
- [ ] handleCertify() completo
- [ ] handleFinalizeClick() completo
- [ ] handleSignNowEdit()
- [ ] Callbacks de firma

### Helpers:
- [ ] canFinalize() o integrar con isCTAEnabled()
- [ ] hasValidEmails()
- [ ] hasSignatureReady()

### Validación:
- [ ] Edge functions reciben mismo payload
- [ ] No hay regresiones en flujo
- [ ] 9 escenarios de testing pasan
- [ ] Certificación completa funciona (TSA + Polygon + Bitcoin)

---

**Siguiente paso:** Empezar con Fase 1 (estados faltantes)
