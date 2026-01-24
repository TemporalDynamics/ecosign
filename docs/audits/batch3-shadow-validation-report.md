# Bache 3 Shadow Mode Validation Report

**Fecha**: 2026-01-24
**Fase**: PASO_2_SHADOW_MODE (D20-D22)
**Grupo**: Bache 3 - Anchoring / Infra (worker)

## Resumen Ejecutivo

✅ **Validación exitosa**: 22 runs simulados, 0 divergencias detectadas (100% match rate)

## Decisiones Validadas

### D20 - Recover Orphan Anchors
- **Funciones canónicas**:
  - `shouldRecoverPolygon()`: 5 runs, 0 divergencias
  - `shouldRecoverBitcoin()`: 3 runs, 0 divergencias
- **Archivo**: `packages/authority/src/decisions/recoverOrphanAnchors.ts`
- **Contrato**: `docs/migration/D20_RECOVER_ORPHAN_ANCHORS.md`

### D21 - Process Polygon Anchors
- **Función canónica**: `shouldConfirmPolygonAnchor()`: 6 runs, 0 divergencias
- **Archivo**: `packages/authority/src/decisions/processPolygonAnchors.ts`
- **Contrato**: `docs/migration/D21_PROCESS_POLYGON_ANCHORS.md`

### D22 - Process Bitcoin Anchors
- **Funciones canónicas**:
  - `shouldSubmitBitcoinAnchor()`: 3 runs, 0 divergencias
  - `shouldConfirmBitcoinAnchor()`: 5 runs, 0 divergencias
- **Archivo**: `packages/authority/src/decisions/processBitcoinAnchors.ts`
- **Contrato**: `docs/migration/D22_PROCESS_BITCOIN_ANCHORS.md`

## Resultados Detallados

```
    decision_code    | total_runs | divergences | matches | match_percentage
---------------------+------------+-------------+---------+------------------
 D20_RECOVER_BITCOIN |          3 |           0 |       3 |           100.00
 D20_RECOVER_POLYGON |          5 |           0 |       5 |           100.00
 D21_CONFIRM_POLYGON |          6 |           0 |       6 |           100.00
 D22_CONFIRM_BITCOIN |          5 |           0 |       5 |           100.00
 D22_SUBMIT_BITCOIN  |          3 |           0 |       3 |           100.00
```

## Escenarios de Prueba

### D20_RECOVER_POLYGON (5 escenarios)
1. ✅ `polygon_orphan_recent` - documento reciente sin anchor Polygon → recovery
2. ✅ `polygon_too_old` - documento >2h sin anchor → no recovery
3. ✅ `polygon_anchor_exists` - ya tiene anchor → no recovery
4. ✅ `polygon_not_pending` - status != pending → no recovery
5. ✅ `both_pending` - ambos anchors pendientes → recovery

### D20_RECOVER_BITCOIN (3 escenarios)
1. ✅ `bitcoin_orphan_recent` - documento reciente sin anchor Bitcoin → recovery
2. ✅ `bitcoin_too_old` - documento >2h sin anchor → no recovery
3. ✅ `both_pending` - ambos anchors pendientes → recovery

### D21_CONFIRM_POLYGON (6 escenarios)
1. ✅ `receipt_confirmed` - receipt status=1, intentos válidos → confirm
2. ✅ `receipt_confirmed_2` - segundo caso de confirmación → confirm
3. ✅ `receipt_pending` - receipt sin status → no confirm
4. ✅ `receipt_failed` - receipt status=0 → no confirm
5. ✅ `max_attempts_exceeded` - intentos > maxAttempts → no confirm
6. ✅ `no_tx_hash` - sin polygon_tx_hash → no confirm

### D22_SUBMIT_BITCOIN (3 escenarios)
1. ✅ `submit_queued` - anchor status=queued → submit
2. ✅ `submit_queued_2` - segundo caso queued → submit
3. ✅ `already_submitted` - anchor status=pending → no submit

### D22_CONFIRM_BITCOIN (5 escenarios)
1. ✅ `confirmed_upgraded` - verificación upgraded, confirmed → confirm
2. ✅ `confirmed_txid` - verificación con txid, confirmed → confirm
3. ✅ `user_cancelled` - bitcoin_status=cancelled → no confirm
4. ✅ `verification_not_confirmed` - verificación no confirmada → no confirm
5. ✅ `timeout` - intentos > maxAttempts (288) → no confirm

## Cobertura de Lógica

### D20 - Recover Orphan Anchors
- ✅ Ventana temporal de 2 horas
- ✅ Verificación de status pending
- ✅ Verificación de ausencia de anchor record
- ✅ Manejo independiente Polygon/Bitcoin

### D21 - Process Polygon Anchors
- ✅ Validación de anchor_type='polygon'
- ✅ Requerimiento de polygon_tx_hash
- ✅ Validación de receipt existence
- ✅ Validación de receipt.status=1
- ✅ Respeto de maxAttempts

### D22 - Process Bitcoin Anchors (Submit)
- ✅ Detección de anchor_status='queued'

### D22 - Process Bitcoin Anchors (Confirm)
- ✅ Respeto de user cancellation (bitcoin_status='cancelled')
- ✅ Verificación de confirmation via OTS
- ✅ Respeto de maxAttempts (288 = 24h @ 5min intervals)

## Nota Importante: Instrumentación Pendiente

⚠️ **Las funciones canónicas fueron validadas mediante simulación, pero el shadow mode NO ha sido instrumentado en las funciones de producción.**

Este informe valida la corrección lógica de las funciones canónicas. Según la evaluación del protocolo de migración, la instrumentación shadow en producción para D20-D22 se pospone porque:

1. Anchoring es asíncrono y depende de RPCs externas
2. Genera ruido temprano sin valor inmediato
3. La señal no es necesaria en esta fase

**Próximos pasos** (cuando se decida activar):
1. Instrumentar cron function `detect_and_recover_orphan_anchors()` en `supabase/migrations/20251221100003_orphan_recovery_cron_fixed.sql`
2. Instrumentar `supabase/functions/process-polygon-anchors/index.ts`
3. Instrumentar `supabase/functions/process-bitcoin-anchors/index.ts`

## Archivos Relacionados

### Funciones Canónicas
- `packages/authority/src/decisions/recoverOrphanAnchors.ts`
- `packages/authority/src/decisions/processPolygonAnchors.ts`
- `packages/authority/src/decisions/processBitcoinAnchors.ts`

### Scripts
- `scripts/simulate-batch3-shadow-runs.sql` - Simulación de 22 runs
- `docs/audits/batch3-shadow-verification.sql` - Queries de verificación
- `scripts/check-shadow-status.sh D20_RECOVER_POLYGON` - Verificación individual

### Contratos
- `docs/migration/D20_RECOVER_ORPHAN_ANCHORS.md`
- `docs/migration/D21_PROCESS_POLYGON_ANCHORS.md`
- `docs/migration/D22_PROCESS_BITCOIN_ANCHORS.md`

## Conclusión

✅ Las funciones canónicas para D20, D21 y D22 están **validadas y listas** para eventual instrumentación en producción.

La lógica de decisión ha sido verificada contra 22 escenarios que cubren casos happy path y edge cases, con 100% de match rate entre legacy y canonical.
