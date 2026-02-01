# Event Graph (Canonical)

This file is generated from `docs/canonical/event_graph.yaml`.
Do not edit manually.

## Events

| Event | Sources | Triggers | Jobs | UI Status | Depends On | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| document.protected.requested | record-protection-event | on_document_entity_events_change | run_tsa | Procesando protección | — |  |
| document.protected | legacy | — | — | Protegido (legacy) | — | deprecated |
| tsa.confirmed | run-tsa | on_document_entity_events_change | submit_anchor_polygon, submit_anchor_bitcoin | Protegido | document.protected.requested |  |
| tsa.failed | run-tsa | — | — | Error TSA | document.protected.requested |  |
| tsa | legacy | on_document_entity_events_change | — | TSA (legacy) | — | deprecated |
| tsa.completed | legacy | on_document_entity_events_change | — | TSA completado (legacy) | — | deprecated |
| anchor.submitted | submit-anchor-polygon, submit-anchor-bitcoin | — | — | Anclaje enviado | tsa.confirmed |  |
| anchor.confirmed | process-polygon-anchors, process-bitcoin-anchors | on_document_entity_events_change | build_artifact | Anclaje confirmado | anchor.submitted |  |
| anchor | process-polygon-anchors, process-bitcoin-anchors | on_document_entity_events_change | build_artifact | Anclaje confirmado | anchor.submitted |  |
| anchor.failed | submit-anchor-polygon, submit-anchor-bitcoin | — | — | Error anclaje | anchor.submitted |  |
| anchor.pending | legacy | — | — | Anclaje pendiente (legacy) | — | deprecated |
| artifact.finalized | build-artifact | — | — | Artifact listo | anchor.confirmed |  |
| artifact.completed | legacy | — | — | Artifact completado (legacy) | — | deprecated |
| artifact.failed | build-artifact | — | — | Error artifact | anchor.confirmed |  |
| protection.failed | record-protection-event | — | — | Error protección | document.protected.requested |  |
| document.signed | process-signature | — | — | Hash fijado | — |  |
| signature | process-signature | — | — | Firma aplicada | — |  |
| field_signature | legacy | — | — | Campo firmado | — | deprecated |
| nda_accepted | nda-flow | — | — | NDA aceptado | — |  |
| otp_verified | otp-flow | — | — | OTP verificado | — |  |
| share_created | share-service | — | — | Compartido | — |  |
| share_opened | share-service | — | — | Compartido | — |  |
