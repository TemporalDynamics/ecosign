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

### Punto 8: hardening continuo secretos/roles

Done means done:
- [ ] Auditoría automática periódica de grants y `SECURITY DEFINER`.
- [ ] Política de rotación documentada y ejecutable.

### Punto 9: runbook + drills

Done means done:
- [ ] Runbook de incidentes de evidencia/proyección.
- [ ] Drill ejecutado con verificación post-incidente.

### Punto 14: verificación contractual post-deploy (al final)

Done means done:
- [ ] Smoke contractual en entorno desplegado (no solo repo local).
- [ ] Checks mínimos: superficie pública, grants, auth interna, flujo canónico.

## Orden acordado de ejecución

1. Punto 6 (concurrencia/race)
2. Punto 7 (drift migraciones)
3. Punto 8 (hardening continuo)
4. Punto 9 (runbook + drills)
5. Punto 14 (post-deploy contractual)

## Nota de control

Este documento se actualiza en cada cierre parcial. No marcar un punto sin evidencia ejecutable (test, gate, smoke o check operativo verificable).
