# Decision Log 3.0 (Cierre de Base + Pulido Extremo)

Fecha: 2026-03-06
Estado: activo

## Objetivo

Evitar recaídas del ciclo anterior y dejar explícitos los pendientes de pulido extremo para no perderlos entre iteraciones.

## Cierres confirmados

- [x] Punto 1: PII en logs sellado con guards + release gate.
- [x] Punto 2: validación EPI blindada con tests de no-regresión.
- [x] Punto 3: persistencia atómica `canvas_snapshot + fields + batches` vía RPC y smoke real.
- [x] Punto 4: release gate en CI implementado y ejecutándose en pipeline.
- [x] Punto 5: observabilidad contractual de invariantes implementada (ledger + instrumentación + diagnóstico + gate).

## Pendientes explícitos (pulido extremo)

### P5.1 Alerting externo (pendiente)

Motivo:
- Ya hay detección/registro, pero falta notificación activa automática a canal externo.

Done means done:
- [ ] Alertas para `severity=critical` hacia Slack/email/webhook.
- [ ] Configurable por `ENV` (on/off, umbral, destino).
- [ ] Prueba de humo de alerta en entorno local/staging.

### P5.2 Ruido operativo / tuning (pendiente)

Motivo:
- Evitar fatiga de alertas y mantener ratio señal/ruido alto.

Done means done:
- [ ] Ajuste de dedupe window y thresholds por tipo de violación.
- [ ] Revisión de top offenders y documentación de umbrales.

### P4.1 Branch protection (pendiente manual GitHub)

Motivo:
- El workflow existe, pero debe quedar requerido para merge en `main`.

Done means done:
- [ ] Required status check configurado: `Release Gate / release:gate`.
- [ ] Evidencia en screenshot o nota operativa en este log.

### Punto 6: concurrencia/race (cerrado)

Done means done:
- [x] Casos cubiertos: doble firma simultánea, retry/reentrada, `cancel + sign`.
- [x] Invariantes de idempotencia y estado final validados con tests.
- [x] Sin flakes en ejecuciones repetidas.

Evidencia ejecutable:
- `tests/security/workflowConcurrencyRace.test.ts`:
  - `concurrent apply-signer-signature calls are idempotent (single signer.signed)`
  - `cancel + sign race closes without server errors and without duplicate terminal events`
- `npm run test:db` incluye este archivo en gate.
- `npm test` verde (`83 files / 306 tests`).

Hardening asociado:
- `supabase/functions/cancel-workflow/index.ts` agrega guard `signing_in_progress` (409) cuando hay lock de firma activo.
- `supabase/migrations/20260307002000_fix_claim_signer_lock_status_ambiguity.sql` corrige ambigüedad en `claim_signer_for_signing`.

### Punto 7: drift-proof migraciones (cerrado)

Done means done:
- [x] Check de schema hash en pipeline.
- [x] Falla automática ante divergencia.

Evidencia ejecutable:
- Script canónico: `scripts/diagnostics/check-schema-drift.sh`
  - modo check: valida hash de schema `public` contra baseline versionado.
  - modo update: `--update` regenera baseline hash + fingerprint.
- Baselines versionados:
  - `docs/baselines/public_schema_hash.sha256`
  - `docs/baselines/public_schema_fingerprint.txt`
- Integración en release gate local/CI:
  - `scripts/release-gate.sh` ejecuta `npm run diag:schema-drift`.
- Integración en deploy pipeline (post-migrations):
  - `.github/workflows/deploy-supabase.yml` ejecuta verificación remota de hash con DB enlazada.

Regla operativa (anti-bypass):
- `diag:schema-drift:update-baseline` solo se corre cuando hay cambio intencional de schema en el mismo PR/commit.
- Todo update de baseline debe venir acompañado por migración SQL y nota breve de motivo en este decision log.

### Punto 8: hardening continuo secretos/roles (cerrado)

Done means done:
- [x] Auditoría automática periódica de grants y `SECURITY DEFINER`.
- [x] Política de rotación documentada y ejecutable.

