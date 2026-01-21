# DOCUMENT_EVIDENCE_STATE

**Estado:** Contrato Canónico v1.0  
**Versión:** v1.0  
**Fecha:** 2026-01-21

## Propósito

Definir los estados probatorios de un documento digital, derivados exclusivamente de los eventos canónicos en `document_entities.events[]`. Este contrato establece cómo interpretar el nivel de evidencia de un documento basado únicamente en su historial de eventos, sin depender de estado de jobs u otras fuentes externas.

## Principios Fundamentales

### 1. Estado Probatorio Determinístico
El estado probatorio de un documento es una **función pura** de sus eventos canónicos. Dados los mismos eventos, el estado debe ser idéntico.

### 2. Derivación Exclusiva de Eventos
El estado se deriva **únicamente** de `document_entities.events[]`, no de:
- Estado de jobs en `executor_jobs`
- Columnas en tablas auxiliares
- Variables de sistema o timestamps externos

### 3. Append-Only
Los eventos son inmutables y solo se agregan. El estado se calcula desde el conjunto completo de eventos existentes.

### 4. Evidencia vs Identidad
Este contrato define **evidencia probatoria**, no **nivel de identidad**. La evidencia puede existir sin identidad fuerte.

## Estados Probatorios Canónicos

### `created` (Creado - Implícito)
**Condición:** Existe `document_entities.id` (estado implícito).

**Significado:** El documento ha sido registrado en el sistema con su hash original.

### `processing` (En Proceso)
**Condición:** Existen eventos pero no se han registrado eventos confirmatorios significativos.

**Eventos típicos:**
- Eventos de preparación
- Eventos iniciales sin confirmación

**Significado:** El documento ha sido ingresado al sistema y está en proceso de protección.

### `signed` (Firmado)
**Condición:** Existe `document.signed`.

**Significado:** Se ha registrado la intención de firma del documento.

### `protected` (Protegido)
**Condición:** Existe `tsa.confirmed`.

**Eventos requeridos:**
- `tsa.confirmed` con `payload.witness_hash` y `payload.token_b64`

**Significado:** El documento tiene evidencia de tiempo legal verificable (RFC 3161).

### `anchoring` (Anclando)
**Condición:** Existe `anchor.submitted` pero no `anchor.confirmed`.

**Eventos requeridos:**
- `anchor.submitted` con `payload.network` (después de la modificación del 2026-01-21)

**Significado:** Se ha solicitado la protección en blockchain pero aún no está confirmada.

**Normativa:** `anchor.submitted` expresa intención de anclaje, no evidencia blockchain verificable.

### `reinforced` (Reforzado)
**Condición:** Existe `tsa.confirmed` + al menos un `anchor.confirmed`.

**Eventos requeridos:**
- `tsa.confirmed`
- `anchor.confirmed` con `payload.network` y `payload.confirmed_at`

**Significado:** El documento tiene protección tanto temporal (TSA) como en blockchain.

### `maximum` (Máximo)
**Condición:** Existe `tsa.confirmed` + `anchor.confirmed` para múltiples redes.

**Eventos requeridos:**
- `tsa.confirmed`
- `anchor.confirmed` para al menos 2 redes diferentes (por ejemplo: Polygon + Bitcoin)

**Significado:** El documento tiene múltiples capas de protección blockchain.

## Propiedades Transversales

### `finalized` (Artefacto Disponible)
**Condición:** Existe `artifact.finalized`.

**Evento requerido:**
- `artifact.finalized` con metadatos del artefacto generado

**Significado:** Indica disponibilidad de artefacto, no nivel máximo de protección.

**Normativa:** `artifact.finalized` indica que **el artefacto está disponible** pero no implica que **toda la protección posible** haya sido aplicada.

## Derivación de Estado (Algoritmo Canónico)

Dado un array de eventos `events[]`, el estado se deriva así:

```
1. Si tiene tsa + anchor.confirmed (>=2 redes) → maximum
2. Si tiene tsa + anchor.confirmed → reinforced
3. Si tiene anchor.submitted (pero no confirmed) → anchoring
4. Si tiene tsa.confirmed → protected
5. Si tiene document.signed → signed
6. Si tiene eventos pero no cumple ninguno anterior → processing
7. Si no tiene eventos significativos → created (implícito)
```

**Propiedad adicional:**
- `has_artifact = existe artifact.finalized`

## Eventos Relevantes para Estado

### Eventos de Protección
- `tsa.confirmed` - Protección temporal
- `anchor.submitted` - Solicitud de protección blockchain
- `anchor.confirmed` - Confirmación de protección blockchain
- `artifact.finalized` - Generación de evidencia consolidada

### Eventos de Identidad
- `document.signed` - Intención de firma
- `identity.verified` - Verificación de identidad (futuro)

## Garantías del Contrato

### Inmutabilidad
Una vez que un documento alcanza un estado, eventos posteriores pueden elevarlo pero no reducir la evidencia acumulada.

### Reproducibilidad
Dado el mismo conjunto de eventos, cualquier implementación debe derivar el mismo estado.

### Transparencia
El estado es completamente visible desde los eventos sin necesidad de consultar otras fuentes.

## Notas de Implementación

Este contrato define **semántica**, no **ejecución**. La derivación del estado puede implementarse:
- En UI para mostrar nivel de protección
- En verificadores para validar evidencia
- En sistemas de auditoría para evaluar cumplimiento

El estado se evalúa **en tiempo real** desde los eventos existentes, sin almacenamiento de estado derivado.

## Tabla de Derivación (Ejemplos)

| Eventos Presentes | Estado Derivado | has_artifact |
|------------------|-----------------|--------------|
| `tsa.confirmed`, `anchor.confirmed` (2 redes) | `maximum` | true/false |
| `tsa.confirmed`, `anchor.confirmed` (1 red) | `reinforced` | true/false |
| `tsa.confirmed`, `anchor.submitted` | `anchoring` | true/false |
| `tsa.confirmed` | `protected` | true/false |
| `document.signed` | `signed` | true/false |
| Otros eventos | `processing` | true/false |
| Ninguno | `created` (implícito) | true/false |