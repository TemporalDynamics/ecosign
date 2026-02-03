# Contrato: Campos y Anclas por Firmante (Flow D)

**Estado:** draft (P1)  
**Version:** v0.1  
**Fecha:** 2026-02-03  

Este contrato define como el creador configura lo que cada firmante debera completar (obligaciones) y donde se reflejara en el PDF (anclas graficas), sin tocar la semantica probatoria ni reventar backend.

## Objetivo

- Reducir ambiguedad: intencion del creador vs acto del firmante vs representacion grafica.
- Habilitar un wizard que cree estructura correcta (batches + workflow_fields) de forma determinista.
- Mantener invariantes ya acordadas: batch como unidad firmable, sin asignacion implicita, evidencia en `document_entities.events[]`.

## No objetivos (P1)

- No redefine evidencia (`signature.completed`) ni gating secuencial.
- No cambia el binding server-side (email -> signer_id) ni tablas de runtime.
- No promete verificacion de identidad mas alla de los mecanismos existentes (OTP/login).
- No convierte los campos extra (Nombre, Documento, etc.) en identidad verificada: son datos declarados por el firmante salvo que exista un mecanismo explicito de verificacion.

## Glosario (UX vs interno)

### Firmante (UX)

Persona (email) con un turno de firma.

En P1, su intencion se referencia en `workflow_fields.assigned_to` y se bindea en runtime a `batches.assigned_signer_id`.

### Campos del firmante (UX)

Lo que ese firmante debera completar al firmar. No son "firmas que el creador coloca".

### Batch (interno)

Unidad minima firmable.

- `batch_id` agrupa anclas/campos que pertenecen a un mismo firmante.
- En P1, el wizard crea 1 batch por firmante (1:1). El backend puede seguir soportando N batches por firmante.

### Campo logico (UX)

Requisito de informacion, independiente de representacion grafica.

Ejemplos: Firma (obligatoria), Nombre, Documento, Fecha, Texto.

### Ancla grafica (interno/UX)

Instruccion de estampado en el PDF: pagina(s), posicion y tamano.

En P1, las anclas graficas se materializan como filas en `workflow_fields`.

## Invariantes (MUST)

I1. **Acto unico**: el firmante ejecuta 1 acto de firma por turno (`signature.completed`). Ese acto incluye consentimiento informado + firma + completado de campos requeridos. Las estampas pueden replicarse N veces.

I2. **Firma obligatoria**: todo batch incluye "Firma" aunque el creador no la "agregue" manualmente.

I3. **No hay firma sin batch**: un firmante no puede firmar si no tiene >=1 batch asignado.

I4. **No hay asignacion implicita**: cualquier asignacion automatica (wizard) requiere una accion explicita del creador (CTA "Crear automaticamente").

I5. **Sources of truth**:

- Antes de iniciar el workflow: `workflow_fields(batch_id, assigned_to)`.
- Runtime de firma: `batches.assigned_signer_id` (escrito por `start-signature-workflow` via bind email -> signer_id).
- Evidencia probatoria final: `document_entities.events[]`.

I6. **Congelacion de intencion antes de invitar**: la plantilla de obligaciones/anclas se congela antes de enviar invitaciones.

- Si el workflow ya tiene invitaciones enviadas, la UI MUST impedir editar plantilla/anclas.
- La congelacion MUST ser audit-able (hash + payload serializado + timestamp).

## Modelo de datos P1

### Tablas existentes (no cambiar en P1)

- `workflow_signers` (email, orden, flags)
- `batches` (id, document_entity_id, assigned_signer_id)
- `workflow_fields` (batch_id, assigned_to, field_type, position, metadata)

### Representacion de campo logico (wizard)

El wizard opera sobre una plantilla declarativa que luego se transforma en `workflow_fields`.

`logical_field_kind` (string):

- `signature` (siempre incluido)
- `name`
- `id_number`
- `date`
- `text`

`logical_field_id` (string, MUST): identificador estable del campo logico (no UI id).

`required` (boolean):

- Firma: `true` (siempre)
- Extras: configurable

### Reglas de repeticion de firma (wizard)

`repetition_rule` (MUST):

- `once`
- `all_pages`
- `pages` (lista explicita)

Nota: en P1, extras pueden ser `once` por default.

### Metadata obligatoria en `workflow_fields`

Cada fila creada por el wizard MUST incluir en `workflow_fields.metadata`:

- `logical_field_kind`
- `logical_field_id`
- `repetition_rule`
- `frontend_id` (ya existente en `workflowFieldsService`)

Esto permite reconstruir intencion y explicar pericialmente el layout.

## Transformacion (wizard -> workflow_fields)

Entrada:

- Lista de firmantes (emails validos + orden)
- Set de campos logicos seleccionados (P1: mismo set para todos)
- Regla de repeticion de firma

Salida:

- Se crean N batches (uno por firmante) y se asignan via `assigned_to=email` en `workflow_fields`.
- Para cada batch:
  - Se crean una o mas filas `workflow_fields` para firma (segun `repetition_rule`).
  - Se crean filas para extras (por default 1 vez cerca de la firma principal).

Mapeo minimo `logical_field_kind -> workflow_fields.field_type`:

- `signature` -> `signature`
- `date` -> `date`
- `name`, `id_number`, `text` -> `text` (con `metadata.label/placeholder` adecuados)

## Gating UX (P1)

### Estados semanticos (MUST)

- `missing_structure`: faltan firmantes validos o faltan campos por firmante.
- `ready_to_confirm`: estructura completa pero no confirmada.
- `confirmed`: estructura confirmada.

### Reglas

- El CTA irreversible ("Proteger / Enviar") MUST estar bloqueado si no hay estado `confirmed`.
- Si el usuario intenta avanzar sin estructura, la UI MUST abrir el wizard (no solo mostrar toast).

## Congelacion de plantilla (template freeze)

### Requisito

Antes de enviar invitaciones o iniciar entrega automatica, el sistema MUST:

1) serializar una "plantilla" con:

- lista de firmantes (emails + orden)
- logical fields seleccionados
- `repetition_rule`
- layout resultante (las filas `workflow_fields` relevantes)

2) calcular hash de esa plantilla

3) persistirlo en un ledger audit-able (evento o version)

### Implementacion minima aceptable (P1)

- Persistir `template_payload` + `template_hash` en `workflow_versions` o tabla equivalente.
- Emitir un evento de workflow del tipo `workflow.template.finalized` (nombre tentativo, sujeto al canon de eventos del workflow).

## Copy UX (lineamientos)

- Evitar: "poner firmas", "cargar firma", "agregar firmas" para el creador.
- Preferir: "Configurar lo que cada firmante completara al firmar".
- Ser explicitos: los campos extra son datos declarados por el firmante (salvo verificacion adicional).
- Siempre explicitar antes del acto del firmante:
  - que datos se pediran
  - donde se reflejaran (y cuantas veces)

## Compatibilidad con backend actual

- `workflow_fields.assigned_to` sigue siendo email (intencion del creador).
- `start-signature-workflow` sigue bindeando email -> signer_id y escribiendo `batches.assigned_signer_id`.
- `apply-signer-signature` sigue firmando solo batches asignados al signer.
