# CONTRATO CANÓNICO — OPERACIONES

**EcoSign · P0 Demo Broker**

---

**Estado:** CANÓNICO
**Fecha:** 2026-01-09
**Versión:** 1.0
**Scope:** Organización, custodia lógica y lectura humana de la evidencia
**No cubre:** Layout visual, sharing, verificador, QR

---

## 0️⃣ PROPÓSITO

Definir cómo EcoSign organiza documentos protegidos en **Operaciones**, garantizando:

- ✅ Continuidad probatoria
- ✅ No pérdida de información
- ✅ Claridad para usuarios no técnicos
- ✅ Lectura judicial coherente

Este contrato existe para evitar:

- ❌ "Borrados" implícitos
- ❌ Carpetas engañosas
- ❌ Confusión entre archivo, evidencia y proceso

---

## 1️⃣ DEFINICIÓN FUNDAMENTAL

### 1.1 Operación

**Una Operación es un contenedor lógico de hechos relacionados.**

- Una operación representa **un caso**, no un archivo.
- Ejemplos:
  - Venta de una propiedad
  - Firma de un NDA
  - Proceso de negociación
  - Firma presencial con múltiples versiones

### 1.2 Documento

**Un Documento es una entidad protegida con evidencia propia.**

Un documento:
- ✅ Puede existir sin operación
- ✅ Puede pertenecer a una o varias operaciones
- ✅ Mantiene su identidad y evidencia independientemente

---

## 2️⃣ REGLAS DURAS (INNEGOCIABLES)

### 🔒 Regla 1 — Nada protegido se borra

**MUST**

Un documento con protección probatoria:

- ❌ NO puede ser eliminado
- ❌ NO puede desaparecer del sistema
- ❌ NO puede perder su eco ni su historial

**Eliminar solo significa:**
- Ocultar visualmente
- Archivar
- Sacar del flujo activo

**Nunca destruir evidencia.**

### 🔒 Regla 2 — Operaciones NO mutan la verdad

**MUST**

Mover un documento entre operaciones:

- ❌ NO cambia hashes
- ❌ NO altera eventos
- ❌ NO modifica el eco
- ❌ NO reescribe historia

**Las operaciones organizan, no transforman.**

### 🔒 Regla 3 — El historial es inmutable

**MUST**

Todo evento relevante:
- ✅ Queda registrado
- ✅ Permanece accesible
- ✅ Nunca se edita

La UI puede:
- Resumir
- Ocultar
- Agrupar

**Pero la historia no se reescribe.**

---

## 3️⃣ ESTADOS DE UNA OPERACIÓN

EcoSign define **tres estados canónicos:**

### 🟢 ACTIVA

- Operación en curso
- Documentos visibles
- Flujos abiertos

### ⚪ CERRADA

- Proceso finalizado
- Solo lectura
- Documentos accesibles

### ⚫ ARCHIVADA

- Fallida / Cancelada / Abandonada
- NO visible por defecto
- Recuperable desde historial

**ARCHIVADA ≠ ELIMINADA**

---

## 4️⃣ DOCUMENTOS DENTRO DE UNA OPERACIÓN

### 4.1 Documentos activos

**MUST**

- Documentos relevantes al proceso actual
- Visibles por defecto

### 4.2 Documentos archivados (dentro de la operación)

**Ejemplo:**
- "Versión cancelada"
- "Borrador firmado y descartado"

**MUST**

- Seguir existiendo
- Conservar evidencia
- No generar ruido visual

---

## 5️⃣ HISTORIAL (LECTURA HUMANA)

### 5.1 Ubicación del historial

**MUST**

El historial vive **DENTRO de la operación**, no en un módulo externo.

### 5.2 Naturaleza del historial

El historial es:
- ✅ Una lectura humana del eco
- ❌ NO un log técnico
- ❌ NO hashes crudos

**Ejemplos de eventos mostrables:**

```
📄 Documento creado
🔐 NDA aceptado
✍️ Documento firmado por X
🗂️ Documento archivado
✅ Operación cerrada
```

---

## 6️⃣ CREACIÓN Y ASIGNACIÓN DE OPERACIONES

### 6.1 Desde Centro Legal

**SHOULD**

Al finalizar un flujo, el sistema DEBE ofrecer:
- ➕ Crear nueva operación
- 📂 Agregar a operación existente
- 💾 Guardar sin operación

