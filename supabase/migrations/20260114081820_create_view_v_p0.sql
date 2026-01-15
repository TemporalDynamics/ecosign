-- View: v_p0_workflow_truth
-- Generated: 2026-01-14T08:18:20Z

create or replace view v_p0_workflow_truth as
select
  sw.id                                   as workflow_id,
  sw.status                               as workflow_status,

  -- 1) al menos un signer firmado
  exists (
    select 1
    from workflow_signers ws
    where ws.workflow_id = sw.id
      and ws.status = 'signed'
  )                                      as has_signed_signer,

  -- 2a) evidencia preferida: workflow_signatures
  exists (
    select 1
    from workflow_signatures s
    where s.workflow_id = sw.id
  )                                      as has_signature_row,

  -- 2b) evidencia alternativa: evento canónico de firma
  exists (
    select 1
    from workflow_events we
    where we.workflow_id = sw.id
      and we.event_type in ('signature_applied','signer_signed')
  )                                      as has_signature_event,

  -- P0 truth
  (
    sw.status = 'completed'
    and exists (
      select 1 from workflow_signers ws
      where ws.workflow_id = sw.id
        and ws.status = 'signed'
    )
    and (
      exists (select 1 from workflow_signatures s where s.workflow_id = sw.id)
      or
      exists (select 1 from workflow_events we
              where we.workflow_id = sw.id
                and we.event_type in ('signature_applied','signer_signed'))
    )
  )                                      as p0_done

from signature_workflows sw;

-- Indices (non-destructive, if not exists)
create index if not exists idx_ws_workflow_status
  on workflow_signers (workflow_id, status);

create index if not exists idx_sig_workflow
  on workflow_signatures (workflow_id);

create index if not exists idx_we_workflow_event_type
  on workflow_events (workflow_id, event_type);

create index if not exists idx_sw_status
  on signature_workflows (status);
