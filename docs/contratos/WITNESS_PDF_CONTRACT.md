# WITNESS PDF CONTRACT

Version: v0.1
Normas: MUST, SHOULD, MAY

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)

## 0. Proposito

Definir el contrato del testigo visual (PDF) como derivacion de la Verdad Canonica. No introduce conceptos nuevos.

---

## 1. Invariante Principal

El PDF es un testigo; no es la verdad. La verdad permanece en `SourceTruth`.

---

## 2. Entidad Testigo (proyeccion)

```ts
VisualWitness {
  mime_type: 'application/pdf'
  hash: SHA256

  storage_path: string
  status: 'generated' | 'signed'

  generated_at: Timestamp
}
```

---

## 3. Reglas de Derivacion

* MUST: `mime_type` es `application/pdf`.
* Un `VisualWitness` siempre deriva de un `SourceTruth`.
* Su `hash` es distinto al `source.hash`.
* La derivacion debe registrarse en `transform_log`.

---

## 4. Reglas de Firma

* Toda firma visual ocurre sobre el `VisualWitness`.
* El resultado crea `signed_hash` en la cadena.
* El documento original nunca se altera.

---

## 5. Prohibiciones

* No puede existir `VisualWitness` sin `SourceTruth`.
* No puede existir `signed_hash` sin `witness_hash`.

---

## 6. Canonizacion (PDF Canonico)

* MUST: el testigo se genera bajo un perfil versionado (ej: `pdf-witness-v1`).
* MUST: el perfil usado debe registrarse en `transform_log`.
* SHOULD: advertir que la apariencia puede variar levemente segun viewer, sin afectar hashes.
* MUST: el hash del PDF se calcula sobre el archivo final serializado, no sobre representaciones intermedias.

---

## Referencias cruzadas

* [VERDAD_CANONICA](verdad-canonica.md)
* [DOCUMENT_ENTITY_CONTRACT](DOCUMENT_ENTITY_CONTRACT.md)
* [HASH_CHAIN_RULES](HASH_CHAIN_RULES.md)
* [ECO_FORMAT_CONTRACT](ECO_FORMAT_CONTRACT.md)
* [FLOW_MODES_CONTRACT](FLOW_MODES_CONTRACT.md)

---

## 7. Metadatos incrustados (vinculo de sangre)

* MUST: el PDF contiene metadatos XMP con `source_hash` y `eco_id`.
* MUST: `source_hash` en XMP coincide con `SourceTruth.hash`.
* MUST: `eco_id` en XMP refiere al identificador del archivo `.ECO`.
* SHOULD: estos metadatos no son opcionales en ningun flujo que genere testigo.

---

## 8. Estampa de veracidad (sello visual)

* SHOULD: el sello visual indica que el PDF es un testigo de la Verdad Canonica.
* SHOULD: el sello incluye el identificador verificable (hash o eco_id) y un texto de verificacion.
* MUST: el texto no contradice el rol del PDF (testigo, no verdad).
