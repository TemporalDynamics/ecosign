import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase/functions');

const DIRECT_SIGNER_STATUS_WRITE_PATTERN =
  /from\(['"]workflow_signers['"]\)\s*\n\s*\.update\(\{[\s\S]{0,320}\bstatus\s*:/m;
const VARIABLE_WORKFLOW_SIGNER_UPDATE_PATTERN =
  /from\(['"]workflow_signers['"]\)[\s\S]{0,260}\.update\((\w+)\)/gm;

function hasVariableStatusWrite(content: string): boolean {
  const matches = [...content.matchAll(VARIABLE_WORKFLOW_SIGNER_UPDATE_PATTERN)];
  for (const match of matches) {
    const variableName = match[1];
    const declarationPattern = new RegExp(
      String.raw`(?:const|let)\s+${variableName}\s*[:=][\s\S]{0,320}\bstatus\s*:`,
      'm'
    );
    if (declarationPattern.test(content)) {
      return true;
    }
  }
  return false;
}

async function listFunctionEntryFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('_')) continue;
      files.push(...(await listFunctionEntryFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name === 'index.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

test('active handlers must not mutate workflow_signers.status directly', async () => {
  const files = await listFunctionEntryFiles(FUNCTIONS_ROOT);
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    if (DIRECT_SIGNER_STATUS_WRITE_PATTERN.test(content) || hasVariableStatusWrite(content)) {
      offenders.push(path.relative(ROOT, filePath));
    }
  }

  expect(
    offenders,
    `Direct workflow_signers.status writers found: ${offenders.join(', ')}`
  ).toEqual([]);
});

test('signer projection hardening migration must exist and wire guard/projector', async () => {
  const migrationPath = path.join(
    ROOT,
    'supabase/migrations/20260305203000_project_workflow_signer_status_from_events.sql'
  );

  const content = await fs.readFile(migrationPath, 'utf8');
  expect(content).toContain('CREATE OR REPLACE FUNCTION public.project_workflow_signer_status');
  expect(content).toContain('CREATE TRIGGER trg_project_workflow_signer_status_from_event');
  expect(content).toContain('CREATE OR REPLACE FUNCTION public.guard_workflow_signers_status_writes');
  expect(content).toContain('CREATE TRIGGER trg_guard_workflow_signers_status_writes');
  expect(content).toContain("'signer.ready_to_sign'");
  expect(content).toContain("'signer.invited'");
  expect(content).toContain("'signer.expired'");
});
