# Reglas de Eventos de Anclaje (Contrato Canónico)

**Estado:** CANÓNICO  
**Versión:** v1.0  
**Fecha:** 2026-01-21

## Propósito

Definir el evento canónico de confirmación de anclaje y su semántica.

## Evento Canónico de Confirmación

### Evento: `anchor`

**Estructura:**
```json
{
  "kind": "anchor",
  "at": "timestamp",
  "anchor": {
    "network": "polygon" | "bitcoin",
    "witness_hash": "string",
    "txid": "string",
    "block_height": "number",
    "confirmed_at": "timestamp"
  }
}
```

**Semántica:**
- Representa **confirmación exitosa** de un anclaje en blockchain
- No es solicitud (`anchor.submitted`) ni falla (`anchor.failed`)
- Es el evento que confirma que el anclaje está en la blockchain

**Regla canónica:**
Durante la fase actual, el evento `anchor` representa semánticamente
un `anchor.confirmed` si y solo si incluye:
- `payload.network`
- `payload.confirmed_at`

**Autoridad:**
- Emitido por: `process-polygon-anchors`, `process-bitcoin-anchors`
- Condición: Transacción confirmada en blockchain con recepción válida

## Niveles de Evidencia Basados en Eventos

### `PROTECTED`: 
- Requiere: `tsa.confirmed`

### `REINFORCED`:
- Requiere: `tsa.confirmed` + al menos 1 evento `anchor` (cualquier red)

### `MAXIMUM`:
- Requiere: `tsa.confirmed` + evento `anchor` para Polygon + evento `anchor` para Bitcoin

## Eventos Relacionados

### `anchor.submitted`
- **Propósito:** Indica solicitud de anclaje
- **Estructura:** 
```json
{
  "kind": "anchor.submitted",
  "at": "timestamp",
  "payload": {
    "network": "polygon" | "bitcoin"  // Solo después del fix
  }
}
```

### `anchor.failed`
- **Propósito:** Indica fallo permanente de anclaje
- **Estructura:**
```json
{
  "kind": "anchor.failed", 
  "at": "timestamp",
  "payload": {
    "network": "polygon" | "bitcoin",
    "reason": "string",
    "retryable": "boolean"
  }
}
```

## Reglas de Validación

1. **Unicidad por red:** Máximo 1 evento `anchor` por red por documento
2. **Monotonicidad:** Nivel de protección solo puede aumentar
3. **Idempotencia:** Mismo `txid` en misma red = no duplicar evento
4. **Verificabilidad:** Todo dato debe ser verificable contra blockchain

## Autoridad de Decisión

- El evento `anchor` es generado por workers de confirmación
- El executor interpreta estos eventos para decidir siguiente acción
- No se generan artifacts finales hasta que se alcance el nivel requerido