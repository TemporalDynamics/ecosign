a# VerifySign Architecture

This document captures the current VerifySign architecture after the repo cleanup. The goal is a lean JAMStack setup centered on a single Vite/React frontend, Supabase for backend services, and a shared `eco-packer` package for certificate generation.

## High-Level Overview

```
verifysign/
├── client/          # Vite + React SPA (only UI surface)
├── eco-packer/      # Shared library to pack/unpack .ECO assets
├── supabase/        # Database schema, migrations, edge functions
├── docs/            # Canonical documentation (this file, deployment, API, security)
├── scripts/         # Local automation helpers
└── docs/ops/vercel.json      # Hosting configuration
```

Key principles:
- **Single frontend**: all user experiences (marketing, onboarding, dashboard) live in `client/`.
- **Serverless backend**: Supabase handles auth, Postgres, storage, and optional edge functions—no custom Node server.
- **Shared logic**: `eco-packer` encapsulates .ECO packing/verification so both frontend and Supabase functions reuse the same code.
- **Docs first**: root stays minimal; everything else is documented inside `docs/`.

## System Components

### Client Application (`client/`)
- Built with Vite + React + TypeScript.
- Routes cover Landing, Login, Dashboard, Verify, NDA flows; additional surfaces should be modeled as React pages, not separate apps.
- `src/lib/` houses Supabase client setup and lightweight wrappers around `eco-packer`.
- Uses Supabase Auth (email/password, magic links, etc.) for session handling.
- Deployed to Vercel as a static build (`client/dist`).

### Shared Package (`eco-packer/`)
- Pure TypeScript library that knows how to pack data into the `.eco` format and verify `.ecox` bundles.
- Published internally via workspace linking (see root `package.json`).
- Imported by the frontend for quick checks and by Supabase Edge Functions for trusted generation/verification.

### Supabase Backend (`supabase/`)
- **Database & RLS**: SQL migrations define tables like `users`, `eco_certificates`, `signatures`, plus Row Level Security policies.
- **Edge Functions**: TypeScript/Deno functions such as `generate-cert`, `verify-cert`, and `nda-signature`. They orchestrate `eco-packer`, write metadata, and return signed payloads.
- **Storage**: Buckets dedicated to raw uploads and generated `.eco` artifacts, with signed URL expiration enforcing least privilege.

### Certificates (.ECO/.ECOX)
1. Client hashes the uploaded document (SHA-256) and sends metadata to Supabase.
2. Edge Function invokes `eco-packer` to build the `.eco` payload with timestamp + hash + signature + optional blockchain anchor.
3. Resulting file is stored in Supabase Storage and reference rows are written to Postgres for querying.
4. Verification uses the same package to re-hash and validate anchors either client-side (fast) or in an edge function (trusted).

## Security Model (summary)
- Supabase Auth secures every request; JWT is injected into PostgREST and Storage calls.
- RLS ensures users only read/write their own certificates and NDA entries.
- Edge Functions run with service-role keys and are the only place that can mint final `.eco` artifacts.
- SHA-256 hashing + optional blockchain anchoring protect integrity and timestamping.
- See `docs/security.md` for detailed policies and threat considerations.

## Development Workflow
1. Install dependencies: `npm install` at the root (installs workspace deps) then `npm run dev --prefix client` for the SPA.
2. Run Supabase locally via `supabase start`; apply migrations with `supabase db reset`.
3. Test edge functions using `supabase functions serve generate-cert --env-file supabase/.env` (replace name as needed).
4. Lint/build: `npm run build --prefix client`.

## Deployment
- Vercel builds the `client/` app using `npm run build` and serves `client/dist` as a static site.
- Supabase hosts the database, auth, storage, and edge functions; deployments run via `supabase functions deploy <name>` and `supabase db push`.
- `docs/ops/vercel.json` pins build commands and `supabase/config.toml` tracks project settings.

This architecture keeps the surface area small, ensures every component has a single home, and aligns the repo layout with the Supabase + Vercel JAMStack model described in the cleanup plan.
