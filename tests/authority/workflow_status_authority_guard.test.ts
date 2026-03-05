import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const FORBIDDEN_WRITERS = [
  'apply-signer-signature',
  'cancel-workflow',
  'reject-signature',
  'request-document-changes',
  'respond-to-changes',
  'signnow',
  'signnow-webhook',
];

const STATUS_WRITE_PATTERN =
  /from\(['"]signature_workflows['"]\)[\s\S]{0,260}\.update\(\{[\s\S]{0,420}\bstatus\s*:/m;

test('workflow status authority: critical handlers must not mutate signature_workflows.status directly', async () => {
  const offenders: string[] = [];

  for (const fnName of FORBIDDEN_WRITERS) {
    const filePath = path.join(ROOT, 'supabase/functions', fnName, 'index.ts');
    const content = await fs.readFile(filePath, 'utf8');

    if (STATUS_WRITE_PATTERN.test(content)) {
      offenders.push(fnName);
    }
  }

  expect(
    offenders,
    `These handlers still mutate signature_workflows.status directly: ${offenders.join(', ')}`
  ).toEqual([]);
});

test('workflow status authority: projection migration must exist and wire trigger', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305113000_project_signature_workflow_status_from_events.sql'
  );

  const content = await fs.readFile(migrationPath, 'utf8');
  expect(content).toContain('CREATE OR REPLACE FUNCTION public.project_signature_workflow_status');
  expect(content).toContain('CREATE TRIGGER trg_project_signature_workflow_status_from_event');
  expect(content).toContain("REVOKE ALL ON FUNCTION public.project_signature_workflow_status(UUID) FROM PUBLIC");
  expect(content).toContain("REVOKE ALL ON FUNCTION public.project_signature_workflow_status(UUID) FROM anon");
  expect(content).toContain("REVOKE ALL ON FUNCTION public.project_signature_workflow_status(UUID) FROM authenticated");
});

test('workflow status authority: workflow_events write surface must be service-only', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305123000_harden_workflow_events_authority_surface.sql'
  );

  const content = await fs.readFile(migrationPath, 'utf8');
  expect(content).toContain("REVOKE ALL ON FUNCTION public.append_event_to_workflow_events(text, uuid, uuid, jsonb, uuid) FROM PUBLIC");
  expect(content).toContain('TO service_role');
  expect(content).toContain('DROP POLICY IF EXISTS "Service role can insert workflow events"');
  expect(content).toContain('FOR INSERT');
  expect(content).toContain('TO service_role');
  expect(content).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.workflow_events FROM anon');
  expect(content).toContain('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.workflow_events FROM authenticated');
});
