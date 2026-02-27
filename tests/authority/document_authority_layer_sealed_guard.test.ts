import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MILESTONE_DOC = path.join(ROOT, 'docs/beta/DOCUMENT_AUTHORITY_LAYER_SEALED.md');
const EVENT_HELPER_FILE = path.join(ROOT, 'supabase/functions/_shared/eventHelper.ts');
const APPEND_RPC_SQL_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql',
);
const FREEZE_SQL_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001000_freeze_user_documents_writes.sql',
);
const PREBETA_FIRE_DRILL_FILE = path.join(ROOT, 'scripts/diagnostics/prebeta_fire_drill.sh');

test('document authority milestone doc must define single-source canonical contract', async () => {
  const content = await fs.readFile(MILESTONE_DOC, 'utf8');

  expect(content).toContain('Document Authority Layer Sealed (Milestone)');
  expect(content).toContain('document_entities.events[]');
  expect(content).toContain('append_document_entity_event');
  expect(content).toContain('entity_id == document_entity_id');
  expect(content).toContain('correlation_id == document_entity_id');
  expect(content).toContain('Proyección legacy congelada');
  expect(content).toContain('Criterio de aceptación');
});

test('event helper must keep canonical RPC append with entity/correlation invariants', async () => {
  const content = await fs.readFile(EVENT_HELPER_FILE, 'utf8');

  expect(content).toContain(".rpc('append_document_entity_event'");
  expect(content).toContain('entity_id: documentEntityId');
  expect(content).toContain('correlation_id: documentEntityId');
  expect(content).toContain("p_document_entity_id: documentEntityId");
});

test('append RPC SQL must enforce envelope + append-only lock + idempotence guard', async () => {
  const content = await fs.readFile(APPEND_RPC_SQL_FILE, 'utf8');

  expect(content).toContain('CREATE OR REPLACE FUNCTION public.append_document_entity_event(');
  expect(content).toContain("Event must include id, kind, at, v, actor, entity_id, correlation_id");
  expect(content).toContain('FOR UPDATE;');
  expect(content).toContain("event_kind IN ('anchor.confirmed', 'anchor.submitted', 'anchor.failed', 'anchor.timeout')");
  expect(content).toContain('UPDATE public.document_entities');
});

test('user_documents freeze migration must keep direct writes blocked', async () => {
  const content = await fs.readFile(FREEZE_SQL_FILE, 'utf8');

  expect(content).toContain('CREATE OR REPLACE FUNCTION public.guard_user_documents_writes()');
  expect(content).toContain('CREATE TRIGGER trg_user_documents_write_guard');
  expect(content).toContain("v_ctx IN ('projection', 'legacy', 'maintenance')");
  expect(content).toContain('user_documents is frozen: direct writes are disabled');
});

test('prebeta fire drill must gate document authority sealed guard', async () => {
  const content = await fs.readFile(PREBETA_FIRE_DRILL_FILE, 'utf8');

  expect(content).toContain('Document authority layer sealed guard');
  expect(content).toContain('tests/authority/document_authority_layer_sealed_guard.test.ts');
});
