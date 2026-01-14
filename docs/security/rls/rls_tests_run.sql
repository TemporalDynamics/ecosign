-- RLS functional tests run at 2026-01-11T04:57:31Z
-- Prepare: pick an existing auth user for owner A
\echo '--- Owner user ---'
select id, email from auth.users limit 1;

-- Use owner A
select set_config('request.jwt.claim.sub', (select id from auth.users limit 1), true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Make sure role is authenticated
SET ROLE authenticated;
\echo '== Testing document_entities as owner A (authenticated insert) =='
-- Insert document as owner A using auth.uid()
insert into public.document_entities (id, owner_id, source_name, source_mime, source_size, source_hash, custody_mode, lifecycle_status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', auth.uid(), 'test-owner.pdf', 'application/pdf', 111, 'hash-a', 'hash_only', 'protected')
on conflict (id) do update set source_name = excluded.source_name;

select 'a_doc_can_read' as key, count(*) as value from public.document_entities where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Switch to attacker B
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_doc_can_read' as key, count(*) as value from public.document_entities where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Reset role
RESET ROLE;

-- Anchors: owner inserts anchor
\echo '== Testing anchors visibility =='
select set_config('request.jwt.claim.sub', (select id from auth.users limit 1), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
SET ROLE authenticated;

insert into public.anchors (id, document_entity_id, user_id, anchor_status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', auth.uid(), 'pending')
on conflict (id) do update set anchor_status = excluded.anchor_status;

select 'a_anchor_can_read' as key, count(*) as value from public.anchors where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Attacker
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_anchor_can_read' as key, count(*) as value from public.anchors where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

RESET ROLE;

-- Workflow fields: owner insert
\echo '== Testing workflow_fields =='
select set_config('request.jwt.claim.sub', (select id from auth.users limit 1), true);
select set_config('request.jwt.claim.role','authenticated', true);
SET ROLE authenticated;

insert into public.workflow_fields (id, document_entity_id, field_type, position, assigned_to, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'text', '{"page":1,"x":0.1,"y":0.1,"width":0.2,"height":0.05}'::jsonb, (select email from auth.users limit 1), auth.uid())
on conflict (id) do update set value = excluded.value;

select 'a_field_can_read' as key, count(*) as value from public.workflow_fields where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Attacker
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_field_can_read' as key, count(*) as value from public.workflow_fields where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

RESET ROLE;

-- Notifications: insert via service_role, then test owner read and attacker
\echo '== Testing workflow_notifications =='
SET ROLE service_role;

insert into public.workflow_notifications (id, workflow_id, recipient_email, notification_type, subject, body_html)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', (select id from signature_workflows limit 1), (select email from auth.users limit 1), 'system', 'test', '<p>test</p>')
on conflict (id) do update set subject = excluded.subject;

RESET ROLE;

-- Owner read
select set_config('request.jwt.claim.sub', (select id from auth.users limit 1), true);
select set_config('request.jwt.claim.role','authenticated', true);
SET ROLE authenticated;
select 'a_notif_can_read' as key, count(*) as value from public.workflow_notifications where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Attacker
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_notif_can_read' as key, count(*) as value from public.workflow_notifications where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

RESET ROLE;

-- Cleanup service_role deletes
SET ROLE service_role;
delete from public.workflow_notifications where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from public.workflow_fields where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
delete from public.anchors where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
delete from public.document_entities where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
RESET ROLE;

\echo '== RLS tests complete =='
