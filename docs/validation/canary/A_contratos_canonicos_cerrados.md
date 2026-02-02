# Entregable A — Contratos Canónicos Cerrados (Antes de Canary)

Este documento es corto por diseno (1-2 paginas). Si no entra aca, todavia no esta cerrado.

Referencia de autoridad:
- `docs/validation/fase3-premortem-tech-map.md`

## Contratos que se asumen como verdad

### 1) Naming de eventos (kinds)

Contrato esperado:
- Los kinds canónicos usan dot-notation: `x.y`.
- No se permiten underscores en `kind`.
- Lista minima de kinds obligatorios para happy paths (A-E) esta cerrada.

Estado actual:
- ✅ Ejes probatorios principales ya migrados a dot-notation (Share/NDA/OTP): `share.created`, `share.opened`, `nda.accepted`, `otp.verified`.
- ✅ El writer canónico hace hard-fail si el kind contiene `_`.
- ⚠️ La lista minima de kinds para happy paths A-E existe en el pre-mortem, pero todavia no esta garantizada end-to-end.

Decision cerrada:
- ✅ Contrato canónico: dot-notation (ej. `share.created`, `nda.accepted`, `otp.verified`).
- ✅ Regla: underscore en `kind` es invalido (hard fail).
- ❌ Falta una decision operativa adicional: politica de migracion para datos historicos (mapear legacy->canonical o aceptar perdida de evidencia legacy).

### 2) Writer canónico de `document_entities.events[]`

Contrato esperado:
- Solo existe un writer canónico hacia `document_entities.events[]`.
- Ningun componente escribe eventos canónicos por fuera del writer.
- Si un componente no puede escribir via writer canónico, no escribe evidencia.

Estado actual:
- ⚠️ El writer canónico existe (`append_document_entity_event(...)` via RPC) y hay triggers de guard.
- ❌ Pero el sistema pierde evidencia si un endpoint produce eventos con naming invalido (no se apendean) o si escribe "logs" fuera del writer.
- ⚠️ Existen flujos legacy que siguen operando sobre `user_documents` y tablas auxiliares (no probatorio) y eso contamina percepcion de verdad.

Decision cerrada:
- ✅ Contrato canónico: el unico writer hacia `document_entities.events[]` es `append_document_entity_event(...)` (RPC).
- ✅ Regla: si algo no puede registrarse via writer canónico, no es evidencia (es UX/ops).
- ❌ Falta cerrar enforcement verificable: auditoria de que ningun componente escribe events[] por update directo (deberia fallar por trigger, pero no esta validado aqui).

### 3) `correlation_id`

Contrato esperado:
- Definicion: que representa `correlation_id`.
- Regla: cuando se genera, quien la setea, y si se enforcea.

Estado actual:
- ❌ Drift alto: el helper compartido genera `correlation_id` random si falta o no es UUID.
- ❌ Eso contradice el modelo declarado: `correlation_id = document_entity_id`.
- ❌ Impacto: trazabilidad "decorativa" (jobs, auditoria y timeline no se agrupan consistentemente por documento).

Decision cerrada:
- ✅ Contrato canónico: `correlation_id` representa la identidad logica del documento y debe ser igual a `document_entity_id`.
- ✅ Regla: si un evento llega sin correlation_id valido, se setea a `document_entity_id` o se rechaza (elegir uno; hoy no esta enforceado).
- ❌ Falta cerrar el modo de enforcement (reject vs default) como decision operativa para Canary.

### 4) `custody_mode`

Contrato esperado:
- Semantica unica (sin inferencias contradictorias).
- Si UI ofrece "guardar original", entonces la descarga del original es parte del contrato.
- Si el producto es hash-only, UI no promete custodiar.

Estado actual:
- ❌ Ambiguo: se permite `source_storage_path` incluso con `custody_mode='hash_only'` (semantica rota).
- ❌ La UI gatea "Descargar original" por `custody_mode === 'encrypted_custody'`.
- ❌ Resultado operativo probable: el original puede existir y aun asi el usuario no puede descargarlo (contrato mental roto).

Decision cerrada:
- ❌ NO ESTA CERRADO.
- Se requiere elegir una unica semantica antes de Canary:
  - Opcion 1: hash-only honesto (no hay descarga de original; UI no lo promete)
  - Opcion 2: encrypted custody recuperable (si se ofrece, se garantiza descarga)
  - Opcion 3: hibrido por doc (requiere campo/estado explicito para no inferir)

### 5) Evidencia vs UX

Contrato esperado:
- Evidencia = eventos canónicos + hashes + TSA/anchors (portable, verificable sin EcoSign).
- UX = vistas, labels, dashboards, metadata visual. No tiene autoridad probatoria.

Estado actual:
- ⚠️ El sistema define evidencia canónica (events + TSA/anchors) pero aun hay paths UX/legacy que se perciben como verdad (tablas legacy, logs, shares).
- ❌ Se intentan eventos probatorios (share/nda/otp) que hoy no quedan en events[] por drift de naming.

Decision cerrada:
- ✅ Contrato canónico: evidencia = `document_entities.events[]` + hashes + TSA/anchors + artifacts derivados.
- ✅ UX (labels, dashboards, metadata visual) no tiene autoridad probatoria.
- ❌ Falta cerrar una lista minima de "eventos probatorios obligatorios" para Canary (share/nda/otp) y su naming final.

## Open questions (si queda algo aca, Canary NO entra)

- ❌ `custody_mode`: cual es la promesa exacta del producto (hash-only vs custody recuperable vs hibrido).
- ❌ `correlation_id`: enforce reject vs default (y donde se enforcea).
- ❌ Politica de migracion: eventos legacy con underscore (mapear / ignorar / snapshot).
- ❌ Lista minima de eventos probatorios obligatorios para Canary (especialmente share/nda/otp).

## Definicion de Done (A)

- Este documento es suficiente para explicar los invariantes sin mirar codigo.
- No quedan ambiguedades en naming, writer, correlation_id, custody_mode.
