# ECO V2 CONTRACT

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)
Version: v0.1
Normas: MUST, SHOULD, MAY

Proposito: definir el formato .ECO v2 como proyeccion directa del canon. No introduce conceptos nuevos.

Nota: el sistema puede mantener representaciones internas mas ricas del canon para auditoria o reconstruccion. El formato .ECO v2 es la proyeccion publica estable y verificable.

El .ECO v2 es una proyeccion del ECOX en un instante (snapshot).

---

## 1. Invariante principal

El .ECO v2 representa la cadena canonica (SourceTruth -> Witness -> Signed) y su traza. El archivo es verificable sin acceso al contenido.

---

## 2. Esquema canonico (payload minimo)

```ts
ECOv2 {
  version: 'eco.v2'
  document_entity_id: UUID

  source: {
    hash: SHA256
    mime: string
    name?: string
    size_bytes: number
    captured_at: Timestamp
  }

  witness?: {
    hash: SHA256
    mime: 'application/pdf'
    generated_at: Timestamp
    status: 'generated' | 'signed'
  }

  signed?: {
    hash: SHA256
    signed_at: Timestamp
    authority?: 'internal' | 'external'
    authority_ref?: {
      id?: string
      type?: string
      jurisdiction?: string
    }
  }

  hash_chain: {
    source_hash: SHA256
    witness_hash?: SHA256
    signed_hash?: SHA256
    composite_hash?: SHA256
  }

  transform_log: TransformLog[]

  timestamps: {
    created_at: Timestamp
    tca?: RFC3161
  }

  anchors: {
    polygon?: Anchor
    bitcoin?: Anchor
    rfc3161?: AnchorRFC3161
  }
}

Anchor {
  network: 'polygon' | 'bitcoin'
  txid: string
  anchored_at: Timestamp
  status: 'pending' | 'confirmed' | 'failed'
}

AnchorRFC3161 {
  tsa?: string
  serial?: string
  timestamp?: Timestamp
  status: 'valid' | 'invalid'
}
```

---

## 3. Reglas de coherencia

* MUST: `version` es `eco.v2`.
* MUST: `document_entity_id` existe.
* MUST: `source.hash` existe y coincide con `hash_chain.source_hash`.
* MUST: `witness.hash` solo existe si hay `hash_chain.witness_hash`.
* MUST: `signed.hash` solo existe si hay `hash_chain.signed_hash`.
* MUST: `transform_log` es append-only.
* MUST: cada `TransformLog` vincula hashes existentes en `hash_chain`.
* MUST: si `witness_current_hash` no existe -> omitir `witness` (no null).
* MUST: si `signed_hash` no existe -> omitir `signed` (no null).
* MUST: `anchors` existe como objeto (puede estar vacio).
* MUST: `hash_chain` usa `document_entities.hash_chain` si existe.
* MUST: si `hash_chain` no existe, construirlo desde columnas.
* MUST: si existen ambos, deben coincidir (si no, `tampered` o `unknown`).
* SHOULD: `hash_chain.witness_hash` prefiere `witness_current_hash` sobre legacy.
* MUST: `transform_log[i].to_hash === transform_log[i+1].from_hash` cuando aplica.
* MUST: el ultimo `transform_log.to_hash` coincide con el ultimo hash presente.
* SHOULD: `composite_hash` representa un commitment del estado canonico al momento de emision.
* MAY: `composite_hash` se usa para verificacion rapida o anclajes de bajo costo.
* SHOULD: la redundancia entre `source.hash` y `hash_chain.source_hash` facilita verificacion humana.
* SHOULD: `anchors` reflejan el estado de anclaje al momento de emision y no reemplazan la verificacion directa de la cadena.

---

## 4. Compatibilidad v1

* MAY: un verificador v2 acepta `eco.v1` en modo compatibilidad.
* SHOULD: v2 preferir `hash_chain` y `transform_log` cuando existen.
* MUST: no se reescribe un `.eco` v1 como v2 sin re-firmar el payload.

---

## 5. Verificacion (preguntas canonicas)

El verificador v2 debe poder responder:

* ¿Este PDF proviene de este SourceTruth?
* ¿Fue modificado?
* ¿Cuándo?
* ¿La firma deriva del testigo (no del source)?

---

## 6. Prohibiciones

* No puede existir `witness.hash` sin `source.hash`.
* No puede existir `signed.hash` sin `witness.hash`.
* No puede haber `transform_log` con saltos en la cadena.

---

## 7. Referencias cruzadas

* [VERDAD_CANONICA](contratos/verdad-canonica.md)
* [ECO_FORMAT_CONTRACT](contratos/ECO_FORMAT_CONTRACT.md)
* [HASH_CHAIN_RULES](contratos/HASH_CHAIN_RULES.md)

---

## 8. Reglas de proyeccion deterministica

Fuente unica: `document_entities`.

