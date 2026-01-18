# Signature & Forensic Sequence
Fecha: 2026-01-12T17:33:37.144Z

Convencion de eventos (Fase 1)
------------------------------
Las referencias a eventos en este documento deben interpretarse
segun la convencion canonica `kind + at + payload`.

Descripción
-----------
Secuencia canónica que debe ejecutarse cuando un firmante completa su firma. Requisito: no avanzar sin evidencia.

Mermaid (sequence diagram)
--------------------------
```mermaid
sequenceDiagram
  participant Signer
  participant Frontend
  participant EdgeFn as process-signature
  participant TSA as legal-timestamp
  participant Anchor as anchor-services
  participant DB as Supabase

  Signer->>Frontend: apply signature (image, coords)
  Frontend->>EdgeFn: POST process-signature (accessToken, signatureData)
  EdgeFn->>DB: validate token & signer status
  EdgeFn->>TSA: request RFC3161 token (witness_hash)
  TSA-->>EdgeFn: token_b64
  EdgeFn->>DB: appendTsaEventFromEdge(document_entity_id, token)
  EdgeFn->>Anchor: optional polygon/bitcoin anchoring
  Anchor-->>EdgeFn: txHash / anchorId
  EdgeFn->>DB: insert workflow_signatures (rfc3161_token, polygon_tx_hash, bitcoin_anchor_id)
  EdgeFn->>DB: appendEvent('signature') on document_entity
  EdgeFn->>DB: update workflow_signers status = 'signed'
  EdgeFn->>DB: rpc advance_workflow
  EdgeFn->>DB: create workflow_notifications for next signer
  EdgeFn-->>Frontend: 200 OK (forensicProofs)

  note over EdgeFn,DB: If any mandatory forensic step fails -> abort advance, log error, raise alert
```

Notas rápidas
-------------
- Rule: advance_workflow only after workflow_signatures contains required evidence per forensicConfig.
- Log and alert on TSA/append failures; do not silently continue.

Nota adicional
---------------
- process-signature must be idempotent per signer and workflow to prevent duplicate evidence on retries.
