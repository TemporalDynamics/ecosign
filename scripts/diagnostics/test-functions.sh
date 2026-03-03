#!/bin/bash

# Test Edge Functions
PROJECT_REF="uiyojopjbhooxrmamaiw"

echo "🧪 Testing Edge Functions..."
echo ""

# Get anon key from .env.local or environment
if [ -f ".env.local" ]; then
    ANON_KEY=$(grep SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)
else
    ANON_KEY="${SUPABASE_ANON_KEY:-}"
fi

if [ -z "$ANON_KEY" ]; then
    echo "❌ SUPABASE_ANON_KEY not found in .env.local or environment"
    exit 1
fi

echo "📌 Anon Key: ${ANON_KEY:0:20}..."
echo ""

# Test 1: anchor-bitcoin
echo "1️⃣ Testing anchor-bitcoin..."
HASH=$(echo -n "abc123test" | sha256sum | awk '{print $1}')
curl -i -X POST \
  "https://$PROJECT_REF.supabase.co/functions/v1/anchor-bitcoin" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"documentHash\": \"$HASH\",
    \"userEmail\": \"test@example.com\"
  }"

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
echo ""

# Test 3: anchor-polygon
echo "3️⃣ Testing anchor-polygon..."
HASH=$(echo -n "poly123test" | sha256sum | awk '{print $1}')
curl -i -X POST \
  "https://$PROJECT_REF.supabase.co/functions/v1/anchor-polygon" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"documentHash\": \"$HASH\",
    \"userEmail\": \"test@example.com\"
  }"

echo ""
