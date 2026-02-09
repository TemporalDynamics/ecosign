# ECO Schema V2 (Canónico)
**Estado:** Canónico  
**Alcance:** Formato ECO.v2 (schema) + instancias por firmante  
**Fecha:** 2026-02-09  

## 0) Corrección fundamental (versión vs instancia)
- **ECO.v2** es el formato (schema).
- **ECO #1, ECO #2...** son instancias por firmante.
- La versión del formato **no cambia** por firmante. Cambia la instancia.

## 1) Definición corta
Un ECO es evidencia autocontenida de un acto de firma, emitida en un momento específico del flujo.

## 2) Invariantes
- EcoSign **no interpreta** el documento ni su contenido.
- EcoSign solo da fe de **actos** + **hashes** + **orden del flujo**.
- Cada ECO corresponde a **un firmante**.
- Un ECO **no** representa el estado final del documento.

## 3) Estructura ECO.v2 (schema)
```json
{
  "format": "eco",
  "format_version": "2.0",

  "issued_at": "2026-02-09T03:47:04.392Z",

  "document": {
    "id": "uuid",
    "name": "Contrato_NDA.pdf",
    "mime": "application/pdf",
    "source_hash": "hex",
    "witness_hash": "hex"
  },

  "signing_act": {
    "signer_id": "uuid",
    "signer_email": "email",
    "signer_display_name": "string",
    "step_index": 1,
    "step_total": 2,
    "signed_at": "2026-02-09T03:47:04.392Z"
  },

  "fields": {
    "schema_hash": "hex",
    "schema_version": 1,
    "signer_state_hash": "hex",
    "signer_state_version": 1
  },

  "proofs": [
    {
      "kind": "tsa",
      "status": "confirmed",
      "provider": "https://freetsa.org/tsr",
      "token_hash": "hex",
      "token_b64": "base64",
      "attempted_at": "2026-02-09T03:47:10.392Z"
    },
    {
      "kind": "rekor",
      "status": "confirmed",
      "provider": "rekor.sigstore.dev",
      "ref": "rekor_uuid",
      "statement_hash": "hex",
      "statement_type": "ecosign.proof.v1"
    }
  ],

  "signature_capture": {
    "present": true,
    "stored": true,
    "consent": true,
    "render_hash": "hex",
    "strokes_hash": "hex",
    "ciphertext_hash": "hex"
  },

  "system": {
    "ecosign_signature": "hex",
    "verification_version": "1"
  }
}
```

## 4) Diferencias entre ECO #1 y ECO #2
**ECO #1 (Firmante 1)**
- `step_index = 1`
- `witness_hash = PDF con firma 1`
- `signer_state_hash = campos del firmante 1`

**ECO #2 (Firmante 2)**
- `step_index = 2`
- `witness_hash = PDF con firma 1 + 2`
- `signer_state_hash = campos del firmante 2`

**Ambos son ECO.v2.**

## 5) Bloque humano (neutral, sin semántica)
Este bloque es **texto plano**, no interpreta contenido.

```
DECLARACIÓN DE EVIDENCIA DE FIRMA DIGITAL

Documento: <nombre del archivo>
Firmante: <email>
Acto de firma: Paso 1 de 2
Fecha y hora (UTC): <timestamp>

Este archivo contiene evidencia verificable
del acto de firma digital realizado.
La validez puede comprobarse de forma independiente
sin acceso a EcoSign.
```

## 6) ECOx (artefacto distinto)
ECOx es el cierre del flujo (otra cosa).
- Referencia múltiples ECO.
- Se emite una sola vez al final.
- Puede incluir TSA final, Polygon, Bitcoin.

ECOx **no reemplaza** ECO.v2 ni redefine su formato.
