import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260305233000_close_remaining_security_definer_exec_surfaces.sql'
);

test('remaining SECURITY DEFINER surfaces must be closed to anon/authenticated', async () => {
  const sql = await fs.readFile(MIGRATION, 'utf8');

  const internalSecDefSignatures = [
    'public.generate_ecox_certificate(uuid)',
    'public.generate_invite_token()',
    'public.get_cron_runtime_status()',
    'public.get_cron_status(text)',
    'public.guard_user_documents_writes()',
    'public.invoke_fase1_executor()',
    'public.invoke_process_bitcoin_anchors()',
    'public.invoke_process_polygon_anchors()',
    'public.project_events_to_user_document_trigger()',
    'public.rebuild_user_documents_projection(uuid)',
    'public.set_operation_document_added_by()',
  ];

  for (const signature of internalSecDefSignatures) {
    expect(sql).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;`);
    expect(sql).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM anon, authenticated;`);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO postgres;`);
  }
});

