import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const MILESTONE_DOC = path.join(ROOT, 'docs/beta/ANCHOR_LAYER_SEALED.md');
const PROCESS_BITCOIN_FILE = path.join(ROOT, 'supabase/functions/process-bitcoin-anchors/index.ts');
const PROCESS_POLYGON_FILE = path.join(ROOT, 'supabase/functions/process-polygon-anchors/index.ts');
const HARDENING_SQL_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql',
);

test('anchor layer sealed milestone doc must exist with deterministic guarantees', async () => {
  const content = await fs.readFile(MILESTONE_DOC, 'utf8');

  expect(content).toContain('Anchor Layer Sealed (Milestone)');
  expect(content).toContain('v1.6.8-anchor-liveness-isolation');
  expect(content).toContain('Concurrencia determinista');
  expect(content).toContain('Idempotencia determinista');
  expect(content).toContain('Liveness determinista');
  expect(content).toContain('State machine de anchors');
  expect(content).toContain('Criterio de aceptacion');
});

test('bitcoin and polygon workers must keep sealed invariants wired in code', async () => {
  const [bitcoinContent, polygonContent] = await Promise.all([
    fs.readFile(PROCESS_BITCOIN_FILE, 'utf8'),
    fs.readFile(PROCESS_POLYGON_FILE, 'utf8'),
  ]);

  expect(bitcoinContent).toContain(".rpc('claim_anchor_batch'");
  expect(bitcoinContent).toContain('for (const anchor of queuedAnchors)');
  expect(bitcoinContent).toContain('for (const anchor of pendingAnchors)');
  expect(bitcoinContent).toContain('catch (anchorSubmitError)');
  expect(bitcoinContent).toContain('catch (anchorError)');
  expect(bitcoinContent).toContain('emitAnchorTimeoutEvent(');
  expect(bitcoinContent).toContain('emitAnchorConfirmedEvent(');

  expect(polygonContent).toContain(".rpc('claim_anchor_batch'");
  expect(polygonContent).toContain('evaluateTimeout(');
  expect(polygonContent).toContain('projectRetry(');
  expect(polygonContent).toContain('emitAnchorTimeoutEvent(');
});

test('sql hardening migration must preserve claim/dedupe/outbox invariants', async () => {
  const content = await fs.readFile(HARDENING_SQL_FILE, 'utf8');

  expect(content).toContain('CREATE OR REPLACE FUNCTION public.claim_anchor_batch(');
  expect(content).toContain('FOR UPDATE SKIP LOCKED');
  expect(content).toContain('CREATE OR REPLACE FUNCTION public.append_document_entity_event(');
  expect(content).toContain('workflow_notifications_anchor_confirmed_unique');
});
