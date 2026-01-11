-- RLS tests v2 (use psql variables to get existing owner)
-- 1) get owner id into psql variable
SELECT id::text AS owner_id FROM auth.users LIMIT 1;
\gset
\echo Owner is :owner_id

-- 2) Set actor A using the owner id
SELECT set_config('request.jwt.claim.sub', :'owner_id', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET ROLE authenticated;

-- Insert document as owner A
INSERT INTO public.documents (id, owner_id, title, eco_hash)
VALUES ('aaaa0000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM auth.users LIMIT 1), 't', 'h')
ON CONFLICT (id) DO UPDATE SET title = excluded.title;

SELECT 'a_doc_can_read' AS key, COUNT(*) AS value FROM public.documents WHERE id='aaaa0000-0000-0000-0000-000000000001'::uuid;

-- Attacker B
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SELECT 'b_doc_can_read' AS key, COUNT(*) AS value FROM public.documents WHERE id='aaaa0000-0000-0000-0000-000000000001'::uuid;

RESET ROLE;

-- Anchors: insert using service_role
SET ROLE service_role;
INSERT INTO public.anchors (id, document_id, anchor_type, polygon_tx_hash)
VALUES ('bbbb0000-0000-0000-0000-000000000002'::uuid, 'aaaa0000-0000-0000-0000-000000000001'::uuid, 'polygon', 'txhash')
ON CONFLICT (id) DO UPDATE SET polygon_tx_hash = excluded.polygon_tx_hash;
RESET ROLE;

-- Owner read as authenticated
SELECT set_config('request.jwt.claim.sub', :'owner_id', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SET ROLE authenticated;
SELECT 'a_anchor_can_read' AS key, COUNT(*) AS value FROM public.anchors WHERE id='bbbb0000-0000-0000-0000-000000000002'::uuid;

-- Attacker read
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SELECT 'b_anchor_can_read' AS key, COUNT(*) AS value FROM public.anchors WHERE id='bbbb0000-0000-0000-0000-000000000002'::uuid;

RESET ROLE;

-- Cleanup via service_role
SET ROLE service_role;
DELETE FROM public.anchors WHERE id='bbbb0000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.documents WHERE id='aaaa0000-0000-0000-0000-000000000001'::uuid;
RESET ROLE;

\echo 'RLS tests v2 complete'
