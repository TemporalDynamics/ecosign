# Fases migracion de decisiones

## Estado actual (2026-01-24)

### ✅ Lo que ya se hizo y esta verificado
- D5–D8: Shadow validado y ACCEPTED (0 divergencias, runs altos).
- D9: Contrato + shadow en Edge + vistas D9.
- Bache 1 (D12–D15): contratos cerrados + shadow instrumentado en Edge.
- Infra shadow comun agregada:
  - `shadow_decision_summary`
  - `shadow_decision_last_runs`
  - `shadow_decision_divergences`
- SQL pack de verificacion del Bache 1 listo:
  - `docs/audits/batch1-shadow-verification.sql`

### 🧩 Lo que falta ahora (inmediato)
1) Ejecutar `docs/audits/batch1-shadow-verification.sql`.
2) Generar 5–10 runs reales por D12–D15.
3) Si no hay divergencias:
   - Marcar D12–D15 como VALIDADO en `docs/authority-audit.md`.
4) Luego crear tests unitarios (regresion) para D12–D15.

### 🧭 Proximo bache sugerido
- Bache 2: D16–D19 (NDA / consentimiento).
- Bache 3: D20–D22 (anchoring), empezando por D20.

---

## Notas
- La observabilidad ya permite auditar decisiones sin leer codigo.
- La autoridad canonical esta aislada y medible.
