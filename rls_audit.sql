-- A1: RLS status (enabled + force) para tablas críticas select  n.nspname as schema, 
   c.relname as table,  c.relrowsecurity as rls_enabled,  c.relforcerowsecurity as
   rls_forced from pg_class c join pg_namespace n on n.oid = c.relnamespace where
   n.nspname = 'public'  and c.relkind = 'r'  and c.relname in (  'document_entities', 
   'anchors',  'notifications',  'workflow_fields'  ) order by 1,2;

   -- A2: Dump completo de policies (who/what / USING / WITH CHECK) select  schemaname, 
   tablename,  policyname,  permissive,  roles,  cmd,  coalesce(qual::text,'') as
   using_expr,  coalesce(with_check::text,'') as with_check_expr from pg_policies where
   schemaname = 'public'  and tablename in (  'document_entities',  'anchors', 
   'notifications',  'workflow_fields'  ) order by tablename, cmd, policyname;

   -- A3: Detectar comandos faltantes por tabla (SELECT/INSERT/UPDATE/DELETE) with cmds
   as (  select unnest(array['SELECT','INSERT','UPDATE','DELETE']) as cmd ), t as ( 
   select unnest(array['document_entities','anchors','notifications','workflow_fields'])
   as tablename ) select  t.tablename,  cmds.cmd,  case when exists (  select 1  from
   pg_policies p  where p.schemaname='public'  and p.tablename=t.tablename  and
   p.cmd=cmds.cmd  ) then 'OK' else 'MISSING' end as status from t cross join cmds order
   by t.tablename, cmds.cmd;

   -- C2 partial: RLS matrix test (solo read test a_can_read / b_can_read) -- Nota: este
   bloque inserta y consulta en session; si prefieres, ejecútalo por separado. -- User A
   (owner) select
   set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', true); 
   select set_config('request.jwt.claim.role','authenticated', true);

   insert into public.document_entities (id, owner_id, title) values
   ('11111111-1111-1111-1111-111111111111', auth.uid(), 'Doc A') on conflict (id) do
   nothing;

   -- A puede leer select 'a_can_read' as key, count(*) as value from
   public.document_entities where id = '11111111-1111-1111-1111-111111111111';

   -- User B (attacker) select
   set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true); 
   select set_config('request.jwt.claim.role','authenticated', true);

   -- B no debería leer select 'b_can_read' as key, count(*) as value from
   public.document_entities where id = '11111111-1111-1111-1111-111111111111';

   -- Cleanup optional (vuelve a A para inspección) select
   set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', true); 
   select set_config('request.jwt.claim.role','authenticated', true);
