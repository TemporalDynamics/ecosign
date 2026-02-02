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
- 

Decision cerrada:
- 

### 2) Writer canónico de `document_entities.events[]`

Contrato esperado:
- Solo existe un writer canónico hacia `document_entities.events[]`.
- Ningun componente escribe eventos canónicos por fuera del writer.
- Si un componente no puede escribir via writer canónico, no escribe evidencia.

Estado actual:
- 

Decision cerrada:
- 

### 3) `correlation_id`

Contrato esperado:
- Definicion: que representa `correlation_id`.
- Regla: cuando se genera, quien la setea, y si se enforcea.

Estado actual:
- 

Decision cerrada:
- 

### 4) `custody_mode`

Contrato esperado:
- Semantica unica (sin inferencias contradictorias).
- Si UI ofrece "guardar original", entonces la descarga del original es parte del contrato.
- Si el producto es hash-only, UI no promete custodiar.

Estado actual:
- 

Decision cerrada:
- 

### 5) Evidencia vs UX

Contrato esperado:
- Evidencia = eventos canónicos + hashes + TSA/anchors (portable, verificable sin EcoSign).
- UX = vistas, labels, dashboards, metadata visual. No tiene autoridad probatoria.

Estado actual:
- 

Decision cerrada:
- 

## Open questions (si queda algo aca, Canary NO entra)

- 

## Definicion de Done (A)

- Este documento es suficiente para explicar los invariantes sin mirar codigo.
- No quedan ambiguedades en naming, writer, correlation_id, custody_mode.
