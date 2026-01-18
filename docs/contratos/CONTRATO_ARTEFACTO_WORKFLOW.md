# Contrato de Cierre y Artefacto de Workflow

**Fecha:** 2026-01-14
**Estado:** Propuesto

## Convencion de eventos (Fase 1)
Las referencias a eventos en este documento deben interpretarse
segun la convencion canonica `kind + at + payload`.

## 1. Principio Rector

El ciclo de vida de un workflow de firma no termina cuando su estado es `completed`. Termina cuando se ha generado y entregado un **artefacto final y verificable** a todas las partes.

Este contrato define el proceso para la generación de dicho artefacto, garantizando que sea **idempotente, robusto y auditable**. La lógica de generación de este artefacto estará aislada en un worker dedicado y no debe formar parte del worker `process-signature`.

## 2. Entidad de Base de Datos: `workflow_artifacts`

Para garantizar la idempotencia y la capacidad de reintentar el proceso de forma segura, se introduce una nueva tabla: `workflow_artifacts`.

### Esquema `workflow_artifacts`

```sql
CREATE TABLE workflow_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL UNIQUE REFERENCES signature_workflows(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'building', 'ready', 'failed')),
    artifact_url TEXT,
    artifact_hash TEXT,
    build_attempts INT DEFAULT 0,
    last_build_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para búsquedas eficientes
CREATE INDEX idx_workflow_artifacts_status ON workflow_artifacts(status);
```

## 3. Worker 1: `build-final-artifact`

Se creará un nuevo worker responsable exclusivamente de construir el artefacto final.

### Lógica del Worker

1.  **Disparador:** El worker se ejecuta periódicamente (ej. cada minuto).
2.  **Selección de Tareas:**
    *   Busca en `signature_workflows` todos los workflows con `status = 'completed'`.
    *   Hace un `LEFT JOIN` con la tabla `workflow_artifacts` usando `workflow_id`.
    *   Filtra para procesar únicamente aquellos workflows que **no tienen una entrada** en `workflow_artifacts` o cuya entrada tiene `status = 'pending'` o `status = 'failed'` (y cumple con una política de reintentos).

3.  **Proceso de Construcción (por cada tarea):**
    *   **Paso 0 (Bloqueo):** Crea o actualiza la fila en `workflow_artifacts` a `status = 'building'` y `build_attempts = build_attempts + 1`. Esto previene que otro worker tome la misma tarea.
    *   **Paso 1 (Recopilar):** Obtiene el documento original y todas las firmas (`workflow_signatures`) asociadas al `workflow_id`.
    *   **Paso 2 (Ensamblar PDF):** Utilizando una librería de servidor (ej. `pdf-lib`), estampa mediante programación cada imagen de firma en sus coordenadas correspondientes sobre el documento original.
    *   **Paso 3 (Generar Hoja de Evidencia):** Crea una nueva página PDF ("Witness" o "Hoja de Auditoría") que contiene la información consolidada de todos los firmantes, hashes, timestamps y otros metadatos forenses. Esta página se añade al final del PDF ensamblado.
    *   **Paso 4 (Almacenar y Hashear):**
        *   Sube el PDF final a Supabase Storage en una ubicación segura y permanente.
        *   Calcula el hash SHA-256 del PDF final.
    *   **Paso 5 (Éxito):**
        *   Actualiza la fila en `workflow_artifacts` a `status = 'ready'`, guardando la `artifact_url` y el `artifact_hash`.
        *   **Emite el evento canónico `workflow.artifact_finalized`**.
    *   **Paso 6 (Fallo):** Si cualquier paso falla, actualiza la fila en `workflow_artifacts` a `status = 'failed'` y registra el `error_message`.

## 4. Evento Canónico: `workflow.artifact_finalized`

Este evento se emite **una y solo una vez** por workflow, cuando el artefacto ha sido exitosamente generado y almacenado.

### Payload Mínimo del Evento

```json
{
  "type": "workflow.artifact_finalized",
  "workflow_id": "uuid-del-workflow",
  "artifact_url": "https://storage.supabase.com/...",
  "artifact_hash": "sha256-del-pdf-final",
  "finalized_at": "timestamp-iso-8601"
}
```

## 5. Worker 2: `notify-artifact-ready`

Un segundo worker, más simple, se suscribe a este nuevo evento canónico.

### Lógica del Worker

1.  **Disparador:** Se activa al recibir un evento `workflow.artifact_finalized`.
2.  **Lógica:**
    *   Extrae la `workflow_id` y la `artifact_url` del payload del evento.
    *   Consulta la lista de participantes del workflow (propietario y todos los firmantes).
    *   Pone en cola (en `workflow_notifications`) las notificaciones de tipo `final_artifact_ready` para cada participante.
    *   El cuerpo del email **debe incluir el `artifact_url`** como un enlace de descarga directa.

## 6. Implementación en el Frontend (Fase C)

1.  **Suscripción:** La UI debe suscribirse para recibir eventos `workflow.artifact_finalized` relacionados con los workflows del usuario.
2.  **Lógica de UI:**
    *   Mientras el `workflow.status` es `completed` pero no se ha recibido el evento `workflow.artifact_finalized`, la UI puede mostrar un estado intermedio como "Procesando documento final...".
    *   Al recibir el evento `workflow.artifact_finalized`, la UI debe mostrar el estado de cierre final: "Documento final listo" y habilitar un botón de descarga que apunte al `artifact_url` del evento.
    *   Este es el **"cierre mental"** real para el usuario.

## Referencias
- CONTRATO_AUTORIDAD_EJECUTOR.md
