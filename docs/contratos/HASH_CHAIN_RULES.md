# HASH CHAIN RULES

Version: v0.1
Normas: MUST, SHOULD, MAY

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)

## 0. Proposito

Definir reglas de la cadena de hashes como proyeccion directa de la Verdad Canonica. No introduce conceptos nuevos.

---

## 1. Estructura

```ts
HashChain {
  source_hash: SHA256
  witness_hash?: SHA256
  signed_hash?: SHA256

  composite_hash?: SHA256 // opcional (SmartHash)
}
```

---

## 2. Invariantes

* Ningun hash puede existir sin su predecesor.
* La cadena es append-only.
* Romper un eslabon invalida todo lo posterior.
* MUST: las transformaciones no pueden contradecir el orden temporal (`executed_at`).

---

## 3. Reglas de Presencia

* `source_hash` siempre existe.
* `witness_hash` solo existe si hubo generacion de `VisualWitness`.
* `signed_hash` solo existe si hubo firma sobre el testigo.

---

## 4. Reglas de Coherencia con Transformaciones

* Toda transformacion debe referenciar hashes existentes.
* La transformacion que genera el PDF debe unir `source_hash` -> `witness_hash`.
* La transformacion de firma debe unir `witness_hash` -> `signed_hash`.

---

---

## 5. Composite Hash (determinismo)

* MUST: `composite_hash` es deterministico.
* MUST: se deriva solo de hashes anteriores y metadatos probatorios.
* MAY: incluir anchors si existen.

---

## 6. Prohibiciones

* No puede haber saltos en la cadena.
* No puede haber reescritura de un hash existente.

---

## Referencias cruzadas

* [VERDAD_CANONICA](verdad-canonica.md)
* [DOCUMENT_ENTITY_CONTRACT](DOCUMENT_ENTITY_CONTRACT.md)
* [WITNESS_PDF_CONTRACT](WITNESS_PDF_CONTRACT.md)
* [ECO_FORMAT_CONTRACT](ECO_FORMAT_CONTRACT.md)
* [FLOW_MODES_CONTRACT](FLOW_MODES_CONTRACT.md)
