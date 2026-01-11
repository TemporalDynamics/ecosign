#!/usr/bin/env bash
set -euo pipefail

# Helper to load supabase local env into the current process and run a command.
# Usage: ./scripts/load-supabase-env.sh pnpm test:gate0

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found; please install it or run Supabase local manually"
  exit 1
fi

SUPABASE_STATUS=$(supabase status --output json)

export SUPABASE_URL=$(echo "$SUPABASE_STATUS" | jq -r '.api_url')
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$SUPABASE_STATUS" | jq -r '.service_role_key')
export SUPABASE_JWT_SECRET=$(echo "$SUPABASE_STATUS" | jq -r '.jwt_secret')
# Export backward-compatible name
export SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

# If no args, print env and exit
if [ $# -eq 0 ]; then
  echo "SUPABASE_URL=$SUPABASE_URL"
  echo "SERVICE_ROLE_KEY=","(hidden)"
  exit 0
fi

# Exec the provided command
exec "$@"
