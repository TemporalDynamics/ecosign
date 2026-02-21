# Local Development Login Troubleshooting

## Status Check

```bash
# 1. Verify Supabase auth is running
curl -s http://127.0.0.1:54321/auth/v1/health | jq .

# 2. Verify frontend dev server is running
curl -I http://localhost:5173/login

# 3. Check environment variables are loaded
cat client/.env | grep VITE_SUPABASE
```

## Issue #1: "CORS Error" or Network Blocked

**Symptoms**: Browser console shows CORS errors, network requests fail

**Solution**:
```bash
# Ensure using 127.0.0.1 NOT localhost
# Edit client/.env:
VITE_SUPABASE_URL=http://127.0.0.1:54321
```

Why: Firefox and some browsers have CORS restrictions with localhost. Use `127.0.0.1` instead.

---

## Issue #2: "Invalid login credentials"

**Symptoms**: Credentials are rejected even though user exists

**Causes**:
- User not yet created
- Incorrect email/password
- Email case sensitivity (try lowercase)

**Solution**:
```bash
# Create a test user
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }'

# Then try logging in with those exact credentials
```

---

## Issue #3: Page stays on login, no redirect

**Symptoms**: Form submits, but page doesn't go to /inicio

**Causes**:
- Session not persisted
- Navigation not working
- Crypto initialization failing

**Debug**:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors with "Sesión crypto" or "initializeSessionCrypto"
4. Check Network tab → look for failed requests to `/inicio`

**Solution**:
```bash
# Clear browser cache/localStorage
# In console:
localStorage.clear()
sessionStorage.clear()

# Then refresh and try again
```

---

## Issue #4: "Environment variables are missing"

**Symptoms**: Yellow/red error box on page about configuration

**Solution**:
```bash
# Verify .env file exists and has values
ls -la client/.env
cat client/.env

# Should show:
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# If empty or missing, copy from example:
cp client/.env.example client/.env

# Then restart dev server
npm run dev
```

---

## Issue #5: Console errors about supabaseClient

**Symptoms**: Error like "TypeError: getSupabase is not defined"

**Solution**:
```bash
# Hard restart dev server and browser
# 1. Stop dev server (Ctrl+C)
# 2. Clear node_modules cache
npm cache clean --force
npm install

# 3. Restart dev server
npm run dev

# 4. Full browser refresh (Ctrl+Shift+R)
```

---

## Testing the API Directly

If the login form doesn't work, test the API manually:

```bash
# Test user signup
curl -X POST http://127.0.0.1:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!"
  }' | jq .

# Test user login
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}' \
  'http://127.0.0.1:54321/auth/v1/token?grant_type=password' | jq .

# If you get a token, the backend is working
# If not, check Supabase container logs:
docker logs supabase_auth_custodyart 2>&1 | tail -50
```

---

## Check Browser Console Errors

Most detailed info is in browser DevTools. Open it with F12:

1. **Console tab**: Shows JavaScript errors
2. **Network tab**: Shows failed HTTP requests
   - Filter: `auth/v1` to see auth requests
   - Check response codes and messages
3. **Application tab**: Shows stored cookies/localStorage
   - Look for `sb-*` keys (Supabase session tokens)

---

## Logs to Check

```bash
# Frontend dev server logs (npm run dev output)
# Look for: ERROR, CORS, socket errors

# Supabase auth logs
docker logs supabase_auth_custodyart 2>&1 | grep -i error | tail -20

# Supabase postgres logs
docker logs supabase_db_custodyart 2>&1 | grep -i error | tail -20
```

---

## Reset Everything (Nuclear Option)

If stuck, reset all services:

```bash
# 1. Stop dev server
# Ctrl+C in npm run dev terminal

# 2. Stop and remove Docker containers
docker compose -f docker-compose.yml down -v

# 3. Remove node_modules and lock files
rm -rf node_modules
rm -rf client/node_modules
rm package-lock.json

# 4. Clean install
npm install
npm install --prefix client

# 5. Restart Supabase
docker compose -f docker-compose.yml up -d

# 6. Wait 30 seconds for Supabase to fully start
sleep 30

# 7. Restart dev server
npm run dev

# 8. Create new test user and login
```

---

## Quick Checklist

- [ ] `VITE_SUPABASE_URL=http://127.0.0.1:54321` (NOT localhost)
- [ ] `VITE_SUPABASE_ANON_KEY` has 3 parts (JWT format)
- [ ] Supabase auth endpoint responds to `/auth/v1/health`
- [ ] Frontend dev server runs on 5173
- [ ] Browser console shows no red errors
- [ ] Can create test user via curl
- [ ] Can login with test user via curl
- [ ] Browser localStorage has `sb-*` keys after login

---

## Getting Help

Include this when reporting login issues:

```bash
# Output this:
echo "=== ENVIRONMENT ===" && \
  cat client/.env && \
  echo -e "\n=== AUTH HEALTH ===" && \
  curl -s http://127.0.0.1:54321/auth/v1/health | jq . && \
  echo -e "\n=== DEV SERVER ===" && \
  lsof -i :5173 || echo "Dev server not running"
```
