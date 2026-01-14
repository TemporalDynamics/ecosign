#!/usr/bin/env bash
# Script to create HTTP webhook for process-signer-signed
# This creates the CORRECT webhook type (HTTP Request, not Edge Function)

set -euo pipefail

# Load environment or pass as args
PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
WEBHOOK_NAME="${1:-process-signer-signed-webhook}"

if [[ -z "$PROJECT_REF" ]]; then
  echo "❌ Error: SUPABASE_PROJECT_REF not set"
  echo "Usage: SUPABASE_PROJECT_REF=your-project-ref SUPABASE_SERVICE_ROLE_KEY=your-key $0 [webhook-name]"
  exit 1
fi

if [[ -z "$SERVICE_ROLE_KEY" ]]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set"
  exit 1
fi

EDGE_FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/process-signer-signed"

echo "🔍 Creating webhook: $WEBHOOK_NAME"
echo "📍 Target URL: $EDGE_FUNCTION_URL"
echo ""

# Use Supabase Management API
# Docs: https://supabase.com/docs/reference/api/webhooks
WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "name": "$WEBHOOK_NAME",
  "type": "webhook_postgres_changes",
  "events": ["INSERT"],
  "config": {
    "table": "workflow_events",
    "schema": "public",
    "filter": "event_type=eq.signer.signed",
    "method": "POST",
    "url": "$EDGE_FUNCTION_URL",
    "headers": {
      "Content-Type": "application/json",
      "apikey": "$SERVICE_ROLE_KEY"
    },
    "body": "{ \"record\": {{ record }} }"
  }
}
EOF
)

# Note: Supabase Management API endpoint (this may need adjustment based on your setup)
# For now, this shows the structure. You'd typically use curl + Management API token
echo "📦 Webhook payload:"
echo "$WEBHOOK_PAYLOAD" | jq .

echo ""
echo "⚠️  IMPORTANT: Supabase Management API requires a separate access token."
echo "📚 To create webhooks programmatically:"
echo "   1. Get your Management API token from: https://supabase.com/dashboard/account/tokens"
echo "   2. Use: POST https://api.supabase.com/v1/projects/{ref}/database/webhooks"
echo ""
echo "🔗 For now, use the Dashboard with these EXACT settings:"
echo "   • Type: HTTP Request (NOT Edge Function)"
echo "   • Table: public.workflow_events"
echo "   • Events: INSERT only"
echo "   • Filter: event_type=eq.signer.signed"
echo "   • URL: $EDGE_FUNCTION_URL"
echo "   • Headers:"
echo "       Content-Type: application/json"
echo "       apikey: <YOUR_SERVICE_ROLE_KEY>"
echo "   • Body: { \"record\": {{ record }} }"
echo ""
echo "✅ Copy the exact configuration above to avoid the 'Edge Function' trap."
