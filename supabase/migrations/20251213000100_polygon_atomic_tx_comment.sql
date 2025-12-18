-- Comment for anchor_polygon_atomic_tx (separate statement for Supabase CLI)
COMMENT ON FUNCTION public.anchor_polygon_atomic_tx(
  UUID, UUID, TEXT, BIGINT, TEXT, TIMESTAMPTZ, JSONB, JSONB, INTEGER
) IS 'Atomically update anchors + user_documents + audit_logs for Polygon confirmations. Prevents split-brain state.';
