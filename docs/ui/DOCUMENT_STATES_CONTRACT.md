# CONTRATO: Sistema de Estados de Documentos

## REGLA ABSOLUTA

**El estado nunca puede generar estrés.**

- No alerta
- No juzga
- No "grita"
- Solo describe qué está pasando o si ya terminó

---

## REGLAS NO-NEGOCIABLES

### 1. Estados cerrados (no se agregan ad-hoc)

Los estados están definidos y cerrados. No se pueden agregar estados nuevos sin revisar este contrato.

**Estados permitidos:** 13 estados exactos (ver sección Estados Permitidos).

### 2. Tres colores únicos

| Color | Fase | Significado |
|-------|------|-------------|
| Verde | `'green'` | En curso / esperando algo |
| Azul | `'blue'` | Protección activa (valor positivo) |
| Gris | `'gray'` | Proceso completado (estado final) |

**No hay excepciones. No hay warning. No hay error. No hay amarillo. No hay rojo.**

### 3. La tabla nunca comunica fallos

Si algo falla:
- El documento NO entra en estado "error"
- El estado sigue siendo `🟢 En proceso` o `🔵 Protegido`
- La explicación vive en 👁️ "Ver detalle"

**La tabla no castiga al usuario.**

### 4. El estado siempre refleja lo que falta, no el pasado

El estado prioriza:
- ¿Qué falta que pase?
- ¿O si ya terminó todo?

No comunica:
- Nivel probatorio detallado
- Fallas internas
- Redes (Polygon, Bitcoin, TSA, etc.)
- Historial
- Fechas
- Diagnóstico técnico

### 5. "Ver detalle" es el único lugar de explicación

TODO lo que no cabe en el estado simple va al modal:
- Timeline de eventos
- Detalles probatorios
- Errores con explicación
- Acciones correctivas
- Fechas completas

---

## ESTADOS PERMITIDOS (CERRADOS)

### 🟢 Verde (proceso activo)

| Label | Cuándo |
|-------|--------|
| `Esperando firma` | Workflow activo, 1 firmante pendiente |
| `Esperando firma (n/m)` | Workflow activo, múltiples firmantes (ej: "Esperando firma (1/2)") |
| `Esperando firmas` | Workflow activo, genérico |
| `Protegiendo` | Sin TSA confirmado aún |
| `En proceso` | Estado genérico/fallback en proceso |

### 🔵 Azul (protección activa)

| Label | Cuándo |
|-------|--------|
| `Protegido` | TSA confirmado (ACTIVE) |
| `Protección reforzada` | TSA + 1 blockchain (REINFORCED) |

### ⚪ Gris (estado final)

| Label | Cuándo |
|-------|--------|
| `Firmado` | 1 firmante completado |
| `Firmas completadas` | Múltiples firmantes completados |
| `Protección máxima` | TSA + 2 blockchains (TOTAL) |
| `Protección completada` | Alternativa a "máxima" |
| `Listo` | Genérico final |
| `Archivado` | Archivado explícitamente |

**Total: 13 estados**

---

## ORDEN DE DECISIÓN (ESTRICTO)

La función `deriveDocumentState()` debe seguir este orden:

```
1. ¿Está archivado?
   → ⚪ Archivado

2. ¿Tiene workflow de firma?
   a. ¿Todas las firmas completadas?
      → ⚪ Firmado / Firmas completadas
   b. ¿Faltan firmas?
      → 🟢 Esperando firma / Esperando firma (n/m)

3. ¿Qué nivel de protección tiene?
   a. TOTAL → ⚪ Protección máxima
   b. REINFORCED → 🔵 Protección reforzada
   c. ACTIVE → 🔵 Protegido
   d. NONE → 🟢 Protegiendo

4. Fallback (siempre seguro)
   → 🟢 En proceso
```

**Si algo no encaja → fallback `En proceso 🟢` (siempre seguro)**

---

## FLUJO LÓGICO CORRECTO

### Protección SIN firma

