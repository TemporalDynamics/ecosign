# MAPA DE IMPACTO TECNICO (CONTRATOS CANONICOS)

Referencia canonica: VERDAD_CANONICA (docs/contratos/verdad-canonica.md)
Version: v0.1
Normas: MUST, SHOULD, MAY

Objetivo: mapear impactos tecnicos derivados de los contratos canonicos, archivo por archivo.

---

## 1. Tablas / Entidades que se crean o consolidan

Estas entidades son proyecciones directas del canon:

* CanonicalDocument (entidad raiz)
* SourceTruth (verdad de origen)
* VisualWitness (testigos visuales)
* HashChain (cadena de hashes)
* TransformLog (registro de transformaciones)
* ECO (payload verificable, como archivo/registro)

---

## 2. Campos que cambian o se agregan

Cambios minimos obligatorios por consistencia canonica:

* CanonicalDocument:
  * `witness_current?: VisualWitness`
  * `witness_history: VisualWitness[]`
  * MUST: `witness_history` es append-only
  * MUST inmutables: `owner_id`, `source.hash`, `source.mime_type`, `source.size_bytes`, `custody_mode`, `created_at`
* SourceTruth:
  * `hash` calculado sobre bytes exactos (SHA-256)
  * `captured_at` es instante de verdad (no upload)
  * `source_captured_at` (timestamptz, default now()) en DB
* HashChain:
  * `witness_hash` debe reflejar `witness_current.hash` cuando exista
* VisualWitness:
  * `mime_type` MUST ser `application/pdf`
  * perfil de render versionado (referenciado en `transform_log`)
* Custodia:
  * MUST: no existe "upload sin cifrar"; o `hash_only` o `encrypted_custody`

---

## 2.1 Modelado de witness (DB)

* Opcion A (rapida): `witness_current_*` en `document_entities` + `witness_history` jsonb append-only.
* Opcion B (probatoria): tabla `document_witnesses` append-only + `document_entities.witness_current_id`.
* MUST: explicitar la opcion elegida en migraciones.

---

## 3. Funciones de hash que se separan

Separacion explicita por contexto:

* `hash_source(bytes_exactos)` -> `source.hash`
* `hash_witness(pdf_final_serializado)` -> `witness_hash`
* `hash_signed(pdf_firmado)` -> `signed_hash`
* `composite_hash(...)` -> deterministico, derivado de hashes previos y metadatos probatorios

---

## 4. Flujos que solo leen `witness_current`

Ejemplos operativos:

* UI de vista/preview del documento
* flujo de firma visual (firma siempre sobre el testigo)
* descarga de PDF firmado o testigo vigente

---

## 5. Flujos que solo tocan `source_hash`

Ejemplos operativos:

* proteccion inicial del documento (captura de hash)
* verificacion de integridad del original
* modo `hash_only` (sin custodia de archivo)
* cualquier modificacion posterior invalida la verificacion

---

## 6. Estados y jobs (separacion)

* `lifecycle_status` es probatorio y vive en la entidad canonica.
* Estados UX/operativos (`pending`, `processing`, `error`) viven en jobs o sistemas auxiliares.

---

## 7. Storage paths (sin sesgo PDF)

* `source_storage_path` solo existe si hay custodia cifrada.
* `witness_storage_path` solo existe si hay testigo visual.
* No usar `pdf_*` en la entidad central.

---

## 8. Riesgo de drift en esquema

* Hay evidencia de divergencia entre migraciones y codigo.
* Accion: alinear migraciones o aislar la entidad legacy antes del refactor.

---

## 9. Append-only (enforcement minimo)

* MUST: DB bloquea que `transform_log` decrezca (len nuevo >= len anterior).
* SHOULD: DB bloquea edicion de entradas previas si el formato lo permite.
* MAY: tests de invariantes en app como refuerzo.

---

## 6. Referencias cruzadas

* [VERDAD_CANONICA](verdad-canonica.md)
* [DOCUMENT_ENTITY_CONTRACT](DOCUMENT_ENTITY_CONTRACT.md)
* [WITNESS_PDF_CONTRACT](WITNESS_PDF_CONTRACT.md)
* [HASH_CHAIN_RULES](HASH_CHAIN_RULES.md)
* [ECO_FORMAT_CONTRACT](ECO_FORMAT_CONTRACT.md)
* [FLOW_MODES_CONTRACT](FLOW_MODES_CONTRACT.md)
