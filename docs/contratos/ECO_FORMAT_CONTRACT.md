# ECO FORMAT CONTRACT

Version: v0.1
Normas: MUST, SHOULD, MAY

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)

## 0. Proposito

Definir el contenido minimo del archivo .ECO como testigo verificable de la Verdad Canonica. No introduce conceptos nuevos.

Cada archivo .ECO emitido es un snapshot firmado por EcoSign.

---

## 1. Invariante Principal

El archivo .ECO debe representar la cadena de hashes y transformaciones derivadas de un SourceTruth unico.

---

## 2. Campos Minimos

El .ECO debe contener:

* `source.hash`
* `witness.hash` (si existe)
* `signed.hash` (si existe)
* `transform_log`
* `timestamps`
* `anchors`

---

## 3. Esquema Canonico (payload minimo)

```ts
ECOv1 {
  version: 'eco.v1'
  document_id: UUID
  source: {
    hash: SHA256
    mime: string
    name?: string
    captured_at: Timestamp
  }
  witness?: {
    hash: SHA256
    mime: 'application/pdf'
    generated_at: Timestamp
  }
  signed?: {
    hash: SHA256
    signed_at: Timestamp
  }
  transform_log: TransformLog[]
  timestamps: {
    created_at: Timestamp
    tca?: RFC3161
  }
  anchors: {
    polygon?: Anchor
    bitcoin?: Anchor
  }
}

Anchor {
  network: 'polygon' | 'bitcoin'
  txid: string
  anchored_at: Timestamp
  status: 'pending' | 'confirmed' | 'failed'
}
```

---

## 4. Reglas de Coherencia

* MUST: `version` es `eco.v1`.
* MUST: `document_id` existe.
* `source.hash` siempre existe.
* `witness.hash` solo existe si hay `VisualWitness`.
* `signed.hash` solo existe si hubo firma sobre el testigo.
* Cada item en `transform_log` debe enlazar hashes existentes en la cadena.

---

## 5. Verificacion

El verificador debe poder responder:

* ¿Este PDF proviene de este documento?
* ¿Fue modificado?
* ¿Cuando?
* ¿Por quien?

Ademas, MUST poder vincularse a un evento de firma/aceptacion trazable.
El metodo de identidad (email, user_id, signature_event_id) es agnostico al contrato,
pero MUST existir una referencia verificable.

---

## 6. Prohibiciones

* No puede haber `witness.hash` sin `source.hash`.
* No puede haber `signed.hash` sin `witness.hash`.
* No puede haber transformaciones sin `from_hash` y `to_hash`.

---

## Referencias cruzadas

* [VERDAD_CANONICA](verdad-canonica.md)
* [DOCUMENT_ENTITY_CONTRACT](DOCUMENT_ENTITY_CONTRACT.md)
* [WITNESS_PDF_CONTRACT](WITNESS_PDF_CONTRACT.md)
* [HASH_CHAIN_RULES](HASH_CHAIN_RULES.md)
* [FLOW_MODES_CONTRACT](FLOW_MODES_CONTRACT.md)
