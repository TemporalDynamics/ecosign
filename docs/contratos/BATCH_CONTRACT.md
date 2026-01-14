# BATCH CONTRACT (EcoSign)

Version: v0.2
Normas: MUST, SHOULD, MAY
Referencia: DOCUMENT_ENTITY_CONTRACT

## 0. Proposito
Un Batch define una capa probatoria conjunta sobre documentos existentes.
No crea un "documento nuevo" ni modifica DocumentEntity.
Agrega evidencia de contexto + simultaneidad sin reemplazar la verdad individual.

## 1. Definicion
Un Batch es:
- Un conjunto ORDENADO de documentos.
- Asociado a una Operation.
- Ejecutado como una sola experiencia legal (1 mail / 1 link / 1 vista).
- Con un anclaje fuerte unico (ej: Polygon) sobre un hash del conjunto.

## 2. Entidad
```ts
Batch {
  id: UUID
  operation_id: UUID

  // snapshot del conjunto al momento de crear el batch
  items: {
    document_entity_id: UUID
    witness_hash: Hash
    order: number
  }[]

  batch_hash: Hash

  status: 'created' | 'anchored' | 'closed'
  anchor_target: 'polygon'
  anchor_tx?: string

  created_at: Timestamp (UTC)
  created_by: UUID
}
```

## 3. Reglas MUST
- Batch NO fusiona PDFs, NO mezcla hashes de documentos, NO invalida evidencia individual.
- items[] es inmutable post-creacion (append-only prohibido; solo lectura).
- order es significativo.
- cada item referencia witness_hash (testigo visual vigente al crear el batch).
- batch_hash es deterministico y se calcula sobre un JSON canonico (JCS/canonical_json):

```
batch_hash = hash(
  canonical_json({
    operation_id,
    items: ordered_by(order)[{document_entity_id, witness_hash}],
    created_at,
    batch_id: id
  })
)
```

Nota: incluir id evita ambiguedades y asegura estabilidad entre clientes/servidor.

## 4. Reglas de Inclusion (seguridad UX)
- MUST: un documento con estado operativo archived NO puede incluirse en un batch.
- SHOULD: un documento fulfilled NO debe incluirse en un batch nuevo.
- MAY: permitir override con confirmacion explicita del creador ("Re-emitir como nuevo batch").

## 5. Anclaje
- MUST: solo se ancla batch_hash.
- 1 transaccion, 1 costo, 1 prueba de simultaneidad.
- Los documentos conservan TSA, ECO y verificacion individual.

## 6. UX obligatoria
- MUST: 1 mail por firmante por batch.
- MUST: 1 link al Centro Legal (Batch View).
- MUST: mensaje explicito: "Estas firmando X documentos como un conjunto".
- SHOULD: la vista batch permite navegar documentos 1..N sin presentarlos como PDF fusionado.
