-- Grant for anchor_polygon_atomic_tx (separate statement for Supabase CLI)
GRANT EXECUTE ON FUNCTION public.anchor_polygon_atomic_tx(
  UUID, UUID, TEXT, BIGINT, TEXT, TIMESTAMPTZ, JSONB, JSONB, INTEGER
) TO service_role;
