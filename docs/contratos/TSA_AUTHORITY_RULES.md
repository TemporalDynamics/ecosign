# TSA_AUTHORITY_RULES (A3) — Reglas Forenses TSA

Estado: Activo (Fase 1/2)

Este documento define las reglas forenses (A3) para validar eventos TSA y adjudicar
estado canónico. Es normativo: el verificador y la autoridad deben obedecerlo.

## Reglas (A3)

1) Único TSA canónico
- Solo un TSA por documento puede considerarse canónico.
- Si hay múltiples TSA, la política de selección (p. ej. last-wins) debe ser explícita
  antes de habilitar tests estrictos.

2) witness_hash obligatorio
- Todo TSA válido MUST incluir `witness_hash` de 64 hex.
- Ausencia de witness_hash => TSA inválido (tampered/incomplete según contexto).

3) token_b64 obligatorio
- Todo TSA válido MUST incluir `token_b64` (base64).
- Token vacío o malformado => inválido.

4) Coincidencia de hashes
- Si `witness_hash` del evento no coincide con el hash canónico de la entidad,
  el TSA se considera tampered.

5) Idempotencia
- Reaplicar un TSA con el mismo `witness_hash` y `token_b64` no debe cambiar
  el estado (NOOP).

6) Orden y resolución de conflicto
- La política de selección canónica (last-wins u otra) debe estar documentada.

7) Reporte mínimo
El verificador MUST exponer:
- `tsa.present`
- `tsa.valid`
- `tsa.witness_hash`
- `tsa.gen_time`
- `tsa.reason` (si falla)

## Implementación y pruebas
Los tests A3 deben permanecer en TODO/skip hasta que estas reglas estén implementadas.
