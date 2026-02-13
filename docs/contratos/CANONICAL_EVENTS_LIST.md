# CANONICAL EVENTS LIST

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

## Convencion canonica de eventos (Fase 1)
- MUST: La unica convencion valida es `kind + at + payload`.
- MUST NOT: `type`, `event`, `timestamp` como fuente de verdad.
- NOTA: Cualquier otro naming se considera derivado y no canonico.

## 0. Proposito
Definir la lista minima de eventos canonicos que deben existir.

## 1. Eventos obligatorios (MUST)
- eco.snapshot.issued
- eco.finalized
- workflow.created
- workflow.activated
- workflow.completed
- workflow.cancelled
- signer.invited
- signer.accessed
- signer.identity_confirmed
- signer.ready_to_sign
- signer.signed
- signature.capture.consent
- signer.cancelled
- signer.rejected
- otp.sent
- otp.verified
- document.change_requested
- document.change_resolved
- document.decrypted
- tsa.appended
- anchor.confirmed
- anchor.failed
- workflow.artifact_finalized

## 2. Reglas
- MUST: Cada evento incluye workflow_id y signer_id si aplica.
- MUST: Eventos se registran en el canal canonico (appendEvent).

## 3. No-responsabilidades
- No define emails ni UI.