* MUST: `document_entity_id` = `document_entities.id`.
* MUST: `source.*` se toma de `document_entities.source_*`.
  * `source.hash` = `source_hash`
  * `source.mime` = `source_mime`
  * `source.name` = `source_name`
  * `source.size_bytes` = `source_size`
  * `source.captured_at` = `source_captured_at`
* SHOULD: `witness.*` se toma de `document_entities.witness_current_*` cuando existe.
  * `witness.hash` = `witness_current_hash`
  * `witness.mime` = `witness_current_mime`
  * `witness.status` = `witness_current_status`
  * `witness.generated_at` = `witness_current_generated_at`
* SHOULD: `signed.*` se toma de `document_entities.signed_hash` y timestamp de emision.
  * `signed.hash` = `signed_hash`
  * `signed.signed_at` = `signed_at` canonico cuando exista (NO usar `updated_at`)
* MUST: `hash_chain` refleja `document_entities.hash_chain` con fallback a columnas:
  * `hash_chain.source_hash` = `source_hash`
  * `hash_chain.witness_hash` = `witness_hash` o `witness_current_hash`
  * `hash_chain.signed_hash` = `signed_hash`
  * `hash_chain.composite_hash` = `composite_hash` (si existe)
* MUST: `transform_log` = `document_entities.transform_log`.
* SHOULD: `timestamps.created_at` = `document_entities.created_at`.
* MAY: `timestamps.tca` se incluye solo si existe en el canon (no inferir).
* MUST: `timestamps.tca` no se deriva ni se inventa; solo se copia.
* SHOULD: `anchors.*` reflejan el estado conocido al momento de emision (no inferir).

No permitido:
* NO derivar campos de datos externos.
* NO reordenar `transform_log`.
* NO usar `updated_at` como timestamp probatorio.
* NO alterar hashes (solo copiar).

---

## 9. Ejemplo .ECO v2 (minimo completo)

```json
{
  "version": "eco.v2",
  "document_entity_id": "7b0f0b6b-2b2a-4e8f-9fd8-0d9d3a6f2a1c",
  "source": {
    "hash": "0c5e8c5d9d0a0f4a2d1c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e",
    "mime": "application/pdf",
    "name": "contrato.pdf",
    "size_bytes": 482133,
    "captured_at": "2026-01-06T12:00:00.000Z"
  },
  "witness": {
    "hash": "b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecf",
    "mime": "application/pdf",
    "generated_at": "2026-01-06T12:05:00.000Z",
    "status": "generated"
  },
  "signed": {
    "hash": "a9a8a7a6a5a4a3a2a1a0f9f8f7f6f5f4f3f2f1f0e9e8e7e6e5e4e3e2e1e0d1",
    "signed_at": "2026-01-06T12:10:00.000Z"
  },
  "hash_chain": {
    "source_hash": "0c5e8c5d9d0a0f4a2d1c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e",
    "witness_hash": "b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecf",
    "signed_hash": "a9a8a7a6a5a4a3a2a1a0f9f8f7f6f5f4f3f2f1f0e9e8e7e6e5e4e3e2e1e0d1"
  },
  "transform_log": [
    {
      "from_mime": "application/pdf",
      "to_mime": "application/pdf",
      "from_hash": "0c5e8c5d9d0a0f4a2d1c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e",
      "to_hash": "b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecf",
      "method": "client",
      "reason": "visualization",
      "executed_at": "2026-01-06T12:05:00.000Z"
    },
    {
      "from_mime": "application/pdf",
      "to_mime": "application/pdf",
      "from_hash": "b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecf",
      "to_hash": "a9a8a7a6a5a4a3a2a1a0f9f8f7f6f5f4f3f2f1f0e9e8e7e6e5e4e3e2e1e0d1",
      "method": "client",
      "reason": "signature",
      "executed_at": "2026-01-06T12:10:00.000Z"
    }
  ],
  "timestamps": {
    "created_at": "2026-01-06T12:00:00.000Z"
  },
  "anchors": {}
}
```

---

## 10. Checklist de tests contractuales

* MUST: proyeccion deterministica (mismo `document_entities` -> mismo .eco).
* MUST: `source.hash` = `hash_chain.source_hash`.
* MUST: `witness.hash` solo si `hash_chain.witness_hash` existe.
* MUST: `signed.hash` solo si `hash_chain.signed_hash` existe.
* MUST: serializacion canonica (orden estable de keys).
* MUST: compat fallback (hash_chain de columnas == hash_chain objeto si ambos existen).
* MUST: witness/signed ausentes -> objeto omitido (no null).
* MUST: `transform_log` mantiene orden y no se reescribe.
* MUST: `transform_log.to_hash` encadena con el siguiente `from_hash`.
* MUST: `anchors` no afectan `status` de verificacion por si solos.
* MUST: no completar datos externos ni inferir anchors.
* SHOULD: ECO v2 generado desde ECOX interno es equivalente a la proyeccion directa.