Evidencia ejecutable:
- Workflow periódico: `.github/workflows/continuous-hardening-audit.yml`
  - `schedule` diario + `workflow_dispatch`
  - corre:
    - `npm run diag:internal-runtime-table-hardening`
    - `npm run diag:security-definer-exec-allowlist`
    - `npm run diag:secret-rotation-policy`
- Política de rotación versionada:
  - `security/secret_rotation_policy.json`
- Script ejecutable de política:
  - `scripts/diagnostics/check-secret-rotation-policy.sh`
- Integración en release gate:
  - `scripts/release-gate.sh` ejecuta `npm run diag:secret-rotation-policy`.

Alcance explícito del cierre:
- Se cierra **disciplina operativa** de rotación + auditoría continua de grants/superficies.
- No implica verificación criptográfica/directa de que el secreto remoto cambió en proveedor.

Subpendiente futuro (P8.1):
- Separar `policy attestation` vs `rotation verification`.
- Evaluar integración con metadata real de secretos (GitHub/Supabase) para validar cambio efectivo y no solo `last_rotated_at`.

### Punto 9: runbook + drills (cerrado)

Done means done:
- [x] Runbook de incidentes de evidencia/proyección.
- [x] Drill ejecutado con verificación post-incidente.

Evidencia ejecutable:
- Runbook:
  - `docs/beta/CANONICAL_INCIDENT_RUNBOOK.md`
- Drill automatizable:
  - `scripts/diagnostics/run-incident-recovery-drill.sh`
  - `scripts/diagnostics/incident_recovery_projection_drill.sql`
  - comando: `npm run diag:incident-recovery-drill`
- Reporte de ejecución:
  - `docs/beta/INCIDENT_RECOVERY_DRILL_2026-03-07.md`
- Guard anti-regresión:
  - `tests/authority/incident_runbook_drill_guard.test.ts`

### Punto 14: verificación contractual post-deploy (cerrado fuerte)

Done means done:
- [x] Smoke contractual en entorno desplegado (no solo repo local).
- [x] Checks mínimos: superficie pública, grants, auth interna, flujo canónico.

Evidencia ejecutable:
- Script contractual post-deploy:
  - `scripts/diagnostics/check-postdeploy-contract.sh`
  - comando: `npm run diag:postdeploy-contract`
- Integración bloqueante en deploy pipeline:
  - `.github/workflows/deploy-supabase.yml`
  - step: `Post-deploy contractual verification`
- Cobertura mínima incluida:
  - superficie pública (`health-check`, `signing-keys`, `presential-verification-get-acta`)
  - closed-fail auth interna (`process-signer-signed` con anon => `401/403`)
  - grants + SECURITY DEFINER (`check-internal-runtime-table-hardening`, `check-security-definer-exec-allowlist`)
  - smoke canónico transaccional (`scripts/diagnostics/incident_recovery_projection_drill.sql`)
  - drift de schema (`check-schema-drift.sh`)
- Guard anti-regresión:
  - `tests/authority/postdeploy_contract_guard.test.ts`

Evidencia empírica remota:
- `npm run diag:postdeploy-contract` ejecutado contra `uiyojopjbhooxrmamaiw` con resultado:
  - `Public runtime surface` OK
  - `process-signer-signed closed fail` => `403`
  - `Internal runtime table hardening` OK
  - `SECURITY DEFINER allowlist` OK
  - `INCIDENT PROJECTION DRILL PASSED`
  - `schema drift` OK con hash `5e2ddc74b07c0c0ced0f069675465d17c7fbc85d64037d6de4eace4102e92b8a`
- Registro operativo:
  - Fecha: `2026-03-06`
  - Project ref: `uiyojopjbhooxrmamaiw`
  - Resultado remoto: `PASS`
  - Log: `/tmp/postdeploy-contract-2026-03-06-2353.log`

## Orden acordado de ejecución

1. Punto 6 (concurrencia/race)
2. Punto 7 (drift migraciones)
3. Punto 8 (hardening continuo)
4. Punto 9 (runbook + drills)
5. Punto 14 (post-deploy contractual)

## Nota de control

Este documento se actualiza en cada cierre parcial. No marcar un punto sin evidencia ejecutable (test, gate, smoke o check operativo verificable).
