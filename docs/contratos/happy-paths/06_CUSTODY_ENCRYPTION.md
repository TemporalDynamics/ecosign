# Happy Path 06: Custodia cifrada

**Clasificacion:** CORE
**Actor:** Sistema (automatico durante proteccion)
**Trigger:** Paso de proteccion de documento
**Fuentes:** CONTRATO_ALMACENAMIENTO_PDF.md, ECOSIGN_FLOW_SUMMARY.md

---

## Paso a paso

1. Usuario protege documento (ver Happy Path 02)
2. Sistema selecciona modo de custodia:
   - `hash_only`: solo hash, sin almacenamiento de PDF (legacy/ambiguo)
   - `encrypted_custody`: PDF cifrado + almacenado
3. Si `encrypted_custody`:
   - PDF original se cifra at rest
   - Se almacena en `source_storage_path`
   - Witness PDF se cifra + almacena en `witness_current_storage_path`
4. Sistema garantiza:
   - **Rule A:** PDF original DEBE existir para documentos listados
   - **Rule B:** Cualquier accion probatoria requiere witness PDF persistido
   - **Rule C:** Todos los PDFs cifrados at rest

## Estado final

Documento protegido con cifrado, recuperacion garantizada.

## Reglas

- El cifrado es transparente para el usuario (no necesita gestionar claves)
- El modo `hash_only` esta en evaluacion: puede violar Rules A-C
- La desencripcion solo ocurre en el momento de acceso autorizado
- Los paths de storage son inmutables una vez asignados
