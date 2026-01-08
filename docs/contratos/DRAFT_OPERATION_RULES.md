# CONTRATO CANÓNICO — DRAFT OPERATIONS

**EcoSign · Reglas Operativas**

---

**Estado:** CANÓNICO
**Fecha:** 2026-01-09
**Versión:** 1.0
**Naturaleza:** Contrato OPERATIVO (no probatorio)
**Scope:** Persistencia de trabajo preparatorio sin validez legal

---

## 0️⃣ PRINCIPIO FUNDAMENTAL

**Un Draft representa intención operativa, no un hecho probatorio.**

Por lo tanto:

- ❌ NO tiene validez legal
- ❌ NO produce evidencia
- ❌ NO afecta la verdad canónica
- ❌ NO entra al ledger probatorio

Un draft es **preparación**, no **certificación**.

---

## 1️⃣ DEFINICIÓN FORMAL

### 1.1 ¿Qué es un Draft Operativo?

Un **Draft** es una operación persistida que contiene:

- Documentos aún **no protegidos**
- Estructura organizativa
- Metadata de preparación
- Contexto humano de trabajo

### 1.2 Características

Un draft puede ser:
- ✅ Abandonado
- ✅ Retomado
- ✅ Descartado
- ✅ Editado
- ✅ Reordenado

Un draft **NO** puede ser:
- ❌ Verificado externamente
- ❌ Usado como evidencia
- ❌ Compartido públicamente
- ❌ Firmado legalmente

---

## 2️⃣ SEPARACIÓN DE PLANOS (CRÍTICO)

Este contrato define la separación absoluta entre:

### 🟦 Plano OPERATIVO (humano, UX, negocio)

- Operaciones
- Carpetas
- **Drafts** ← vivimos aquí
- Organización
- Persistencia de trabajo
- "Todavía no lo mandé"

### 🟥 Plano PROBATORIO (criptográfico, legal)

- Hashes
- Events[]
- TSA
- Anchor
- Firma
- Verificación

**REGLA DE ORO:**

El plano operativo **JAMÁS** influye en el hash.
El plano probatorio **JAMÁS** asume intención humana.

---

## 3️⃣ INVARIANTES ABSOLUTAS (MUST NOT)

### 🚫 Regla 1 — Drafts NO generan eventos probatorios

**MUST NOT**

Un draft **NO DEBE** generar eventos en `document_entities.events[]`

Razón: Los eventos canónicos son inmutables y probatorios. Un draft es mutable y preparatorio.

### 🚫 Regla 2 — Drafts NO tienen hash protegido

**MUST NOT**

Un draft **NO DEBE**:
- Generar TSA
- Hacer anchor blockchain
- Calcular `source_hash` final
- Crear `witness_hash`

Razón: La protección criptográfica es un hecho, no una intención.

### 🚫 Regla 3 — Drafts NO modifican source_hash

**MUST NOT**

El `source_hash` de un documento en draft:
- Permanece `undefined`
- O es provisional (no canónico)

Razón: El hash final solo existe cuando se protege.

### 🚫 Regla 4 — Drafts NO son verificables

**MUST NOT**

Un draft **NO DEBE** aparecer en:
- `verify.ecosign.app`
- APIs públicas de verificación
- Exports de evidencia

Razón: No hay nada que verificar todavía.

---

## 4️⃣ CASOS DE USO CANÓNICOS

### Caso 1: Inmobiliaria

> "Tengo 15 contratos preparados para venta de propiedad.
> Todavía no apareció comprador.
> Cuando aparezca, los protejo y envío todos juntos."

**Solución:** Draft Operation con 15 documentos.

### Caso 2: Agencia de Casting

> "Necesito contratos de 30 modelos para un comercial.
> Todavía no sé quiénes serán seleccionados.
> Preparo todo, cuando se confirme el elenco, protejo solo los necesarios."

**Solución:** Draft Operation con 30 documentos. Se protegen selectivamente.

### Caso 3: Crash Recovery

> "Estaba preparando una operación con 10 documentos.
> Se me cerró la laptop.
> Cuando vuelvo, quiero retomar donde dejé."

**Solución:** Draft persistido server-side. Recuperación automática.

---

## 5️⃣ MODELO DE DATOS (OPERATIVO)

### 5.1 Tabla: operations

```sql
CREATE TABLE operations (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  status TEXT CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Nota:** `status = 'draft'` indica que la operación aún no tiene documentos protegidos.

### 5.2 Tabla: operation_documents (draft)

```sql
CREATE TABLE operation_documents (
  id UUID PRIMARY KEY,
  operation_id UUID NOT NULL,
  document_entity_id UUID, -- puede ser NULL si aún no se protegió
  draft_file_ref TEXT, -- referencia cifrada al archivo temporal
  draft_metadata JSONB, -- posiciones, orden, notas
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by UUID
);
```

**Nota:** Cuando se protege, se crea `document_entity_id` y se limpia `draft_*`.

---

## 6️⃣ PERSISTENCIA Y RECUPERACIÓN

### 6.1 Regla de persistencia

**MUST**

Un draft **DEBE** persistirse server-side para recuperación.

**Motivos:**
- Crash del navegador
- Batería agotada
- Cierre de sesión
- Trabajo interrumpido

### 6.2 UX de recuperación

**Al volver al sistema:**

```
🗂️ Operación en borrador

