# CONTRATO_ALMACENAMIENTO_PDF

## Proposito
Define the canonical rules for PDF persistence, witness generation, and encryption.
This contract establishes the minimum guarantees required for UI truthfulness,
forensic integrity, and user trust.

La decision de ejecucion y enforcement corresponde al Executor.
Este contrato define reglas, no timing ni ejecucion.

## Reglas Canonicas

### Regla A — El PDF original debe existir
If a document appears in Documents, an original PDF **must exist** and be persisted.
There is no "in-memory only" state for listed documents.

- The original PDF is the canonical content source.
- The UI must always be able to show or retrieve it (directly or via secure access).

### Regla B — Accion probatoria requiere PDF witness
Any probative action (Protect, NDA, Signature, Workflow, etc.) **must** create a
witness PDF that is persisted and addressable.

- A witness hash without a stored PDF is **not acceptable**.
- The system must guarantee `witness_current_storage_path` exists when a probative
  action completes.

### Regla C — El cifrado es obligatorio
All PDFs containing user content **must be encrypted at rest**.

- Original PDFs must be encrypted.
- Witness PDFs must be encrypted.
- Encryption is not an optimization; it is required for trust and compliance.

## Matriz de Estado (Conceptual)

| State | Original PDF | Witness PDF | UI Behavior |
| --- | --- | --- | --- |
| Draft (saved) | Yes (encrypted) | No | Preview original |
| Draft (unsaved) | No | No | Not listed |
| In progress (CTA initiated) | Yes (encrypted) | Generating | Show "Procesando" |
| Protected / Signed | Yes (encrypted) | Yes (encrypted) | Preview witness |
| Completed | Yes (encrypted) | Yes (encrypted) | Preview witness |

## Implementacion Actual (Observada)

- `source_storage_path` is only set when `custody_mode = encrypted_custody`.
- In `hash_only` mode, `source_storage_path` can be null even when documents are listed.
- Some flows generate witness hash without persisting a witness PDF (`witness_current_storage_path = ''`).
- Uploads to `user-documents` are not uniformly encrypted across flows.

These behaviors **violate Rule A, Rule B, and Rule C**.

## Decision Requerida (Producto)

**hash_only mode must be clarified:**

Choose **one** of the following and make it canonical:

1) Keep `hash_only` but still persist an encrypted original PDF.
2) Deprecate `hash_only` as a mode that allows documents without stored PDFs.

## Pendientes

- Enforce Rule A in document creation flows.
- Enforce Rule B after any probative action (signature, protect, NDA, workflow).
- Enforce Rule C for all PDF storage paths.
- Align UI logic to the contract once persistence guarantees exist.
