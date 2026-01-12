-- Insert test row using service_role (bypasses authenticated insert restriction)
SET ROLE service_role;

insert into public.document_entities (
  id, owner_id, source_name, source_mime, source_size, source_hash, custody_mode, lifecycle_status
) values (
  '33333333-3333-3333-3333-333333333333', '37c176ee-f6c9-4309-88e0-b3da26c79272', 'test3.pdf', 'application/pdf', 789, 'cafebabecafebabe', 'hash_only', 'protected'
) on conflict (id) do nothing;

RESET ROLE;

-- Now test read behavior as authenticated role
SET ROLE authenticated;

-- Actor A (owner)
select set_config('request.jwt.claim.sub','37c176ee-f6c9-4309-88e0-b3da26c79272', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'a_can_read' as key, count(*) as value from public.document_entities where id = '33333333-3333-3333-3333-333333333333';

-- Actor B (attacker)
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);
select 'b_can_read' as key, count(*) as value from public.document_entities where id = '33333333-3333-3333-3333-333333333333';

-- Cleanup using service role
RESET ROLE;
SET ROLE service_role;
delete from public.document_entities where id = '33333333-3333-3333-3333-333333333333' and owner_id = '37c176ee-f6c9-4309-88e0-b3da26c79272';
RESET ROLE;
