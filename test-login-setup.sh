#!/bin/bash

# Test Login Setup Script
# Run this to verify your local development environment is ready for login testing

set -e

echo "🔍 EcoSign Local Login Test Suite"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_count=0
pass_count=0

# Helper function
run_test() {
  local test_name=$1
  local command=$2
  test_count=$((test_count + 1))

  echo -n "[$test_count] $test_name... "

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗${NC}"
  fi
}

# Test 1: Environment variables
run_test "client/.env exists" "test -f client/.env"

if test -f client/.env; then
  run_test "VITE_SUPABASE_URL is set" "grep -q 'VITE_SUPABASE_URL=' client/.env"
  run_test "VITE_SUPABASE_ANON_KEY is set" "grep -q 'VITE_SUPABASE_ANON_KEY=' client/.env"

  URL=$(grep 'VITE_SUPABASE_URL=' client/.env | cut -d'=' -f2)
  KEY=$(grep 'VITE_SUPABASE_ANON_KEY=' client/.env | cut -d'=' -f2)

  echo "   URL: $URL"
  echo "   KEY: ${KEY:0:20}..."
fi

echo ""
echo "Backend Services:"

# Test 2: Supabase Auth Service
run_test "Supabase Auth running (port 54321)" "curl -s http://127.0.0.1:54321/auth/v1/health > /dev/null"

# Test 3: Frontend Dev Server
run_test "Frontend dev server running (port 5173)" "curl -s http://localhost:5173 > /dev/null"

echo ""
echo "API Endpoints:"

# Test 4: Auth Health
run_test "Auth health endpoint responds" "curl -s http://127.0.0.1:54321/auth/v1/health | grep -q 'GoTrue'"

# Test 5: Create Test User
echo -n "[5] Creating test user (test@example.com)... "
USER_RESPONSE=$(curl -s -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}' 2>/dev/null || echo "{}")

if echo "$USER_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓${NC}"
  pass_count=$((pass_count + 1))
  USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "   User ID: $USER_ID"
else
  echo -e "${RED}✗${NC}"
  echo "   Response: $USER_RESPONSE"
fi
test_count=$((test_count + 1))

# Test 6: Login with Test User
echo -n "[6] Logging in with test user... "
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}' \
  'http://127.0.0.1:54321/auth/v1/token?grant_type=password' 2>/dev/null || echo "{}")

if echo "$LOGIN_RESPONSE" | grep -q 'access_token'; then
  echo -e "${GREEN}✓${NC}"
  pass_count=$((pass_count + 1))
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4 | head -c 20)
  echo "   Token: ${TOKEN}..."
else
  echo -e "${RED}✗${NC}"
  echo "   Response: $LOGIN_RESPONSE"
fi
test_count=$((test_count + 1))

echo ""
echo "=================================="
echo "Results: ${pass_count}/${test_count} tests passed"

if [ $pass_count -eq $test_count ]; then
  echo -e "${GREEN}✅ All systems ready for login testing!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Open http://localhost:5173/login in your browser"
  echo "2. Use these credentials:"
  echo "   Email: test@example.com"
  echo "   Password: Test123456!"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. See troubleshooting guide:${NC}"
  echo "   docs/LOCAL_LOGIN_TROUBLESHOOTING.md"
  exit 1
fi
