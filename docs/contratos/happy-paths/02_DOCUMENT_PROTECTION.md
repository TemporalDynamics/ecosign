# Happy Path 02: Proteccion de documento

**Clasificacion:** CORE
**Actor:** Owner (propietario del documento)
**Trigger:** Usuario abre Centro Legal y sube archivo, o selecciona "Proteger documento"
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md, HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md, ECOSIGN_FLOW_SUMMARY.md

---

## Paso a paso

1. Usuario abre Centro Legal (modal, disponible desde Home/Documents/Operations)
2. Usuario arrastra o clickea para subir documento (PDF)
3. Toggle de proteccion esta ON por defecto (usuario puede desactivar)
4. Sistema calcula `source_hash` (SHA-256) y crea registro en `document_entities`
5. Sistema aplica Legal Timestamp (RFC 3161 TSA)
6. Evento `tsa` se agrega a `document_entities.events[]`
7. Sistema genera witness PDF (si aplica)
8. Documento aparece en directorio Documents con status "Protected"

## Estado final

Documento protegido con evidencia TSA, almacenado en Documents.

## Reglas

- El hash SHA-256 se calcula ANTES de cualquier transformacion
- TSA es obligatorio para cualquier documento con proteccion activa
- El witness PDF debe persistirse antes de avanzar (Rule B del CONTRATO_ALMACENAMIENTO_PDF)
- UI muestra: "Protected (TSA active)" vs "Draft (no protection)"
