#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/diagnostics/release_beta_ritual.sh --project-ref <ref> [--execute] [--skip-prebeta]

Modes:
  default (dry-run): imprime el plan de release sin ejecutar deploy
  --execute: ejecuta gate + deploy conjunto (db push + functions)

Required for --execute:
  - SUPABASE_ACCESS_TOKEN configurado
  - ROTATION_TICKET configurado (evidencia de rotación de credencial)

Environment flags:
  PREBETA_INCLUDE_FULL_TESTS=true   # opcional, ejecuta npm test dentro del gate
  DENO_CHECK=true|false|auto        # opcional para prebeta_fire_drill.sh (default: auto)
  DATABASE_URL o SUPABASE_DB_URL    # requerido en --execute para check pre-launch obligatorio

Function bundle source:
  scripts/diagnostics/release_beta_functions.txt
EOF
}

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
EXECUTE=false
SKIP_PREBETA=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref)
      PROJECT_REF="${2:-}"
      shift 2
      ;;
    --execute)
      EXECUTE=true
      shift
      ;;
    --skip-prebeta)
      SKIP_PREBETA=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${PROJECT_REF}" ]]; then
  echo "ERROR: missing --project-ref (or SUPABASE_PROJECT_REF env)." >&2
  exit 2
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "ERROR: rg command is required." >&2
  exit 2
fi

if rg -n "verify_jwt\\s*=\\s*false|verify_jwt:\\s*false" supabase/functions supabase/config.toml >/dev/null; then
  echo "ERROR: found verify_jwt=false in release target. Fix before deploy." >&2
  rg -n "verify_jwt\\s*=\\s*false|verify_jwt:\\s*false" supabase/functions supabase/config.toml || true
  exit 2
fi

if ! rg -n "verify_jwt\\s*=\\s*true" supabase/config.toml >/dev/null; then
  echo "ERROR: supabase/config.toml must explicitly set verify_jwt=true for release." >&2
  exit 2
fi

REQUIRED_SHARED_FILES=(
  "supabase/functions/_shared/internalAuth.ts"
  "supabase/functions/_shared/signerAccessToken.ts"
)

for shared_file in "${REQUIRED_SHARED_FILES[@]}"; do
  if [[ ! -f "${shared_file}" ]]; then
    echo "ERROR: required shared file not found: ${shared_file}" >&2
    exit 2
  fi

  if command -v git >/dev/null 2>&1 && ! git ls-files --error-unmatch "${shared_file}" >/dev/null 2>&1; then
    echo "ERROR: required shared file is not tracked by git: ${shared_file}" >&2
    echo "Commit this file before running release." >&2
    exit 2
  fi
done

FUNCTIONS_MANIFEST="scripts/diagnostics/release_beta_functions.txt"
if [[ ! -f "${FUNCTIONS_MANIFEST}" ]]; then
  echo "ERROR: missing ${FUNCTIONS_MANIFEST}" >&2
  exit 2
fi

mapfile -t FUNCTIONS < <(sed '/^\s*#/d;/^\s*$/d' "${FUNCTIONS_MANIFEST}")

if [[ "${#FUNCTIONS[@]}" -eq 0 ]]; then
  echo "ERROR: no functions listed in ${FUNCTIONS_MANIFEST}." >&2
  exit 2
fi

for fn in "${FUNCTIONS[@]}"; do
  if [[ ! -d "supabase/functions/${fn}" ]]; then
    echo "ERROR: function '${fn}' listed in manifest but directory does not exist." >&2
    exit 2
  fi
done

echo "=== Beta release ritual ==="
echo "project_ref: ${PROJECT_REF}"
echo "functions_to_deploy: ${#FUNCTIONS[@]}"

if [[ "${EXECUTE}" != "true" ]]; then
  echo
  echo "[dry-run] Plan:"
  echo "1) bash scripts/diagnostics/prebeta_fire_drill.sh"
  echo "2) (cd supabase && supabase link --project-ref ${PROJECT_REF})"
  echo "3) (cd supabase && supabase db push --project-ref ${PROJECT_REF})"
  for fn in "${FUNCTIONS[@]}"; do
    echo "4) (cd supabase && supabase functions deploy ${fn} --project-ref ${PROJECT_REF})"
  done
  echo
  echo "[manual required after deploy]"
  echo "- Confirm runtime secrets in Supabase: CRON_SECRET, INTERNAL_SECRET, TOKEN_SECRET (or the names used by your stack)."
  echo "- Rotate DB credential in Supabase dashboard (Project Settings -> Database)."
  echo "- Update credential in CI/secret manager/local env."
  echo "- Record evidence in docs/beta/BETA_RELEASE_ROTATION_LOG.md."
  echo
  echo "Run with --execute to apply."
  exit 0
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI is required for --execute." >&2
  exit 2
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is required for --execute." >&2
  exit 2
fi

if [[ -z "${ROTATION_TICKET:-}" ]]; then
  echo "ERROR: ROTATION_TICKET is required for --execute (rotation evidence id)." >&2
  exit 2
fi

if [[ "${SKIP_PREBETA}" != "true" ]]; then
  if [[ -z "${DATABASE_URL:-}" && -z "${SUPABASE_DB_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL o SUPABASE_DB_URL es requerido en --execute para el check pre-launch legacy null-entity." >&2
    exit 2
  fi

  PRELAUNCH_LEGACY_NULL_CHECK=true bash scripts/diagnostics/prebeta_fire_drill.sh
fi

(
  cd supabase
  supabase link --project-ref "${PROJECT_REF}" >/dev/null
  supabase db push --project-ref "${PROJECT_REF}"
  for fn in "${FUNCTIONS[@]}"; do
    supabase functions deploy "${fn}" --project-ref "${PROJECT_REF}"
  done
)

echo
echo "Release deploy completed."
echo "Rotation ticket: ${ROTATION_TICKET}"
echo "Next:"
echo "1) confirm runtime secrets (CRON_SECRET/INTERNAL_SECRET/TOKEN_SECRET or equivalents),"
echo "2) rotate DB credential,"
echo "3) record evidence in docs/beta/BETA_RELEASE_ROTATION_LOG.md."
