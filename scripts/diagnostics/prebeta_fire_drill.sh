#!/usr/bin/env bash
set -euo pipefail

run_step() {
  local title="$1"
  shift
  echo
  echo "=== ${title} ==="
  "$@"
}

can_resolve_npm_registry() {
  if command -v getent >/dev/null 2>&1 && getent hosts registry.npmjs.org >/dev/null 2>&1; then
    return 0
  fi

  if command -v nslookup >/dev/null 2>&1 && nslookup registry.npmjs.org >/dev/null 2>&1; then
    return 0
  fi

  if command -v host >/dev/null 2>&1 && host registry.npmjs.org >/dev/null 2>&1; then
    return 0
  fi

  if command -v dig >/dev/null 2>&1; then
    local dig_result
    dig_result="$(dig +short registry.npmjs.org 2>/dev/null | head -n 1 || true)"
    if [[ -n "${dig_result}" ]]; then
      return 0
    fi
  fi

  return 1
}

run_optional_deno_check() {
  local mode="${DENO_CHECK:-auto}"
  case "${mode}" in
    true)
      if ! command -v deno >/dev/null 2>&1; then
        echo
        echo "=== Deno check ==="
        echo "ERROR: DENO_CHECK=true pero 'deno' no está instalado en el entorno."
        return 2
      fi
      run_step "Deno check (strict)" deno check --node-modules-dir=auto \
        supabase/functions/log-workflow-event/index.ts \
        supabase/functions/request-document-changes/index.ts \
        supabase/functions/send-signer-otp/index.ts \
        supabase/functions/verify-signer-otp/index.ts \
        supabase/functions/apply-signer-signature/index.ts
      ;;
    auto)
      if ! command -v deno >/dev/null 2>&1; then
        echo
        echo "=== Deno check ==="
        echo "skipped (deno not installed)"
        return 0
      fi

      if can_resolve_npm_registry; then
        run_step "Deno check (auto)" deno check --node-modules-dir=auto \
          supabase/functions/log-workflow-event/index.ts \
          supabase/functions/request-document-changes/index.ts \
          supabase/functions/send-signer-otp/index.ts \
          supabase/functions/verify-signer-otp/index.ts \
          supabase/functions/apply-signer-signature/index.ts
      else
        echo
        echo "=== Deno check ==="
        echo "skipped (offline environment)"
      fi
      ;;
    false|"")
      echo
      echo "=== Deno check ==="
      echo "skipped (DENO_CHECK=false)"
      ;;
    *)
      echo
      echo "=== Deno check ==="
      echo "ERROR: DENO_CHECK='${mode}' inválido. Valores permitidos: true, false, auto."
      return 2
      ;;
  esac
}

run_step "Typecheck" npm run typecheck
run_step "Lint" npm run lint
run_step "Client smoke" npm --prefix client run test:smoke
run_step "Canonical E2E" npm run test:canonical-e2e
run_step "Authority guard (targeted)" npm run test -- tests/authority/authority_causality_guard.test.ts
run_step "No compat_direct in critical paths" npm run test -- tests/authority/no_compat_direct_critical_paths.test.ts
run_step "Presential verification hardening guard" npm run test -- tests/authority/presential_verification_hardening_guard.test.ts
run_step "Share runtime canonical guard" npm run test -- tests/authority/share_runtime_canonical_guard.test.ts
run_step "Invites/access canonical guard" npm run test -- tests/authority/invites_access_canonical_guard.test.ts
run_step "Anchors canonical guard" npm run test -- tests/authority/anchors_canonical_guard.test.ts
run_step "Non-critical canonical guard" npm run test -- tests/authority/noncritical_endpoints_canonical_guard.test.ts
run_step "Release bundle canonical guard" npm run test -- tests/authority/release_bundle_canonical_guard.test.ts
run_step "Non-legacy user_documents guard" npm run test -- tests/authority/nonlegacy_user_documents_guard.test.ts
run_step "Presential verifier parser unit" npm run test -- tests/unit/presentialEvidence.test.ts
run_step "Docs public surface guard" npm run test -- tests/authority/docs_public_surface_guard.test.ts
run_step "Phase1 gate" npm run phase1:gate
run_step "Client build" npm --prefix client run build:skip-validation
run_optional_deno_check

if [[ "${PREBETA_INCLUDE_FULL_TESTS:-false}" == "true" ]]; then
  run_step "Full test suite" npm test
fi

echo
echo "Prebeta fire drill gate PASSED."
