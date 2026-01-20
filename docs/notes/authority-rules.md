# AUTHORITY_RULES (A3) — TSA Forensic Rules (Norma propuesta)

Propósito: definir las reglas forenses (A3) que describen cómo la autoridad valida eventos TSA y adjudica estado canónico.

Reglas (A3) — propuesta mínima

1. Único TSA canónico
   - Solo un TSA por documento será considerado "canónico" para efectos de validación final.
   - Si hay múltiples TSA, la norma debe especificar la política (p.ej. last-wins) antes de habilitar tests.

2. witness_hash obligatorio
   - Todo evento TSA que se considere válido debe incluir witness_hash de 64 hex.
   - Ausencia de witness_hash => TSA no válido (decisión: tampered/incomplete según contexto).

3. token_b64 obligatorio
   - El token_b64 (base64) es obligatorio para considerar el TSA como "present" y potencialmente "válido".
   - Token vacío o malformado => inválido.

4. Coincidencia de hashes
   - Si witness_hash del evento no coincide con el witness en hash_chain de la entidad => estado "tampered".

5. Idempotencia
   - Reaplicar un evento TSA con el mismo witness_hash y token_b64 no debe cambiar el estado (NOOP).

6. Orden y conflict resolution
   - Definir claramente la política (last-wins vs canonical selection) y documentarla.

7. Reportes y evidencia
   - El verificador debe exponer `tsa.present`, `tsa.valid`, `tsa.witness_hash`, `tsa.gen_time` y `tsa.reason` en caso de fallo.

Proceso para habilitar tests A3

1. Redactar y aprobar AUTHORITY_RULES.md (este archivo).
2. Implementar los checks en verifyEcoV2 / verifier correspondiente.
3. Rehabilitar los tests unitarios uno a uno, eliminando test.skip y validando comportamiento.

Notas

- Esta norma es deliberativa: los tests no deben adelantarse a su existencia; usar test.skip con TODO A3 mientras se implementa.
