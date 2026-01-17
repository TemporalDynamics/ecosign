# ECO_ECOX_MIN_SCHEMA

Version: v1.0
Estado: Canonical
Ambito: Evidencia, forense, almacenamiento
Fecha: 2026-01-16

Esquemas minimos de ECO (snapshot) y ECOX (timeline vivo).

## ECO (snapshot)

```json
{
  "eco_version": "1.0",
  "eco_snapshot_seq": 1,
  "document_id": "uuid",
  "issued_at": "ISO-8601",
  "coverage": {
    "tsa": true,
    "polygon": false,
    "bitcoin": false,
    "ecosign_signature": true
  },
  "hashes": {
    "source_hash": "hex",
    "witness_hash": "hex"
  },
  "events": [
    {
      "type": "DOCUMENT_PROTECTED",
      "timestamp": "ISO-8601",
      "actor": "system | user | signer",
      "proof": {
        "tsa": "...",
        "polygon_tx": "...",
        "bitcoin_tx": "..."
      }
    }
  ],
  "signatures": [
    {
      "signer_id": "uuid",
      "timestamp": "ISO-8601",
      "method": "remote | in_person"
    }
  ],
  "ecosign_signature": {
    "key_id": "string",
    "signature": "base64",
    "signed_at": "ISO-8601"
  }
}
```

Propiedades:
- inmutable
- firmado por EcoSign
- autosuficiente

## ECOX (timeline vivo)

```json
{
  "ecox_version": "1.0",
  "document_id": "uuid",
  "created_at": "ISO-8601",
  "status": "open | archived",
  "timeline": [
    {
      "seq": 1,
      "timestamp": "ISO-8601",
      "event": "ECOX_CREATED",
      "source": "system"
    },
    {
      "seq": 42,
      "timestamp": "ISO-8601",
      "event": "ANCHOR_RETRY",
      "source": "executor",
      "details": {
        "chain": "bitcoin",
        "attempt": 3,
        "reason": "timeout"
      }
    },
    {
      "seq": 87,
      "timestamp": "ISO-8601",
      "event": "ECOX_EXPORTED",
      "source": "user_request"
    }
  ],
  "derived_refs": {
    "eco_hash": "hex",
    "related_artifacts": [
      "witness_copy.pdf",
      "original.enc"
    ]
  }
}
```

Propiedades:
- append-only
- vivo
- superset tecnico
- no requerido para validez probatoria
