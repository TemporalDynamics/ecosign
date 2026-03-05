import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('remaining internal security definer functions must not be executable by anon/authenticated', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305150000_close_internal_security_definer_exec_grants.sql'
  );
  const content = await fs.readFile(migrationPath, 'utf8');

  const functionNames = [
    'check_and_expire_shares',
    'claim_signer_for_signing',
    'expire_signer_links',
    'handle_new_user',
    'notify_creator_on_signature',
    'notify_signature_completed',
    'notify_signer_link',
    'notify_workflow_completed',
    'project_events_to_user_document',
    'queue_system_welcome_email',
    'queue_welcome_email',
    'release_signer_signing_lock',
    'release_workflow_signing_lock',
    'trigger_blockchain_anchoring',
    'worker_heartbeat',
  ];

  expect(content).toContain("AND p.proname = ANY(ARRAY[");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn)");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn)");
  expect(content).toContain("EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn)");
  expect(content).toContain("EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn)");
  expect(content).toContain("EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO postgres', fn)");

  for (const fnName of functionNames) {
    expect(content).toContain(`'${fnName}'`);
  }
});
