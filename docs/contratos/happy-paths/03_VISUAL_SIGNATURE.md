# Happy Path 03: Firma visual (owner)

**Clasificacion:** CORE
**Actor:** Owner firmando su propio documento
**Trigger:** Usuario selecciona "Mi Firma" desde Centro Legal
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md

---

## Paso a paso

1. Usuario abre Centro Legal y sube/selecciona documento
2. Usuario clickea toggle "Mi Firma"
3. Se abre SignatureModal con opciones:
   - **Draw:** canvas para dibujar firma
   - **Upload:** subir imagen de firma existente
   - **Type:** escribir nombre/texto como firma
4. Usuario selecciona metodo y aplica firma
5. Firma aparece como elemento flotante y editable sobre el documento
6. Usuario puede arrastrar, reposicionar o eliminar firma antes de finalizar
7. Usuario confirma ubicacion de la firma
8. Sistema registra evento de firma y genera witness
9. Documento muestra firma aplicada

## Estado final

Documento firmado por el owner, firma visual registrada con evidencia.

## Reglas

- La firma DEBE capturarse como imagen + coordenadas normalizadas (0..1 bbox)
- El evento de firma es inmutable una vez confirmado
- El sistema NO debe permitir editar la firma despues de confirmar
- Drag & drop debe funcionar durante scroll (rAF + continuous tracking)
