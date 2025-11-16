#!/bin/bash

# Test Edge Functions
PROJECT_REF="tbxowirrvgtvfnxcdqks"

echo "🧪 Testing Edge Functions..."
echo ""

# Get anon key from .env
ANON_KEY=$(grep VITE_SUPABASE_ANON_KEY client/.env | cut -d '=' -f2)

if [ -z "$ANON_KEY" ]; then
    echo "❌ VITE_SUPABASE_ANON_KEY not found in client/.env"
    exit 1
fi

echo "📌 Anon Key: ${ANON_KEY:0:20}..."
echo ""

# Test 1: anchor-bitcoin
echo "1️⃣ Testing anchor-bitcoin..."
curl -i -X POST \
  "https://$PROJECT_REF.supabase.co/functions/v1/anchor-bitcoin" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentHash": "abc123test",
    "userEmail": "test@example.com"
  }'

echo ""
echo ""

# Test 2: signnow
echo "2️⃣ Testing signnow..."
curl -i -X POST \
  "https://$PROJECT_REF.supabase.co/functions/v1/signnow" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "documentFile": {"base64": "test", "name": "test.pdf"},
    "signers": [{"email": "test@example.com"}]
  }'

echo ""
