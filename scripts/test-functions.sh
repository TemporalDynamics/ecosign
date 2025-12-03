#!/bin/bash

# Test Edge Functions
PROJECT_REF="uiyojopjbhooxrmamaiw"

echo "🧪 Testing Edge Functions..."
echo ""

# Get anon key from .env.local or use hardcoded key
if [ -f ".env.local" ]; then
    ANON_KEY=$(grep SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)
else
    # Fallback to hardcoded key from supabaseClient.js
    ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzAyMTUsImV4cCI6MjA3OTI0NjIxNX0.3xQ3db1dmTyAsbOtdJt4zpplG8RcnkxqCQR5wWkvFxk"
fi

if [ -z "$ANON_KEY" ]; then
    echo "❌ SUPABASE_ANON_KEY not found in .env.local"
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
