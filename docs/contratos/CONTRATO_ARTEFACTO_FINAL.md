# FINAL_ARTIFACT_CONTRACT.md

**Estado:** Canónico  
**Versión:** 1.1  
**Fecha:** 2026-01-15

---

## 0. Propósito

Este contrato define qué es, cómo se genera y cuándo se considera válido el **Artefacto Final del Workflow**.

El artefacto final es el resultado verificable, inmutable y entregable de un workflow de firmas completado.

### Este contrato:
- ✅ Define verdad técnica verificable
- ❌ NO define UI
- ❌ NO define pricing
- ❌ NO define validez legal por jurisdicción

---

## 1. Definición canónica

### Artefacto Final del Workflow

> Documento inmutable generado al completarse un workflow, que encapsula el contenido firmado y la evidencia mínima verificable del proceso, y que puede ser entregado y verificado de forma independiente al sistema que lo creó.

**Si un objeto no cumple esta definición, no es un artefacto final.**

📌 **Nota:**  
El artefacto final NO es un witness intermedio ni una representación progresiva del documento durante el workflow.

---

## 2. Momento de creación (Trigger)

### MUST
- El artefacto final solo puede generarse cuando el workflow entra en estado `completed`.
- No puede generarse antes.
- No puede regenerarse después (ver idempotencia en §4).

### MUST NOT
- No debe generarse por acciones de UI.
- No debe depender de intervención manual.

### Trigger canónico
- **Evento:** `workflow.completed`
- **Fuente:** motor de workflow (backend)

---

## 3. Contenido del artefacto

El artefacto final DEBE contener tres capas inseparables.

### 3.1 Capa Documento (contenido firmado)

#### MUST
- Incluir el documento base del workflow.
- Reflejar todas las firmas recolectadas:
  - posición
  - página
  - representación visual (si aplica)

#### MUST NOT
- No debe permitir modificaciones posteriores.
- No debe depender de recursos externos para ser interpretado.

📌 **Nota de implementación:**  
El formato del artefacto final (por ejemplo PDF/A) es una decisión de implementación. El contrato solo exige que el formato sea estable, autocontenible e interpretable sin dependencias externas.

---

### 3.2 Capa Evidencia (witness)

#### MUST
- Incluir evidencia mínima verificable del proceso:
  - identificadores de firmantes
  - timestamps
  - referencia al workflow
  - hashes relevantes

La evidencia debe ser:
- legible por humanos
- estructurada para verificación técnica

#### SHOULD
- Incluir referencias a:
  - eventos relevantes
  - anclajes (TSA / blockchain)
  - identificador del contenedor .eco

#### MAY
- Incluir metadata adicional (IP, device, etc.) según nivel de assurance.

---

### 3.3 Capa Identidad del Artefacto

#### MUST
El artefacto final DEBE tener:
- hash criptográfico estable
- identificador único (`artifact_id`)
- referencia explícita al `workflow_id`

#### MUST (Idempotencia)
El mismo workflow DEBE producir siempre un artefacto final **criptográficamente equivalente**, incluso ante reintentos del sistema.

---

## 4. Inmutabilidad e idempotencia

### MUST
- El artefacto final es inmutable.
- Una vez generado:
  - no se sobrescribe
  - no se edita
  - no se vuelve a generar con contenido distinto

### MUST
El sistema debe prevenir generación duplicada mediante:
- locking, o
- una tabla de control (por ejemplo `workflow_artifacts`)

---

## 5. Almacenamiento y entrega

### MUST
- El artefacto final DEBE almacenarse en una ubicación persistente.
- Debe poder:
  - descargarse
  - compartirse
  - verificarse en el futuro

### MUST NOT
- No debe vivir solo en memoria.
- No debe depender de la sesión del usuario.

---

## 6. Evento canónico de cierre

### Evento
`workflow.artifact_finalized`

### MUST
- Emitirse una sola vez por workflow.
- Emitirse solo después de que el artefacto esté almacenado.

### Payload mínimo

```json
{
  "type": "workflow.artifact_finalized",
  "workflow_id": "uuid",
  "artifact_id": "uuid",
  "artifact_hash": "sha256:...",
  "artifact_url": "https://...",
  "finalized_at": "2026-01-15T12:00:00Z"
}
```

---

## 7. Verificación independiente

### Criterio mínimo de verificación

Un tercero debe poder verificar que un artefacto corresponde a un workflow específico utilizando únicamente:
- el artefacto
- su hash
- la evidencia incluida

**Sin requerir acceso a la cuenta original.**

---

## 8. Referencias

- `DECISION_LOG_3.0.md` — Decisiones de arquitectura P0/P1/P2
- `NOTIFICATION_POLICY.md` — Política de notificaciones
- Roadmap de implementación: `docs/roadmaps/FINAL_ARTIFACT_ROADMAP.md`

---

## Changelog

**v1.1** (2026-01-15)
- Versión canónica aprobada
- Agregada nota sobre formato de implementación (§3.1)
- Agregado criterio de verificación independiente (§7)

**v1.0** (draft inicial)
