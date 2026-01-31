# Fases migracion de decisiones

## Estado actual (2026-01-24 - Actualizado 12:21)

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
- ✅ **NUEVO:** Validación shadow Bache 1 con runs simulados:
  - D12: 7 runs, 0 divergencias, 100% match
  - D13: 6 runs, 0 divergencias, 100% match
  - D14: 5 runs, 0 divergencias, 100% match
  - D15: 6 runs, 0 divergencias, 100% match
  - **Total:** 24 runs, 0 divergencias
  - Reporte: `docs/audits/batch1-shadow-validation-report.md`
  - Script de simulación: `scripts/simulate-batch1-shadow-runs.sql`
  - Script de verificación: `scripts/check-shadow-status.sh`

### 🧩 Lo que falta ahora (inmediato)
1) ~~Ejecutar `docs/audits/batch1-shadow-verification.sql`.~~ ✅ COMPLETADO
2) ~~Generar 5–10 runs por D12–D15.~~ ✅ COMPLETADO (simulados)
3) ~~Instrumentar shadow mode en Edge Functions reales (D12-D15)~~ ✅ COMPLETADO
   - D12: apply-signer-signature ✅
   - D13: start-signature-workflow ✅
   - D14: request-document-changes ✅
   - D15: respond-to-changes ✅
   - Reporte: `docs/audits/batch1-shadow-instrumentation-report.md`
4) Generar runs reales con flujos de UI (cuando haya usuarios activos)
5) Si 0 divergencias en runs reales:
   - Marcar D12–D15 como VALIDADO en `docs/authority-audit.md`.
6) Luego crear tests unitarios (regresion) para D12–D15.

### 🎉 Bache 2 (D16-D19) - NDA/Consentimiento
- ✅ Shadow mode instrumentado:
  - D16: accept-nda ✅
  - D17: accept-workflow-nda ✅
  - D18: accept-invite-nda ✅
  - D19: accept-share-nda ✅
- ✅ Validación con runs simulados:
  - D16: 6 runs, 0 divergencias, 100% match
  - D17: 5 runs, 0 divergencias, 100% match
  - D18: 6 runs, 0 divergencias, 100% match
  - D19: 5 runs, 0 divergencias, 100% match
  - **Total:** 22 runs, 0 divergencias
  - Script: `scripts/simulate-batch2-shadow-runs.sql`
  - Reporte: `docs/audits/batch2-shadow-validation-report.md`
- ⏭️ Pendiente:
  - Crear contratos formales D16-D19
  - Generar runs reales con UI
  - Marcar como VALIDADO

### 🧩 Bache 3 (D20-D22) - Anchoring / Infra
- ✅ Funciones canónicas creadas:
  - D20: recoverOrphanAnchors.ts (shouldRecoverPolygon, shouldRecoverBitcoin) ✅
  - D21: processPolygonAnchors.ts (shouldConfirmPolygonAnchor) ✅
  - D22: processBitcoinAnchors.ts (shouldSubmitBitcoinAnchor, shouldConfirmBitcoinAnchor) ✅
- ✅ Validación con runs simulados:
  - D20_RECOVER_POLYGON: 5 runs, 0 divergencias, 100% match
  - D20_RECOVER_BITCOIN: 3 runs, 0 divergencias, 100% match
  - D21_CONFIRM_POLYGON: 6 runs, 0 divergencias, 100% match
  - D22_SUBMIT_BITCOIN: 3 runs, 0 divergencias, 100% match
  - D22_CONFIRM_BITCOIN: 5 runs, 0 divergencias, 100% match
  - **Total:** 22 runs, 0 divergencias
  - Script: `scripts/simulate-batch3-shadow-runs.sql`
  - Reporte: `docs/audits/batch3-shadow-validation-report.md`
- ⏭️ Pendiente:
  - Instrumentar shadow en Edge Functions (cuando se decida activar)
  - Generar runs reales
  - Marcar como VALIDADO

### 🧭 Proximo bache sugerido
- Bache 4: D23-D26 (próximas decisiones)

---

## Notas
- La observabilidad ya permite auditar decisiones sin leer codigo.
- La autoridad canonical esta aislada y medible.
