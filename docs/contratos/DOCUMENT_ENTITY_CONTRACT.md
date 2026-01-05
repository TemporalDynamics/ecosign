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

---

## 5. Reglas de Estado

* `lifecycle_status` refleja el avance sin alterar la verdad.
* Ningun estado permite modificar `source.hash`.

---

## 6. Prohibiciones

* No se puede actualizar `source.hash`.
* No se puede crear `witness` sin `source`.
* No se puede crear `signed_hash` sin `witness_hash`.

---

## 7. Traza y Derivaciones

* MUST: `transform_log` es append-only.
* MUST: cada entrada vincula `from_hash` -> `to_hash` existentes en `hash_chain`.
* SHOULD: incluir `method` y `reason` para auditoria reproducible.

---

## 8. Observabilidad

La entidad debe poder responder:

* cual es su verdad original (`source.hash`),
* cuales son sus testigos (`witness_history`),
* cual es el testigo vigente (`witness_current`),
* cual es su cadena de hashes (`hash_chain`).
