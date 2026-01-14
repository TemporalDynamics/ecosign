-- Use an existing auth.user as owner
select id from auth.users limit 1;

-- Set actor to that user
select set_config('request.jwt.claim.sub','37c176ee-f6c9-4309-88e0-b3da26c79272', true);
select set_config('request.jwt.claim.role','authenticated', true);

-- Insert a minimal document owned by that user
insert into public.document_entities (
  id, owner_id, source_name, source_mime, source_size, source_hash, custody_mode, lifecycle_status
) values (
  '11111111-1111-1111-1111-111111111111', '37c176ee-f6c9-4309-88e0-b3da26c79272', 'test.pdf', 'application/pdf', 123, 'deadbeefdeadbeef', 'hash_only', 'protected'
) on conflict (id) do nothing;

-- A can read
select 'a_can_read' as key, count(*) as value
from public.document_entities
where id = '11111111-1111-1111-1111-111111111111';

-- Switch to attacker B
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
select set_config('request.jwt.claim.role','authenticated', true);

-- B should not read
select 'b_can_read' as key, count(*) as value
from public.document_entities
where id = '11111111-1111-1111-1111-111111111111';

-- Cleanup optional: remove test row
delete from public.document_entities where id = '11111111-1111-1111-1111-111111111111' and owner_id = '37c176ee-f6c9-4309-88e0-b3da26c79272';
