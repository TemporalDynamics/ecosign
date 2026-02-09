# CAI Invariants (ECO / ECOx / CAI)
**Estado:** Canónico
**Alcance:** ECO snapshot, proofs rápidas, PDF witness, CAI readiness
**Fecha:** 2026-02-09

## 0) Propósito
Este documento fija las **leyes del sistema** que no pueden romperse sin invalidar evidencia.
No es marketing. Son invariants técnicos y auditables.

## 1) Invariantes de ECO (acto por firmante)

### 1.1 ECO Witness Integrity
Para todo ECO emitido:
- `document.witness_hash` **MUST** existir.
- Para cada `proofs[*]`: `proofs[*].witness_hash` **MUST** ser **igual** a `document.witness_hash`.
- Si no hay proofs, el ECO sigue siendo válido; si hay proof, **debe sellar el mismo artifact**.

**Violación:** El ECO es inválido y no debe emitirse.

### 1.2 ECO Instance Semantics
- ECO #n representa **el estado del documento post‑acto** del firmante n.
- ECO #n **no** representa el estado final del flujo.
- ECO #n **no** interpreta contenido.

### 1.3 ECO Across Signers
Entre firmantes distintos, con documento base idéntico:
- `document.source_hash` **MUST** ser igual.
- `fields.schema_hash` **MUST** ser igual.
- `document.witness_hash` **MUST** ser distinto por firmante (estado post‑acto).

### 1.4 Proofs No‑Block
- Las proofs rápidas son **best‑effort**.
- Una proof fallida **no** bloquea ECO.
- Una proof confirmada **debe** referenciar el mismo witness hash del ECO.

## 2) Invariantes de PDF (pipeline post‑acto)

### 2.1 PDF Post‑Acto
Para cada firmante n:
- El PDF entregado **debe** ser el PDF **posterior** a su firma.
- El hash de ese PDF **debe** ser `document.witness_hash` del ECO del firmante n.

### 2.2 PDF Accumulation
Para un flujo con N firmantes:
- El PDF del firmante n debe contener todas las firmas 1..n.
- No se entrega un PDF pre‑firma al firmante n.

## 3) Invariantes de Hash Estructural (CAI‑ready)

### 3.1 Schema Hash
- `fields.schema_hash` representa el contrato de layout y asignaciones.
- Debe ser estable aunque el owner re‑guarde.

### 3.2 Signer State Hash
- `signer_state_hash` incluye solo los campos del firmante.
- No incluye la firma como valor literal; usa `signature_capture_hash` separado.

## 4) Invariantes de Integridad CAI (Nivel 2)
Estos no están implementados aún, pero **son ley** cuando se incorporen:

- `H_c` (Content Hash) **MUST** permanecer constante durante el flujo.
- `H_s` (State Hash) **MUST** ser diferente por acto.
- `H_r` (Root Hash) **MUST** cambiar cuando se agrega un nuevo `H_s`.
- Un documento puede ser **INTACT_BUT_INTERMEDIATE** si `H_c` coincide y `H_r` difiere.

## 5) Invariants de Distribución

### 5.1 Firmante
- Recibe **su** ECO + su PDF post‑acto.
- No requiere ECOs ajenos.
- No requiere PDF final completo.

### 5.2 Owner
- Puede recibir todos los ECOs.
- Puede recibir el PDF final (configurable).

### 5.3 Verificador externo
- Puede verificar con un ECO individual sin depender de EcoSign.
- No requiere acceso a logs internos.

## 6) Consecuencia de violación
Si cualquier invariant de secciones 1 o 2 falla:
- **No** se emite ECO.
- **No** se envía mail.
- **No** se persiste evidencia válida.
- Debe quedar trazado en logs con motivo explícito.

## 7) Cierre
CAI no "razona"; **verifica invariants**.
Si el sistema respeta estos invariants, la evidencia es sólida incluso sin EcoSign vivo.
