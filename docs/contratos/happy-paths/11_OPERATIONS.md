# Happy Path 11: Operaciones (organizacion de documentos)

**Clasificacion:** SECONDARY
**Actor:** Owner organizando documentos
**Trigger:** Usuario crea operacion o mueve documentos a una operacion
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md, OPERATIONS_EVENTS_CONTRACT.md, DOCUMENTS_OPERATIONS_SCOPE.md

---

## 11A: Crear operacion

1. Usuario clickea "Crear operacion" (desde CTA o menu contextual)
2. Usuario ingresa nombre + descripcion opcional
3. Sistema crea registro `operations`
4. Operacion aparece en directorio Operations con status vacio/listo

## 11B: Agregar documentos a operacion

1. Usuario selecciona uno o mas documentos
2. Usuario clickea "Mover a operacion" o arrastra a la operacion
3. Sistema agrega evento `operation.document_added` a cada documento
4. Documento aparece en directorio de la operacion
5. Proyeccion `operation_documents` se actualiza (consistencia eventual)

## 11C: Remover documentos de operacion

1. Usuario selecciona documento dentro de operacion
2. Usuario clickea "Remover de operacion"
3. Sistema agrega evento `operation.document_removed`
4. Documento se remueve de la operacion (proyeccion se actualiza)
5. Documento se preserva (sin perdida de datos)

## 11D: Compartir documentos de operacion

1. Usuario selecciona operacion
2. Usuario clickea "Compartir"
3. Sistema genera link + proteccion OTP
4. Owner envia link al destinatario
5. Destinatario ingresa OTP para ver documentos (si configurado)

## Estado final

Documentos organizados, compartidos, audit trail preservado.

## Reglas

- Mover un documento a/desde operacion NO altera su evidencia
- Los eventos de operacion son append-only (nunca se borran)
- RLS previene acceso no autorizado a operaciones ajenas
- Un documento puede estar en UNA operacion a la vez
