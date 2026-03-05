import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

test('sql workflow helpers must not mutate signature_workflows.status and must be internal-only', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305160000_reduce_status_sql_authority.sql'
  );
  const content = await fs.readFile(migrationPath, 'utf8');

  expect(content).toContain('CREATE OR REPLACE FUNCTION public.advance_workflow');
  expect(content).toContain('CREATE OR REPLACE FUNCTION public.create_workflow_version');

  const workflowUpdateMatch = content.match(
    /UPDATE public\.signature_workflows[\s\S]*?SET([\s\S]*?)WHERE id = p_workflow_id;/m
  );
  expect(workflowUpdateMatch).not.toBeNull();
  expect(workflowUpdateMatch?.[1] ?? '').not.toMatch(/\bstatus\s*=/);

  expect(content).toContain('REVOKE ALL ON FUNCTION public.advance_workflow(UUID) FROM PUBLIC');
  expect(content).toContain('REVOKE ALL ON FUNCTION public.advance_workflow(UUID) FROM anon');
  expect(content).toContain('REVOKE ALL ON FUNCTION public.advance_workflow(UUID) FROM authenticated');
  expect(content).toContain('GRANT EXECUTE ON FUNCTION public.advance_workflow(UUID) TO service_role');

  expect(content).toContain(
    'REVOKE ALL ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC'
  );
  expect(content).toContain(
    'REVOKE ALL ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon'
  );
  expect(content).toContain(
    'REVOKE ALL ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) FROM authenticated'
  );
  expect(content).toContain(
    'GRANT EXECUTE ON FUNCTION public.create_workflow_version(UUID, TEXT, TEXT, TEXT, UUID, JSONB) TO service_role'
  );
});
