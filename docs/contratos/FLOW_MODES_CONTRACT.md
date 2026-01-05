# FLOW MODES CONTRACT

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)
Version: v0.1
Normas: MUST, SHOULD, MAY

Proposito: mapear modos de flujo (UX/legal) como proyecciones directas del canon. No introduce conceptos nuevos.

---

## 1. Modos

### 1.1 hash_only

* MUST: `custody_mode` es `hash_only`.
* MUST: solo existe `source.hash` como verdad probatoria.
* MUST: cualquier modificacion posterior invalida la verificacion.

### 1.2 custody_optional

* MAY: `custody_mode` ser `encrypted_custody`.
* MAY: `custody_mode` ser `hash_only`.
* MUST: la verdad sigue siendo `source.hash` en ambos casos.

### 1.3 visual_witness_required

* MUST: existe `witness_current`.
* MUST: `hash_chain.witness_hash` existe.
* SHOULD: `witness_current.hash === hash_chain.witness_hash`.

### 1.4 certified_signature_required

* MUST: existe `signed_hash`.
* MUST: `signed_hash` deriva de `witness_hash`.

---

## 2. Referencias cruzadas

* [VERDAD_CANONICA](verdad-canonica.md)
* [DOCUMENT_ENTITY_CONTRACT](DOCUMENT_ENTITY_CONTRACT.md)
* [WITNESS_PDF_CONTRACT](WITNESS_PDF_CONTRACT.md)
* [HASH_CHAIN_RULES](HASH_CHAIN_RULES.md)
* [ECO_FORMAT_CONTRACT](ECO_FORMAT_CONTRACT.md)
