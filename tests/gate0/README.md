Gate-0 canonical tests

These tests encode the minimal, non-negotiable invariants required to open the closed beta for EcoSign.

How to run (local - recommended)

1. Start Supabase local: supabase start
2. Load env and run the gate tests: ./scripts/load-supabase-env.sh npx vitest tests/gate0 --run

Notes
- Do NOT commit secrets. Use Supabase local or CI secrets.
- These tests are intentionally small and strict; they are the authoritative Gate-0 checks.
