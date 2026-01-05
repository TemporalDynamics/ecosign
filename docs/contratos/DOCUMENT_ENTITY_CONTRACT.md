# DOCUMENT ENTITY CONTRACT

Version: v0.1
Normas: MUST, SHOULD, MAY

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)

## 0. Proposito

Definir la entidad documental derivada directamente de la Verdad Canonica. No introduce conceptos nuevos; es una proyeccion operativa del CanonicalDocument.

---

## 1. Invariante Principal

La verdad de un documento es su contenido original en un instante exacto del tiempo. Todo atributo de la entidad existe para preservar, rastrear o verificar esa verdad.

---

## 2. Entidad Canonica (proyeccion)

```ts
CanonicalDocument {
  id: UUID
  owner_id: UUID

  source: SourceTruth
  witness_current?: VisualWitness
  witness_history: VisualWitness[]

  hash_chain: HashChain
  transform_log: TransformLog[]

  custody_mode: 'hash_only' | 'encrypted_custody'
  lifecycle_status: LifecycleStatus

  created_at: Timestamp
  updated_at: Timestamp
}
```

---

## 3. Reglas de Identidad

* `id` identifica la entidad en el sistema (identidad operativa).
* `source.hash` define la identidad probatoria (identidad criptografica).
* MUST: `source.hash` es inmutable. Cualquier cambio implica nuevo documento.

---

## 4. Reglas de Custodia

* MUST: `custody_mode` determina si existe o no `source.storage_path`.
* En `hash_only` no hay almacenamiento del archivo; solo hash.
* En `encrypted_custody` el archivo existe cifrado, sin acceso al contenido.
* MUST: no existe custodia sin cifrado. Si no es cifrado, entonces es `hash_only`.

---

## 5. Reglas de Estado

* `lifecycle_status` refleja el avance sin alterar la verdad.
* Ningun estado permite modificar `source.hash`.
* MUST: `lifecycle_status` es probatorio. Estados de UX/operativos viven fuera de esta entidad.

---

## 6. Inmutabilidad (Source Truth)

* MUST: los siguientes campos son inmutables post-creacion:
  * `owner_id`
  * `source.hash`
  * `source.mime_type`
  * `source.size_bytes`
  * `custody_mode`
  * `created_at`
  * `source.captured_at`
* MUST: la inmutabilidad se garantiza en la capa de datos (ej: trigger BEFORE UPDATE).

---

## 7. Modelado DB (witness)

Opciones validas para modelar `witness_current` + `witness_history`:

* Opcion A (simple): columnas `witness_current_*` en `document_entities` y `witness_history` como `jsonb` append-only.
* Opcion B (probatoria): tabla `document_witnesses` append-only y `document_entities.witness_current_id` referencia al ultimo testigo.
  * SHOULD: trigger garantiza que `witness_current_id` solo avance (monotono).
* MUST (minimo): explicitar la opcion elegida en la migracion inicial.

---

## 8. Prohibiciones

* No se puede actualizar `source.hash`.
* No se puede crear `witness_current` sin `source`.
* No se puede crear `signed_hash` sin `witness_hash`.
* MUST: no existen campos `pdf_*` en la entidad central; el storage del testigo vive en `witness.storage_path`.

---

## 9. Traza y Derivaciones

* MUST: `transform_log` es append-only.
* MUST: cada entrada vincula `from_hash` -> `to_hash` existentes en `hash_chain`.
* SHOULD: incluir `method` y `reason` para auditoria reproducible.
* MUST: las transformaciones de conversion y firma se registran como entradas del `transform_log`.
* MUST (DB minimo): impedir que `transform_log` decrezca (len nuevo >= len anterior).
* SHOULD (DB): bloquear edicion de entradas previas si el almacenamiento lo permite.
* MAY (app): enforcement adicional con tests de invariantes.

---

## 10. Observabilidad

La entidad debe poder responder:

* cual es su verdad original (`source.hash`),
* cuales son sus testigos (`witness_history`),
* cual es el testigo vigente (`witness_current`),
* cual es su cadena de hashes (`hash_chain`).

---

## Referencias cruzadas

* [VERDAD_CANONICA](verdad-canonica.md)
* [WITNESS_PDF_CONTRACT](WITNESS_PDF_CONTRACT.md)
* [HASH_CHAIN_RULES](HASH_CHAIN_RULES.md)
* [ECO_FORMAT_CONTRACT](ECO_FORMAT_CONTRACT.md)
* [FLOW_MODES_CONTRACT](FLOW_MODES_CONTRACT.md)
