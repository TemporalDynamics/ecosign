# VerifySign – Deployment Guide (Vercel + Supabase)

This guide describes how to ship the cleaned-up JAMStack architecture: a single Vite/React frontend on Vercel plus Supabase for auth, Postgres, storage, and edge functions.

---

## 1. Prerequisites
- Vercel account with GitHub/GitLab/Bitbucket access
- Supabase account + CLI (`npm install -g supabase`)
- Node.js 18+ locally
- Resend (or any SMTP provider) for transactional email (optional but recommended)

Create two environment files locally:
- `.env` at repo root for shared secrets (never committed)
- `client/.env` for Vite variables (prefixed with `VITE_`)

---

## 2. Supabase Setup

### 2.1 Create project
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → **New Project**.
2. Name e.g. `verifysign-prod`, choose region near your users, store the generated database password securely.

### 2.2 Apply schema
You can run migrations through the CLI (recommended) or paste SQL in the dashboard.

```bash
supabase login                     # once per machine
supabase link --project-ref <ref>  # project ref from dashboard URL
supabase db push                   # runs supabase/migrations/*
```

If you prefer the UI, copy the SQL files inside `supabase/migrations/` into the SQL Editor in order.

### 2.3 Storage buckets
Create the buckets below (all private unless noted) under **Storage**:
- `eco-files` (private)
- `ecox-files` (private)
- `nda-signatures` (private)
- `proofs` (public; exposes read-only verification assets)
- `temp-uploads` (private, short-lived)

Run the storage policy SQL from `supabase/migrations` or create equivalent RLS rules manually.

### 2.4 Auth configuration
1. **Authentication → Providers**: enable Email; paste SMTP credentials (Resend example below).
```
Host: smtp.resend.com
Port: 587
User: resend
Pass: re_xxxxxxxxxxxx
From: noreply@verifysign.com
```
2. **Authentication → URL Configuration**: set Site URL to your Vercel domain (update after custom domain).
3. Customize email templates so they mention VerifySign and the correct URLs.

### 2.5 API keys & env vars
Copy from **Settings → API**:
- `SUPABASE_URL`
- `anon` key → `SUPABASE_ANON_KEY` (frontend)
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (edge functions only, never client)

Store them locally in `.env` and later in Vercel project settings.

---

## 3. Local environment
Populate the following files (example values):

`./.env`
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=super-secret
HMAC_SIGN_SECRET=32+chars-random
```

`client/.env`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_PUBLIC_SITE_URL=http://localhost:5173
```

Run locally:
```bash
npm install                   # installs root + workspaces
npm run dev --prefix client   # start Vite
supabase start                # optional: local Supabase stack
```

---

## 4. Deploy frontend with Vercel

1. Push the `repo-cleanup` branch (or `main`) to GitHub.
2. On [Vercel](https://vercel.com) click **Add New → Project**, import the repo.
3. Build settings:
```
Framework: Vite
Install Command: npm install
Build Command: npm run build --prefix client
Output Directory: client/dist
```
4. Environment variables (Project Settings → Environment Variables):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_PUBLIC_SITE_URL=https://app.verifysign.com
```
(never expose `SUPABASE_SERVICE_ROLE_KEY` to Vercel frontend envs.)
5. Trigger **Deploy**. When the build succeeds, add a custom domain if needed and update Supabase Auth URLs accordingly.

---

## 5. Deploy Supabase Edge Functions (optional but recommended)
If you implement server-side certificate flows, place functions under `supabase/functions/<name>/index.ts`.

Deploy example:
```bash
supabase functions deploy generate-cert --project-ref <ref>
supabase functions deploy verify-cert --project-ref <ref>
supabase functions deploy nda-signature --project-ref <ref>
```
Expose them via the Supabase Functions URL:
`https://<ref>.functions.supabase.co/<function-name>`

Provide each function the service-role key via Supabase **Project Settings → Functions → Environment Variables**.

---

## 6. Post-deploy verification checklist
- Landing `https://yourdomain.com` renders and assets load from `client/dist`.
- Supabase Auth signup/login succeeds; confirmation emails reach inbox (Resend logs ok).
- Edge functions return 200 for health checks (use `curl` with Authorization header).
- Storage rules deny unauthorized downloads (test without JWT).
- Analytics/monitoring (Vercel insights, Supabase logs) show no errors after a full user flow.

---

## 7. Operations & security
- Rotate `HMAC_SIGN_SECRET` and Supabase keys if they were ever printed in logs.
- Review RLS policies after every schema change.
- Enable Vercel protection (rate limiting, password-protected preview envs if needed).
- Monitor Supabase usage dashboards (database size, bandwidth) weekly to avoid free-tier throttling.

---

With these steps you have a single source of truth for deployments that matches the simplified repo structure. Keep `docs/deployment.md` updated whenever build commands or Supabase resources change.
