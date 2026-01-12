-- Run as authenticated role to enforce RLS
SET ROLE authenticated;

-- Actor A: owner
select set_config('request.jwt.claim.sub','37c176ee-f6c9-4309-88e0-b3da26c79272', true);
select set_config('request.jwt.claim.role','authenticated', true);

-- Insert test row (owner_id uses auth.uid())
insert into public.document_entities (
  id, owner_id, source_name, source_mime, source_size, source_hash, custody_mode, lifecycle_status
) values (
  '22222222-2222-2222-2222-222222222222', auth.uid(), 'test2.pdf', 'application/pdf', 456, 'beefdeadbeefdead', 'hash_only', 'protected'
) on conflict (id) do nothing;

-- A reads
select 'a_can_read' as key, count(*) as value
from public.document_entities
where id = '22222222-2222-2222-2222-222222222222';

-- Actor B: attacker
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);

-- B reads
select 'b_can_read' as key, count(*) as value
from public.document_entities
where id = '22222222-2222-2222-2222-222222222222';

-- Cleanup
select set_config('request.jwt.claim.sub','37c176ee-f6c9-4309-88e0-b3da26c79272', true);
delete from public.document_entities where id = '22222222-2222-2222-2222-222222222222' and owner_id = '37c176ee-f6c9-4309-88e0-b3da26c79272';

-- Reset role to postgres
RESET ROLE;