```
🟢 Protegiendo
   ↓
🔵 Protegido
   ↓
🔵 Protección reforzada
   ↓
⚪ Protección máxima
```

### Protección CON firma

```
🟢 Esperando firma (1/2)
   ↓
🟢 Esperando firma (2/2)
   ↓
⚪ Firmado
```

(En detalle se ve que está protegido)

**👉 El estado siempre prioriza lo que falta, no lo que ya pasó.**

---

## ARQUITECTURA

### Función Core Canónica

```typescript
// client/src/lib/deriveDocumentState.ts

export type StatePhase = 'green' | 'blue' | 'gray';

export interface DocumentState {
  label: string;      // "Esperando firma (1/2)"
  phase: StatePhase;  // 'green' | 'blue' | 'gray'
}

export function deriveDocumentState(
  document: DocumentEntity,
  workflows?: SignatureWorkflow[],
  signers?: WorkflowSigner[]
): DocumentState;
```

**Esta función:**
- NO renderiza
- NO sabe de colores CSS
- Devuelve solo `{ label, phase }`
- Sigue el orden de decisión estricto
- Tiene fallback seguro

### Componente Consumidor

```typescript
// client/src/components/DocumentRow.tsx

const state = deriveDocumentState(document, workflows, signers);

<StatusBadge label={state.label} phase={state.phase} />
```

**DocumentRow:**
- No interpreta eventos
- No decide estados
- No pregunta "qué pasó"
- Solo consume el resultado

**Esto garantiza:**
- Coherencia entre documentos, operaciones y borradores
- Cero divergencias visuales

---

## TOOLTIPS (MINIMALISTAS)

Solo si aplica (ej. firmas):

```
✓ firmado
· pendiente
```

**Sin:**
- Timestamps
- Contadores de tiempo
- Palabras como "esperando hace…"

**El tooltip confirma, no presiona.**

---

## PALETA DE COLORES

```css
/* 🟢 Verde - En proceso */
.estado-verde {
  background: #DCFCE7;  /* green-100 */
  color: #166534;       /* green-800 */
}

/* 🔵 Azul - Protección activa */
.estado-azul {
  background: #DBEAFE;  /* blue-100 */
  color: #1E40AF;       /* blue-800 */
}

/* ⚪ Gris - Final */
.estado-gris {
  background: #F3F4F6;  /* gray-100 */
  color: #6B7280;       /* gray-600 */
}
```

---

## QUÉ NO HACER (IMPORTANTE)

❌ No agregar más estados sin revisar este contrato
❌ No diferenciar "anclando" en la tabla
❌ No mostrar refuerzos técnicos en la tabla
❌ No usar amarillo, rojo, o "error" en la tabla
❌ No optimizar antes de cerrar el contrato
❌ No contaminar la UX con detalles técnicos

---

## CASOS ESPECIALES

### Error en TSA (crítico)

**En la tabla:**
```
🟢 En proceso
```

**En el modal:**
```
ℹ️ La protección no se completó

Hubo un problema al solicitar el sello de tiempo.
Podés reintentar o contactar con soporte.

[Reintentar protección]  [Contactar soporte]
```

### Error en anclaje (no crítico)

**En la tabla:**
```
🔵 Protegido
```

**En el modal:**
```
ℹ️ El registro en Bitcoin no se completó

El registro en Bitcoin no se completó debido a
saturación de la red. Tu documento está protegido
y tiene validez probatoria.

[Reintentar anclaje]
```

---

## VALIDACIÓN

Antes de mergear cualquier cambio, validar:

1. ¿El estado usa solo verde/azul/gris?
2. ¿El estado refleja lo que falta?
3. ¿No hay errores en la tabla?
4. ¿No hay conceptos técnicos en la tabla?
5. ¿La función sigue el orden de decisión estricto?

Si alguna respuesta es NO → no mergear.

---

**Fin del Contrato**

Este documento es la fuente de verdad para el sistema de estados.
Cualquier cambio debe actualizarse aquí primero.
