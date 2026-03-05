import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('folder RPC grants must block anon and allow authenticated/service roles', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305143000_harden_user_folder_rpc_grants.sql'
  );
  const content = await fs.readFile(migrationPath, 'utf8');

  const signatures = [
    'public.create_document_folder(text)',
    'public.rename_document_folder(uuid, text)',
    'public.delete_document_folder(uuid)',
    'public.move_documents_to_folder(uuid[], uuid)',
    'public.request_certificate_regeneration(uuid, text)',
  ];

  for (const signature of signatures) {
    expect(content).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC`);
    expect(content).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM anon`);
    expect(content).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO authenticated`);
    expect(content).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role`);
  }
});