Tenías una operación en borrador: "Venta Propiedad X"
Creada: 8 ene 2026, 14:32

¿Qué querés hacer?

▶️ Continuar editando
🗑️ Descartar borrador
🗄️ Archivar para después
```

### 6.3 Copy obligatorio

**MUST**

Cuando se muestra un draft, **DEBE** incluir este mensaje:

```
📝 Borrador
Estos documentos todavía no están protegidos ni certificados.
Podés editarlos, organizarlos o descartarlos sin generar evidencia.
```

---

## 7️⃣ PRIVACIDAD Y CUSTODIA (DRAFT)

### 7.1 Regla de oro

**MUST**

Todo archivo en draft **DEBE** estar cifrado si se guarda server-side.

### 7.2 Modos permitidos

- `hash_only` — No se guarda archivo
- `encrypted_custody` — Cifrado, opt-in

**NUNCA:**
- Archivo en texto plano server-side

### 7.3 Clarificación al usuario

```
🔐 Privacidad primero

Por defecto, no guardamos tus archivos.
Si querés, podemos custodiarlo cifrado mientras trabajas en el borrador.

Esto NO afecta la protección final.
```

---

## 8️⃣ TRANSICIÓN CRÍTICA: SALIR DEL DRAFT

### 8.1 Evento humano

El usuario hace click en:

```
🚀 Proteger y enviar documentos
```

### 8.2 Efecto canónico

**En este momento:**

1. Se crean PDF Witness (si aplica)
2. Se calculan hashes finales
3. Se solicitan TSA
4. Se generan eventos canónicos
5. Se abre la historia probatoria
6. El draft **deja de existir como tal**

**Estado final:**

```
operation.status: 'draft' → 'active'
document_entity_id: NULL → UUID válido
draft_file_ref: limpiar
draft_metadata: limpiar
```

### 8.3 Punto de no retorno

**MUST**

Una vez protegido, **NO SE PUEDE** volver a draft.

Razón: La evidencia es inmutable.

---

## 9️⃣ PROHIBICIONES EXPLÍCITAS

### ❌ Cosas que un draft NUNCA debe hacer

Lista explícita (importante):

1. ❌ **Firmar documentos** (ni siquiera "firma de prueba")
2. ❌ **Generar PDFs certificados**
3. ❌ **Mostrar badge de "protegido"**
4. ❌ **Prometer validez legal**
5. ❌ **Ser compartido públicamente**
6. ❌ **Aparecer en verify**
7. ❌ **Generar QR de verificación**
8. ❌ **Crear eventos canónicos**

---

## 🔟 COMUNICACIÓN AL USUARIO (OBLIGATORIA)

### Copy recomendado por contexto

**En lista de operaciones:**

```
📝 Borrador
3 documentos sin proteger
```

**En detalle de operación draft:**

```
⚠️ Esta operación está en borrador

Los documentos todavía no están protegidos ni certificados.
Podés:
- Agregar más documentos
- Editar estructura
- Descartar todo sin generar evidencia

Cuando estés listo:
🚀 Proteger y enviar
```

**Al intentar compartir un draft:**

```
❌ No se puede compartir

Esta operación está en borrador.
Primero protegé los documentos.
```

---

## 1️⃣1️⃣ RELACIÓN CON OTROS CONTRATOS

### Este contrato:

- ✅ **Complementa** OPERACIONES_CONTRACT.md
- ❌ **NO modifica** DOCUMENT_ENTITY_CONTRACT.md
- ❌ **NO toca** HASH_CHAIN_RULES.md
- ❌ **NO afecta** PROTECTION_LEVEL_RULES.md
- ❌ **NO interfiere** con TSA_EVENT_RULES.md
- ❌ **NO altera** ANCHOR_EVENT_RULES.md

### Referencia explícita

```
Este documento define reglas OPERATIVAS, no probatorias.
No interfiere con los contratos probatorios canónicos de EcoSign.
```

---

## 1️⃣2️⃣ DEFINICIÓN DE DONE (P0)

Para considerar drafts implementados:

- ✅ `operations.status` incluye `'draft'`
- ✅ Persistencia server-side cifrada
- ✅ Recuperación tras crash
- ✅ Copy claro: "Borrador sin validez legal"
- ✅ Botón "Proteger y enviar" funcional
- ✅ Transición `draft → active` limpia
- ✅ Prohibición de compartir drafts

---

## 🧭 REGLA DE ORO FINAL

**El draft no es un documento débil.**
**Es una intención que todavía no se convirtió en hecho.**

**Y tu sistema solo certifica hechos.**

---

## 📝 CHANGELOG

### v1.0 (2026-01-09)
- Definición inicial de Draft Operations
- Separación plano operativo vs probatorio
- Invariantes y prohibiciones
- Casos de uso canónicos

---

**Fin del contrato**
