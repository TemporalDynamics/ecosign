-- tests/p0_smoke.sql
-- CI smoke test: fail if any workflow marked completed does not satisfy P0
select count(*) as broken_p0
from v_p0_workflow_truth
where workflow_status = 'completed'
  and p0_done = false;
