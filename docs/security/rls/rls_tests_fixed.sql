-- Fixed RLS tests for documents & anchors (2026-01-11T05:07:30Z)
-- Use existing auth user as owner A

-- Set actor A
select set_config('request.jwt.claim.sub', (select id::text from auth.users limit 1), true);
select set_config('request.jwt.claim.role','authenticated', true);
SET ROLE authenticated;

-- Insert document as owner A
insert into public.documents (id, owner_id, title, eco_hash)
values ('aaaa0000-0000-0000-0000-000000000001'::uuid, (select id from auth.users limit 1), 't', 'h')
on conflict (id) do update set title = excluded.title;

select 'a_doc_can_read' as key, count(*) as value from public.documents where id='aaaa0000-0000-0000-0000-000000000001'::uuid;

-- Attacker B
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_doc_can_read' as key, count(*) as value from public.documents where id='aaaa0000-0000-0000-0000-000000000001'::uuid;

RESET ROLE;

-- Anchors: insert using service_role
SET ROLE service_role;
insert into public.anchors (id, document_id, chain, tx_id)
values ('bbbb0000-0000-0000-0000-000000000002'::uuid, 'aaaa0000-0000-0000-0000-000000000001'::uuid, 'polygon', 'tx')
on conflict (id) do update set tx_id = excluded.tx_id;
RESET ROLE;

-- Owner read as authenticated
select set_config('request.jwt.claim.sub', (select id::text from auth.users limit 1), true);
select set_config('request.jwt.claim.role','authenticated', true);
SET ROLE authenticated;
select 'a_anchor_can_read' as key, count(*) as value from public.anchors where id='bbbb0000-0000-0000-0000-000000000002'::uuid;

-- Attacker read
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_anchor_can_read' as key, count(*) as value from public.anchors where id='bbbb0000-0000-0000-0000-000000000002'::uuid;

RESET ROLE;

-- Cleanup via service_role
SET ROLE service_role;
delete from public.anchors where id='bbbb0000-0000-0000-0000-000000000002'::uuid;
delete from public.documents where id='aaaa0000-0000-0000-0000-000000000001'::uuid;
RESET ROLE;

-- End
