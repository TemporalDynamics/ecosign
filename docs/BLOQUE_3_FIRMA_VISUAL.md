# 🎯 BLOQUE 3 — FIRMA VISUAL + CAMPOS

**Estado:** IN PROGRESS  
**Fecha inicio:** 2026-01-06  
**Objetivo:** Implementar firma estampada real en PDF con drag & drop, campos múltiples y batch básico

---

## 📋 SCOPE EXACTO (NO NEGOCIABLE)

### ✅ Qué SÍ se implementa

1. **Firma estampada real en PDF**
   - Drag & drop de campo de firma
   - Preview en tiempo real
   - Posicionamiento preciso (x, y, width, height)

2. **Campos múltiples**
   - Firma (signature)
   - Texto (text)
   - Fecha (date)
   - Todos con drag & drop

3. **Duplicar firma en todas las páginas**
   - Opción toggle "Aplicar en todas las páginas"
   - Mismas coordenadas relativas

4. **Batch básico de emails**
   - Copy-paste de lista de emails
   - Auto-detección y parseo
   - Validación básica

### ❌ Qué NO se implementa (fuera de scope)

- Tracking de scroll
- Campos condicionales
- Reglas de validación complejas
- Firma biométrica
- OCR / Auto-detección de campos
- Integración con terceros (SignNow, DocuSign, etc.)

---

## 🧠 PRINCIPIOS ARQUITECTÓNICOS

### P1 — Separación de responsabilidades

```
Centro Legal V2    → Configuración (quién firma, en qué orden)
Signature Workshop → Posicionamiento visual de campos
Backend            → Certificación + Storage
```

### P2 — Campos = Metadata, no verdad

Los campos son **instrucciones de renderizado**, no verdad probatoria.

La verdad está en:
- `signature_hash`
- `certification_data`
- `events[]`

### P3 — PDF Witness opcional

Si el usuario NO requiere PDF final:
- Se registran coordenadas
- Se guarda metadata
- NO se renderiza PDF

Si el usuario SÍ requiere PDF:
- Se genera PDF Witness con campos estampados
- Se guarda como artefacto derivado

---

## 🗂️ ESTRUCTURA DE DATOS

### Field Definition (Frontend)

```typescript
type FieldType = 'signature' | 'text' | 'date';

interface SignatureField {
  id: string;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assignedTo?: string; // email del firmante
  required: boolean;
  value?: string; // para text/date
  applyToAllPages?: boolean; // solo para signature
}
```

### Signature Coordinates (Backend)

```sql
-- workflow_signatures.signature_coordinates
{
  "fields": [
    {
      "type": "signature",
      "page": 1,
      "x": 100,
      "y": 500,
      "width": 200,
      "height": 50,
      "applyToAllPages": true
    },
    {
      "type": "date",
      "page": 1,
      "x": 320,
      "y": 500,
      "width": 150,
      "height": 30
    }
  ]
}
```

---

## 📐 COMPONENTES A CREAR/MODIFICAR

### 1. `FieldToolbar.tsx` (NUEVO)

**Ubicación:** `/client/src/components/signature-flow/FieldToolbar.tsx`

**Propósito:** Selector de tipo de campo

```tsx
interface FieldToolbarProps {
  onFieldSelect: (type: FieldType) => void;
  selectedField: FieldType | null;
}
```

**UI:**
```
┌─────────────────────────────────────┐
│  [ ✍️ Firma ]  [ T Texto ]  [ 📅 Fecha ]  │
└─────────────────────────────────────┘
```

---

### 2. `FieldCanvas.tsx` (NUEVO)

**Ubicación:** `/client/src/components/signature-flow/FieldCanvas.tsx`

**Propósito:** Canvas de posicionamiento de campos sobre PDF

```tsx
interface FieldCanvasProps {
  documentUrl: string;
  fields: SignatureField[];
  onFieldAdd: (field: Omit<SignatureField, 'id'>) => void;
  onFieldMove: (id: string, x: number, y: number) => void;
  onFieldResize: (id: string, width: number, height: number) => void;
  onFieldDelete: (id: string) => void;
  currentPage: number;
}
```

**Comportamiento:**
- Click en canvas → crea campo del tipo seleccionado
- Drag campo → mueve
- Drag esquinas → redimensiona
- Click derecho → elimina

---

### 3. `SignerFieldAssignment.tsx` (NUEVO)

**Ubicación:** `/client/src/components/signature-flow/SignerFieldAssignment.tsx`

**Propósito:** Asignar campos a firmantes específicos

```tsx
interface SignerFieldAssignmentProps {
  fields: SignatureField[];
  signers: WorkflowSigner[];
  onAssign: (fieldId: string, signerEmail: string) => void;
}
```

**UI:**
```
┌────────────────────────────────────┐
│ Campo: Firma (Página 1)            │
│ Asignado a: [juan@example.com ▼]  │
└────────────────────────────────────┘
```

---

