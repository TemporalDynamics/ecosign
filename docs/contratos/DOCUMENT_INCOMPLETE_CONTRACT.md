# DOCUMENT INCOMPLETE CONTRACT

Version: v1.0  
Estado: CANONICO  

## 1. Proposito
Definir con precision la diferencia entre un documento "draft" y un documento
"incompleto", y establecer la regla canonica para clasificar un documento
incompleto a partir de evidencia verificable.

## 2. Definiciones

### 2.1 Draft (borrador)
Un draft es un documento pre-legal, editable, sin efectos juridicos ni
obligaciones de cierre.

- NO hay intencion legal registrada.
- NO requiere cierre.
- NO participa en enforcement de planes.
- Puede existir indefinidamente.

### 2.2 Documento incompleto
Un documento incompleto es un documento que inicio un proceso legal verificable
pero no alcanzo un estado terminal canonico ni fue cancelado explicitamente.

## 3. Condiciones canonicas (todas deben cumplirse)
Un documento ES INCOMPLETO si y solo si:

1) Inicio legal registrado  
   Existe evidencia de intencion legal.
   Ejemplos: `has_legal_timestamp = true`, evento `document.legal_started`,
   o workflow creado asociado.

2) Ausencia de estado terminal  
   No existe ningun evento terminal canonico.

3) No cancelado explicitamente  
   No existe evento de cancelacion valida.

## 4. Estados terminales canonicos
La existencia de cualquiera de estos eventos cierra el documento y lo excluye
de "incompleto":

Convencion de eventos (Fase 1):
Las referencias a eventos se interpretan como `kind + at + payload`.

- `document.completed`
- `artifact.finalized`
- `workflow.completed`
- `document.cancelled`
- `document.failed`

Un documento fallido NO es incompleto; es un cierre negativo, pero cierre.
Un documento fallido puede requerir acciones operativas, pero no participa en
enforcement de "incompletos" porque su estado es terminal.

## 5. Query canonica de referencia
Nota: ajustar nombres de eventos si cambian en el schema real.
Esta query es una referencia operativa; la definicion canonica prevalece sobre
cualquier implementacion.

```sql
SELECT d.id,
       d.created_at,
       d.owner_id
FROM user_documents d
WHERE
  -- 1) Inicio legal registrado
  COALESCE(d.has_legal_timestamp, false) = true

  -- 2) No hay evento terminal
  AND NOT EXISTS (
    SELECT 1
    FROM document_entities e,
         jsonb_array_elements(e.events) evt
    WHERE e.id = d.document_entity_id
      AND evt->>'kind' IN (
        'document.completed',
        'artifact.finalized',
        'workflow.completed',
        'document.cancelled',
        'document.failed'
      )
  );
```

## 6. Comentario canonico recomendado (docs/SQL)
```sql
-- Nota canonica:
-- Un documento "draft" es pre-legal y no requiere cierre.
-- Un documento "incompleto" inicio un proceso legal verificable
-- pero no alcanzo un estado terminal (completed / cancelled / failed).
-- Solo los documentos incompletos participan en enforcement de planes.
```
