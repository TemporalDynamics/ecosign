#!/usr/bin/env bash
# Script to create webhook via Supabase Management API
# Requires: SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
WEBHOOK_NAME="${1:-process-signer-signed-webhook}"

if [[ -z "$PROJECT_REF" ]] || [[ -z "$ACCESS_TOKEN" ]] || [[ -z "$SERVICE_ROLE_KEY" ]]; then
  echo "❌ Missing required environment variables:"
  echo ""
  echo "Required:"
  echo "  SUPABASE_PROJECT_REF      - Your project reference ID"
  echo "  SUPABASE_ACCESS_TOKEN     - Personal access token from https://supabase.com/dashboard/account/tokens"
  echo "  SUPABASE_SERVICE_ROLE_KEY - Service role key for webhook authorization"
  echo ""
  echo "Usage:"
  echo "  export SUPABASE_PROJECT_REF=your-ref"
  echo "  export SUPABASE_ACCESS_TOKEN=sbp_xxxxx"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=eyJxxx..."
  echo "  $0 [webhook-name]"
  exit 1
fi

EDGE_FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/process-signer-signed"
API_ENDPOINT="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/webhooks"

echo "🚀 Creating webhook via Management API"
echo "📍 Endpoint: $API_ENDPOINT"
echo "🎯 Target: $EDGE_FUNCTION_URL"
echo ""

# Create webhook payload
PAYLOAD=$(cat <<EOF
{
  "name": "$WEBHOOK_NAME",
  "type": "http_request",
  "events": {
    "insert": true,
    "update": false,
    "delete": false
  },
  "config": {
    "schema": "public",
    "table": "workflow_events",
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

echo "📦 Payload:"
echo "$PAYLOAD" | jq . 2>/dev/null || echo "$PAYLOAD"
echo ""

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "✅ Webhook created successfully!"
  echo ""
  echo "Response:"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  echo ""
  echo "🔍 Verify in Dashboard:"
  echo "   https://supabase.com/dashboard/project/$PROJECT_REF/database/webhooks"
else
  echo "❌ Failed to create webhook (HTTP $HTTP_CODE)"
  echo ""
  echo "Response:"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
  echo ""
  echo "💡 Common issues:"
  echo "   • Invalid ACCESS_TOKEN - generate new one at https://supabase.com/dashboard/account/tokens"
  echo "   • Wrong PROJECT_REF - check your project settings"
  echo "   • API schema changed - check Supabase docs"
  exit 1
fi