### 4. `BatchEmailInput.tsx` (NUEVO)

**Ubicación:** `/client/src/components/centro-legal/modules/flow/BatchEmailInput.tsx`

**Propósito:** Input de múltiples emails (copy-paste)

```tsx
interface BatchEmailInputProps {
  onEmailsExtracted: (emails: string[]) => void;
}
```

**Comportamiento:**
- Textarea libre
- Auto-detección de emails con regex
- Validación básica
- Preview de lista extraída

**Regex sugerido:**
```typescript
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
```

---

### 5. Modificar `SignatureWorkshop.tsx`

**Cambios mínimos:**
- Extraer lógica de drag & drop a hook `useFieldDragDrop`
- Soportar múltiples campos (no solo firma)
- Integrar con `FieldCanvas`

---

## 🔄 FLUJO DE USUARIO (End-to-End)

### Escenario: 3 firmantes, 1 campo de firma en todas las páginas

```
1. Usuario abre Centro Legal V2
   └─ Activa "Flujo de Firmas"

2. Agrega 3 emails:
   └─ juan@example.com
   └─ maria@example.com  
   └─ pedro@example.com

3. Click "Posicionar campos"
   └─ Abre FieldCanvas sobre PDF

4. Selecciona "Firma" en FieldToolbar
   └─ Click en página 1 (posición deseada)
   └─ Campo aparece con bordes editables

5. Activa toggle "Aplicar en todas las páginas"
   └─ Campo se replica en páginas 2, 3, 4...

6. Asigna campo a "juan@example.com"
   └─ En sidebar de asignación

7. Click "Guardar configuración"
   └─ Vuelve a Centro Legal V2

8. Click "Iniciar Flujo"
   └─ Backend crea workflow con fields metadata

9. Juan recibe email → abre link
   └─ Ve campo de firma pre-posicionado
   └─ Dibuja firma en canvas flotante
   └─ Firma se estampa automáticamente en campo

10. Backend certifica:
    └─ signature_coordinates guarda fields[]
    └─ TSA + Polygon + Anchors
    └─ PDF Witness (opcional) con firma estampada
```

---

## 🛠️ IMPLEMENTACIÓN PASO A PASO

### FASE 1 — Componentes base (2-3 días)

- [ ] `FieldToolbar.tsx`
- [ ] `FieldCanvas.tsx` (sin drag & drop todavía)
- [ ] Tipos TypeScript (`SignatureField`, `FieldType`)

### FASE 2 — Interacción (2-3 días)

- [ ] Hook `useFieldDragDrop`
- [ ] Drag & drop de campos
- [ ] Resize con esquinas
- [ ] Delete con click derecho

### FASE 3 — Asignación (1-2 días)

- [ ] `SignerFieldAssignment.tsx`
- [ ] Wire con módulo Flow
- [ ] Validación: todos los campos asignados

### FASE 4 — Batch emails (1 día)

- [ ] `BatchEmailInput.tsx`
- [ ] Parseo con regex
- [ ] Validación básica

### FASE 5 — Integración Backend (2 días)

- [ ] Modificar `start-signature-workflow` para recibir `fields[]`
- [ ] Guardar en `signature_coordinates`
- [ ] Modificar `/sign/[token]` para pre-posicionar campos

### FASE 6 — PDF Witness (opcional, 2-3 días)

- [ ] Generar PDF con campos estampados
- [ ] Usar `pdf-lib` o similar
- [ ] Guardar como artefacto derivado

---

## 🚫 NO-RESPONSABILIDADES

Este bloque NO:

- ❌ Valida contenido de campos (eso es backend)
- ❌ Renderiza PDF final (eso es PDF Witness)
- ❌ Envía emails (eso es backend)
- ❌ Calcula hashes (eso es backend)
- ❌ Decide niveles de protección (eso es derivado)

Solo:
- ✅ Posiciona campos visualmente
- ✅ Guarda coordenadas como metadata
- ✅ Facilita UX de configuración

---

## ✅ DEFINICIÓN DE DONE

BLOQUE 3 está terminado si y solo si:

1. ✅ Usuario puede arrastrar campos de firma/texto/fecha sobre PDF
2. ✅ Usuario puede duplicar firma en todas las páginas
3. ✅ Usuario puede asignar campos a firmantes específicos
4. ✅ Usuario puede pegar lista de emails (batch)
5. ✅ Backend recibe y guarda `fields[]` correctamente
6. ✅ Firmantes ven campos pre-posicionados al firmar
7. ✅ Tests manuales pasan sin regresiones

---

## 📊 IMPACTO EN EL ROADMAP

### Bloquea:
- BLOQUE 4 — PDF Witness avanzado
- BLOQUE 5 — Firma certificada (opt-in)

### No bloquea:
- NDA (ya implementado)
- Protección (ya implementado)
- Compartir v2 (independiente)

---

**Próximo paso:** Crear `FieldToolbar.tsx` y tipos base.
