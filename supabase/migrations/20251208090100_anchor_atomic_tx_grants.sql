-- Grant execute on anchor_atomic_tx to service_role (separate statement for Supabase CLI)
GRANT EXECUTE ON FUNCTION public.anchor_atomic_tx(
  UUID, UUID, BYTEA, JSONB, JSONB, INTEGER
) TO service_role;
