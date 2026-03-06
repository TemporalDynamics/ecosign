#!/usr/bin/env bash
set -euo pipefail

run_step() {
  local title="$1"
  shift
  echo
  echo "=== ${title} ==="
  "$@"
}

read_env_test_var() {
  local key="$1"
  if [[ ! -f ".env.test" ]]; then
    return 0
  fi
  grep -E "^${key}=" .env.test | tail -n 1 | cut -d'=' -f2-
}

ensure_db_test_context() {
  export SUPABASE_URL="${SUPABASE_URL:-$(read_env_test_var SUPABASE_URL)}"
  export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$(read_env_test_var SUPABASE_ANON_KEY)}"
  export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(read_env_test_var SUPABASE_SERVICE_ROLE_KEY)}"
  export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
}

run_step "Fast test suite" npm test
run_step "UI canvas contract guards" npx vitest run \
  tests/ui/canvas_virtual_surface_contract_guard.test.ts \
  tests/ui/signer_fields_wizard_rotation_contract_guard.test.ts
ensure_db_test_context
run_step "DB integration gate" npm run test:db
run_step "Invariant observability scan" npm run diag:invariant-observability
run_step "Internal runtime table hardening audit" npm run diag:internal-runtime-table-hardening
run_step "SECURITY DEFINER execute allowlist audit" npm run diag:security-definer-exec-allowlist
run_step "Authority hardening guards" npm run test -- \
  tests/authority/workflow_signers_status_authority_guard.test.ts \
  tests/authority/internal_tables_service_only_guard.test.ts \
  tests/authority/internal_runtime_table_grants_rls_guard.test.ts \
  tests/authority/internal_rate_limit_table_grants_rls_guard.test.ts \
  tests/authority/workflow_canvas_fields_atomicity_guard.test.ts \
  tests/authority/no_pii_console_logs_guard.test.ts \
  tests/authority/no_raw_payload_logs_guard.test.ts \
  tests/authority/ci_release_gate_enforcement_guard.test.ts \
  tests/authority/invariant_observability_contract_guard.test.ts \
  tests/authority/security_definer_exec_allowlist_closure_guard.test.ts \
  tests/authority/verify_jwt_false_allowlist_guard.test.ts \
  tests/authority/internal_security_definer_exec_closure_guard.test.ts \
  tests/authority/residual_anon_sd_grants_guard.test.ts \
  tests/authority/legacy_endpoint_deprecations_guard.test.ts \
  tests/authority/no_legacy_runtime_surface_presence_guard.test.ts \
  tests/authority/legacy_not_in_release_manifest_guard.test.ts
run_step "Legacy null-entity prelaunch check" npm run diag:prelaunch-legacy-null-check

echo
echo "Release gate PASSED."
