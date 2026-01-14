-- RLS tests v5: ensure set_config runs after SET ROLE authenticated
SELECT id::text AS owner_id FROM auth.users LIMIT 1;
\gset
\echo Owner is :owner_id

-- Insert document via service_role (bypass RLS for setup)
SET ROLE service_role;
INSERT INTO public.documents (id, owner_id, title, eco_hash)
VALUES ('aaaa0000-0000-0000-0000-000000000001'::uuid, :'owner_id'::uuid, 't', 'h')
ON CONFLICT (id) DO UPDATE SET title = excluded.title;
RESET ROLE;

-- Owner read as authenticated: first switch role, then set claims
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'owner_id', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SELECT 'a_doc_can_read' AS key, COUNT(*) AS value FROM public.documents WHERE id='aaaa0000-0000-0000-0000-000000000001'::uuid;

-- Attacker: switch role then set claims
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SELECT 'b_doc_can_read' AS key, COUNT(*) AS value FROM public.documents WHERE id='aaaa0000-0000-0000-0000-000000000001'::uuid;

RESET ROLE;

-- Anchors: insert using service_role, include required document_hash
SET ROLE service_role;
INSERT INTO public.anchors (id, document_id, document_hash, anchor_type, polygon_tx_hash)
VALUES ('bbbb0000-0000-0000-0000-000000000002'::uuid, 'aaaa0000-0000-0000-0000-000000000001'::uuid, 'doc-hash-1', 'polygon', 'txhash')
ON CONFLICT (id) DO UPDATE SET polygon_tx_hash = excluded.polygon_tx_hash;
RESET ROLE;

-- Owner read as authenticated: SET ROLE then set claims
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'owner_id', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SELECT 'a_anchor_can_read' AS key, COUNT(*) AS value FROM public.anchors WHERE id='bbbb0000-0000-0000-0000-000000000002'::uuid;

-- Attacker: switch then set claims
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
SELECT set_config('request.jwt.claim.role','authenticated', true);
SELECT 'b_anchor_can_read' AS key, COUNT(*) AS value FROM public.anchors WHERE id='bbbb0000-0000-0000-0000-000000000002'::uuid;

RESET ROLE;

-- Cleanup via service_role
SET ROLE service_role;
DELETE FROM public.anchors WHERE id='bbbb0000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.documents WHERE id='aaaa0000-0000-0000-0000-000000000001'::uuid;
RESET ROLE;

\echo 'RLS tests v5 complete'
