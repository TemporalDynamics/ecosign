# CANONICAL EVENTS LIST

Version: v1.0  
Estado: CANONICO  
Normas: MUST, SHOULD, MAY

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
- signer.cancelled
- signer.rejected
- otp.sent
- otp.verified
- document.change_requested
- document.change_resolved
- document.decrypted

## 2. Reglas
- MUST: Cada evento incluye workflow_id y signer_id si aplica.
- MUST: Eventos se registran en el canal canonico (appendEvent).

## 3. No-responsabilidades
- No define emails ni UI.
