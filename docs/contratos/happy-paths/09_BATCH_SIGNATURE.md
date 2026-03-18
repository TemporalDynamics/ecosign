# Happy Path 09: Firma batch (multi-documento)

**Clasificacion:** SECONDARY
**Actor:** Owner agrupando documentos + Signers firmando el conjunto
**Trigger:** Usuario selecciona multiples documentos + "Enviar como conjunto"
**Fuentes:** ECOSIGN_HAPPY_PATHS_USERS.md, BATCH_CONTRACT.md

---

## Paso a paso

1. Usuario navega a Operations o Documents
2. Usuario selecciona multiples documentos (checkbox) o "Seleccionar todos en operacion"
3. Usuario clickea "Enviar como conjunto"
4. Sistema verifica que todos los documentos tengan TSA; genera TSA para los faltantes
5. Sistema crea registro `Batch`:
   - `batch_id` (UUID)
   - `operation_id` (UUID)
   - `items[]` con referencias a documentos y witness hashes
   - `batch_hash` (hash deterministico, canonical JSON)
6. Sistema genera batch witness (prueba contextual)
7. Owner configura workflow de firma unico para el batch
8. Owner envia batch para firma
9. Cada firmante recibe UN email por batch con link a vista de batch
10. Firmante accede al batch y ve todos los documentos:
    - Puede navegar 1..N documentos
    - Documentos NO se fusionan en un PDF (preservar integridad individual)
    - Mensaje explicito: "Estas firmando X documentos como conjunto"
11. Firmante aplica firma (una vez por batch)
12. Sistema ancla `batch_hash` en transaccion blockchain unica (Polygon)
13. Todos los firmantes reciben notificacion con link de descarga ECO del batch

## Estado final

Batch completado, todos los documentos firmados, batch anclado, certificados disponibles.

## Reglas

- Los documentos dentro del batch mantienen identidad individual
- Un batch NO es un merge de PDFs: cada documento conserva su hash
- El `batch_hash` se calcula de forma deterministica (canonical JSON, sorted keys)
- El anclaje blockchain es UNO por batch, no uno por documento
