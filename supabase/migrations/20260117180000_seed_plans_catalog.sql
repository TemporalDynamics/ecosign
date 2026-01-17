-- Seed plans catalog (data only)
-- Values aligned with WORKSPACE_PLAN_CONTRACT.md

INSERT INTO public.plans (
  key,
  name,
  status,
  seats_limit,
  storage_gb_limit,
  legal_signatures_quota,
  workflows_active_limit,
  renotify_limit,
  capabilities
) VALUES
  (
    'free',
    'FREE',
    'active',
    1,
    1,
    15,
    3,
    10,
    '{
      "tsa_enabled": true,
      "bitcoin_anchor_enabled": true,
      "polygon_anchor_enabled": false,
      "ecoX_export_enabled": true,
      "audit_panel_enabled": false,
      "api_access_scope": "none"
    }'::jsonb
  ),
  (
    'pro',
    'PRO',
    'active',
    2,
    5,
    300,
    NULL,
    NULL,
    '{
      "tsa_enabled": true,
      "bitcoin_anchor_enabled": true,
      "polygon_anchor_enabled": true,
      "ecoX_export_enabled": true,
      "audit_panel_enabled": true,
      "api_access_scope": "limited"
    }'::jsonb
  ),
  (
    'business',
    'BUSINESS',
    'active',
    10,
    25,
    NULL,
    NULL,
    NULL,
    '{
      "tsa_enabled": true,
      "bitcoin_anchor_enabled": true,
      "polygon_anchor_enabled": true,
      "ecoX_export_enabled": true,
      "audit_panel_enabled": true,
      "api_access_scope": "limited"
    }'::jsonb
  ),
  (
    'enterprise',
    'ENTERPRISE',
    'active',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    '{
      "enterprise_custom": true
    }'::jsonb
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  seats_limit = EXCLUDED.seats_limit,
  storage_gb_limit = EXCLUDED.storage_gb_limit,
  legal_signatures_quota = EXCLUDED.legal_signatures_quota,
  workflows_active_limit = EXCLUDED.workflows_active_limit,
  renotify_limit = EXCLUDED.renotify_limit,
  capabilities = EXCLUDED.capabilities;
