P0 — Fundación: criterio canónico (sellado)

Generado: 2026-01-14T08:18:20Z

Criterio P0 (definitivo): Un workflow cumple P0 si y solo si:

- signature_workflows.status = 'completed'
- Existe >= 1 signer con workflow_signers.status = 'signed'
- Existe evidencia forense minima: al menos una fila en workflow_signatures OR un evento canónico de firma (workflow_events.kind in ('signature_applied','signer_signed'))

Este contrato está materializado en la vista v_p0_workflow_truth (supabase/migrations/20260114081820_create_view_v_p0.sql).

CI smoke test: tests/p0_smoke.sql — exige que no existan workflows 'completed' con p0_done = false.

A partir de la aceptación de este archivo y la vista, P0 puede considerarse congelado (salvo migraciones de emergencia).
