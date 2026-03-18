# Happy Path 08: Configuracion NDA

**Clasificacion:** SECONDARY
**Actor:** Owner configurando requisitos de NDA
**Trigger:** Owner abre Centro Legal, activa toggle "NDA"
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md, HAPPY_PATH_SIGNATURE_WORKFLOW_CONTRACT.md, LEGAL_CENTER_LAYOUT_CONTRACT.md

---

## Paso a paso

1. Owner abre Centro Legal con documento cargado
2. Owner clickea toggle NDA -> Left Rail se desliza (sin comprimir canvas)
3. Owner configura:
   - Texto del NDA (o selecciona template)
   - Cuales firmantes requieren aceptacion de NDA
   - Metodo de aceptacion: checkbox, firma, custom
4. Owner revisa configuracion del NDA
5. Owner cierra panel NDA (se desliza)
6. Al crear workflow, firmantes con `require_nda=true` deben aceptar NDA antes de firmar
7. Sistema agrega evento `nda_accepted` al documento tras aceptacion

## Estado final

Politica de NDA configurada para el workflow.

## Reglas

- NDA es PREVIO a la firma: el firmante no ve el documento hasta aceptar
- El evento `nda_accepted` es inmutable
- El rechazo del NDA bloquea el avance del firmante (no puede firmar)
- El Left Rail NO comprime el canvas del documento
