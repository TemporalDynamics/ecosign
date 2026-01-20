# DEC-AUTH-A3-TSA — Decisión de reglas TSA

Decisión: formalizar reglas TSA (A3) como contrato normativo separado.

Motivo:
- Evitar mezclar autoridad global con reglas TSA.
- Permitir tests estrictos una vez la norma exista.

Norma activa:
- `docs/contratos/TSA_AUTHORITY_RULES.md`

Implicaciones:
- Tests A3 permanecen en TODO/skip hasta implementar la norma.
- El verificador debe exponer `tsa.present`, `tsa.valid`, `tsa.witness_hash`, `tsa.gen_time`, `tsa.reason`.