**Nada obligatorio. Todo reversible.**

### 6.2 Desde Documents

**MUST**

Cada documento DEBE permitir:
- "Mover a operación"
- Crear operación nueva
- Cambiar de operación

**Esto NO altera evidencia.**

---

## 7️⃣ DOCUMENTS VS OPERACIONES (MODELO MENTAL)

### Documents
- Inventario completo
- Vista plana
- Estado actual
- Acciones rápidas

### Operaciones
- Contexto
- Narrativa
- Historia
- Lectura probatoria

**Documents = qué existe**
**Operaciones = qué pasó**

---

## 8️⃣ CASO JUDICIAL / VERIFICACIÓN EXTERNA

### 8.1 Pedido de una operación

Si una autoridad solicita:

> "Tráigame la Operación B"

EcoSign puede:
- ✅ Afirmar su existencia
- ✅ Probar qué documentos participaron
- ✅ Mostrar eventos asociados

EcoSign NO está obligado a:
- ❌ Entregar archivos sin autorización
- ❌ Exponer contenido privado

### 8.2 Eco de una operación (P2)

**MAY**

- Existir un eco de operación
- Contener índice de documentos + eventos
- Servir como prueba contextual

---

## 9️⃣ LO QUE ESTE CONTRATO PROHÍBE

**MUST NOT**

- ❌ Borrar documentos protegidos
- ❌ Ocultar eventos
- ❌ Usar carpetas como filesystem
- ❌ Mezclar permisos con operaciones
- ❌ Versionar operaciones como archivos

---

## 🔟 DEFINICIÓN DE DONE (P0)

Para considerar esto implementado:

- ✅ Existen Operaciones como entidad
- ✅ Estados: Activa / Cerrada / Archivada
- ✅ Documentos no se pierden
- ✅ Historial vive dentro de la operación
- ✅ Documents y Operaciones son vistas distintas
- ✅ Mover documentos NO altera evidencia

---

## 🧭 REGLA DE ORO FINAL

**La evidencia no se organiza para el sistema.**
**Se organiza para que un humano entienda qué pasó.**

Si una acción:
- ❌ Confunde al usuario
- ❌ Confunde al broker
- ❌ Confunde a un juez

👉 **Rompe este contrato.**

---

## 📋 IMPLEMENTACIÓN TÉCNICA

### Schema de base de datos

```sql
-- Tabla: operations
CREATE TABLE operations (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relación many-to-many: operation_documents
CREATE TABLE operation_documents (
  id UUID PRIMARY KEY,
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  document_entity_id UUID NOT NULL REFERENCES document_entities(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  UNIQUE (operation_id, document_entity_id)
);
```

### Estados válidos

```typescript
type OperationStatus = 'active' | 'closed' | 'archived';
```

### Operaciones permitidas

```typescript
// ✅ Crear operación vacía
createOperation({ name, description })

// ✅ Agregar documento a operación
addDocumentToOperation({ operationId, documentId })

// ✅ Remover documento de operación (no borra el documento)
removeDocumentFromOperation({ operationId, documentId })

// ✅ Cambiar estado de operación
updateOperationStatus({ operationId, status })

// ❌ PROHIBIDO: Eliminar operación con documentos
deleteOperation({ operationId }) // Solo si está vacía
```

---

## 📝 COPY CANÓNICO (UX)

### Botones y acciones

```
➕ Nueva operación
📂 Mover a operación
🗂️ Ver operación
✅ Cerrar operación
🗄️ Archivar operación
```

### Estados en UI

```
🟢 Activa (X documentos)
⚪ Cerrada (Y documentos)
⚫ Archivada (Z documentos)
```

### Mensaje cuando se mueve un documento

```
✅ Documento movido a "Operación X"
ℹ️ La evidencia del documento no ha cambiado
```

---

## 🔗 RELACIONADO

- [DOCUMENT_ENTITY_CONTRACT.md](./DOCUMENT_ENTITY_CONTRACT.md)
- [LEGAL_CENTER_STAGE_CONTRACT.md](./LEGAL_CENTER_STAGE_CONTRACT.md)
- [PROTECTION_LEVEL_RULES.md](./PROTECTION_LEVEL_RULES.md)

---

**Fin del contrato**
