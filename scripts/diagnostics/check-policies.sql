-- Query to check all active RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  pg_get_expr(qual, oid::regclass) as using_clause,
  pg_get_expr(with_check, oid::regclass) as with_check_clause
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
WHERE tablename IN ('signature_workflows', 'workflow_signers', 'objects')
ORDER BY tablename, policyname;
