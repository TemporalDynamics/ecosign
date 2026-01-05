# VERDAD CANONICA — Contrato Canonico de EcoSign

Version: v0.1
Normas: MUST, SHOULD, MAY

## 0. Proposito

Este documento define la **Verdad Canonica** de EcoSign: el contrato arquitectonico y probatorio irrefutable que gobierna como se representa, protege, transforma, firma y verifica un documento dentro del sistema.

Es la **fuente unica de verdad**. Ningun flujo, UI, storage, blockchain o verificador puede contradecir este contrato.

---

## 1. Principio Fundamental (Invariante Absoluto)

> **La verdad de un documento es su contenido original en un instante exacto del tiempo.**

Todo lo demas (PDF, firmas, flujos, blockchain, UI) son **derivados** o **testigos** de esa verdad.

Si el contenido original cambia, la verdad cambia.

---

## 2. Entidades Canonicas

### 2.1 Documento Canonico (`CanonicalDocument`)

Representa una unidad logica de verdad documental.

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

### 2.2 Verdad de Origen (`SourceTruth`)

La **base irrefutable** del sistema.

```ts
SourceTruth {
  name: string
  mime_type: string
  size_bytes: number

  hash: SHA256
  captured_at: Timestamp

  storage_path?: string // solo si custody_mode === 'encrypted_custody'
}
```

**Invariantes:**

* El `hash` se calcula sobre bytes exactos (SHA-256) **antes** de cualquier transformacion.
* El `hash` nunca cambia.
* Si el contenido cambia -> **no es el mismo documento**.
* `captured_at` es el instante de verdad, no el de upload.

---

### 2.3 Testigo Visual (`VisualWitness`)

Representa una **derivacion visual humana** del documento (normalmente PDF).

No es la verdad. Es un **testigo**.

```ts
VisualWitness {
  mime_type: 'application/pdf'
  hash: SHA256

  storage_path: string
  status: 'generated' | 'signed'

  generated_at: Timestamp
}
```

**Reglas:**

* Un `VisualWitness` siempre deriva de un `SourceTruth`.
* Su hash es distinto al hash de origen.
* Puede haber multiples testigos a lo largo del tiempo (witness_history).
* Si existe `witness_current`, debe ser el ultimo testigo de `witness_history`.
* MUST: `witness_current.hash === hash_chain.witness_hash` cuando exista.

---

## 3. Cadena de Hashes (`HashChain`)

La cadena que vincula verdad -> testigos -> firmas.

```ts
HashChain {
  source_hash: SHA256
  witness_hash?: SHA256
  signed_hash?: SHA256

  composite_hash?: SHA256 // opcional (SmartHash)
}
```

**Invariantes:**

* Ningun hash puede existir sin su predecesor.
* La cadena es **append-only**.
* Romper un eslabon invalida todo lo posterior.

---

## 4. Registro de Transformaciones (`TransformLog`)

Describe **como** un documento cambia de forma sin cambiar su verdad.

```ts
TransformLog {
  from_mime: string
  to_mime: string

  from_hash: SHA256
  to_hash: SHA256

  method: 'client' | 'server'
  reason: 'visualization' | 'signature' | 'workflow'

  executed_at: Timestamp
}
```

Esto permite afirmar:

> “Este PDF firmado es hijo legitimo de este documento original.”

---

## 5. Modos de Custodia

### 5.1 `hash_only`

* EcoSign **NO guarda** el archivo.
* Solo existe el hash y el ECO.
* El usuario es responsable de mantener el archivo inmutable.

**Advertencia obligatoria al usuario:**

> Cualquier modificacion invalida la proteccion.

---

### 5.2 `encrypted_custody`

* EcoSign guarda una copia **cifrada**.
* Nadie puede ver ni modificar el contenido.
* Reduce riesgo humano y facilita verificacion futura.

---

## 6. Estados del Ciclo de Vida (`LifecycleStatus`)

```ts
LifecycleStatus =
  | 'protected'          // hash capturado
  | 'needs_witness'      // requiere PDF para firma/flujo
  | 'witness_ready'      // testigo generado
  | 'in_signature_flow'  // firmas en curso
  | 'signed'             // firmado
  | 'anchored'           // anclado en blockchain
  | 'revoked'
  | 'archived'
```

---

## 7. Firma

* Toda firma visual ocurre **sobre el VisualWitness**.
* El resultado es un nuevo hash (`signed_hash`) que MUST derivar del `witness_hash`, nunca del `source_hash`.
* El documento original **nunca se altera**.

---

## 8. Verificacion (.ECO)

El archivo `.ECO` debe contener:

* `source_hash`
* `witness_hash` (si existe)
* `signed_hash` (si existe)
* `transform_log`
* `timestamps`
* `anchors` (Polygon / Bitcoin)

El verificador debe responder:

* ¿Este PDF proviene de este documento?
* ¿Fue modificado?
* ¿Cuando?
* ¿Por quien?

---

## 9. Principios No Negociables

* El documento original **no pertenece a EcoSign**.
* EcoSign no necesita ver contenido para dar certeza.
* El PDF es un testigo, no la verdad.
* La verdad siempre es criptografica.

---

## 10. Frase Canonica (para producto y legal)

> **EcoSign no certifica archivos. Certifica verdades documentales.**

---

**Este documento es la fuente de verdad maxima del sistema.**

---

## Referencias cruzadas

* [DOCUMENT_ENTITY_CONTRACT](DOCUMENT_ENTITY_CONTRACT.md)
* [WITNESS_PDF_CONTRACT](WITNESS_PDF_CONTRACT.md)
* [HASH_CHAIN_RULES](HASH_CHAIN_RULES.md)
* [ECO_FORMAT_CONTRACT](ECO_FORMAT_CONTRACT.md)
* [FLOW_MODES_CONTRACT](FLOW_MODES_CONTRACT.md)
