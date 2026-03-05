import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260305235900_harden_rate_limit_internal_tables_service_only.sql'
);

test('rate-limit internal tables hardening migration must enforce service-role-only access', async () => {
  const sql = await fs.readFile(MIGRATION, 'utf8');

  for (const tableName of ['rate_limits', 'rate_limit_blocks']) {
    expect(sql).toContain(`'${tableName}'`);
    expect(sql).toContain(`ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY`);
    expect(sql).toContain(`REVOKE ALL ON TABLE public.%I FROM PUBLIC`);
    expect(sql).toContain(`REVOKE ALL ON TABLE public.%I FROM anon, authenticated`);
    expect(sql).toContain(
      `GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I TO service_role`
    );
    expect(sql).toContain(
      `GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I TO postgres`
    );
    expect(sql).toContain(`CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)`);
  }
});

