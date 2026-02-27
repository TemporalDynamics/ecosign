import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const PROCESS_BITCOIN_FILE = path.join(ROOT, 'supabase/functions/process-bitcoin-anchors/index.ts');
const PROCESS_POLYGON_FILE = path.join(ROOT, 'supabase/functions/process-polygon-anchors/index.ts');
const SHARED_STATE_MACHINE_FILE = path.join(ROOT, 'supabase/functions/_shared/anchorStateMachine.ts');
const CONCURRENCY_HARDENING_MIGRATION_FILE = path.join(
  ROOT,
  'supabase/migrations/20260301001200_anchor_concurrency_idempotence_hardening.sql',
);
const UI_PROBATIVE_HELPER_FILE = path.join(ROOT, 'client/src/lib/anchorProbativeState.ts');
const UI_DOCUMENT_INFO_FILE = path.join(ROOT, 'client/src/components/DocumentStateInfo.tsx');
const UI_TOOLTIP_FILE = path.join(ROOT, 'client/src/lib/deriveDocumentTooltip.ts');

test('bitcoin worker must emit explicit timeout events and canonical confirmed event helper', async () => {
  const content = await fs.readFile(PROCESS_BITCOIN_FILE, 'utf8');

  expect(content).toContain('MAX_VERIFY_ATTEMPTS');
  expect(content).toContain('BITCOIN_TIMEOUT_HOURS');
  expect(content).toContain('BITCOIN_RETRY_SCHEDULE_MINUTES');
  expect(content).toContain('BITCOIN_RETRY_POLICY');
  expect(content).toContain('isRetryDue(');
  expect(content).toContain('evaluateTimeout(');
  expect(content).toContain('projectRetry(');
  expect(content).toContain('projectSubmitted(');
  expect(content).toContain('nextRetryAt');
  expect(content).toContain(".rpc('claim_anchor_batch'");
  expect(content).toContain('enqueueBitcoinNotifications(');
  expect(content).toContain(".upsert({");
  expect(content).toContain('workflow_id,recipient_email,notification_type');
  expect(content).toContain('emitAnchorTimeoutEvent(');
  expect(content).toContain("kind: 'anchor.timeout'");
  expect(content).toMatch(/failure_code:\s*timeoutBy === 'max_attempts' \? 'max_attempts' : 'timeout'/);
  expect(content).toContain('emitAnchorConfirmedEvent(');
  expect(content).toContain('for (const anchor of queuedAnchors)');
  expect(content).toContain('catch (anchorSubmitError)');
  expect(content).toContain('for (const anchor of pendingAnchors)');
  expect(content).toContain('catch (anchorError)');
});

test('polygon worker must enforce deterministic timeout and max-attempt terminal states', async () => {
  const content = await fs.readFile(PROCESS_POLYGON_FILE, 'utf8');

  expect(content).toContain('MAX_POLYGON_ATTEMPTS');
  expect(content).toContain('POLYGON_PENDING_TIMEOUT_MINUTES');
  expect(content).toContain('POLYGON_RETRY_SCHEDULE_MINUTES');
  expect(content).toContain('POLYGON_RETRY_POLICY');
  expect(content).toContain('isRetryDue(');
  expect(content).toContain('evaluateTimeout(');
  expect(content).toContain('projectRetry(');
  expect(content).toContain('nextRetryAt');
  expect(content).toContain(".rpc('claim_anchor_batch'");
  expect(content).toContain('workflow_id,recipient_email,notification_type');
  expect(content).toContain('emitAnchorTimeoutEvent(');
  expect(content).toContain("kind: 'anchor.timeout'");
  expect(content).toContain("timeoutBy === 'max_attempts' ? 'max_attempts' : 'timeout'");
  expect(content).toContain('timeoutEvaluation.pendingAgeMinutes');
});

test('shared anchor state machine helper must define retry projection and timeout evaluation', async () => {
  const content = await fs.readFile(SHARED_STATE_MACHINE_FILE, 'utf8');

  expect(content).toContain("export type AnchorNetwork = 'bitcoin' | 'polygon'");
  expect(content).toContain('export interface AnchorRetryPolicy');
  expect(content).toContain('parseRetryScheduleMinutes(');
  expect(content).toContain('isRetryDue(');
  expect(content).toContain('evaluateTimeout(');
  expect(content).toContain('projectRetry(');
  expect(content).toContain('projectSubmitted(');
  expect(content).toContain('nextRetryAt');
  expect(content).toContain("retryPolicyVersion: 'anchor-sm-v1'");
});

test('migration must harden anchor concurrency and event/outbox idempotence in SQL', async () => {
  const content = await fs.readFile(CONCURRENCY_HARDENING_MIGRATION_FILE, 'utf8');

  expect(content).toContain('CREATE OR REPLACE FUNCTION public.claim_anchor_batch(');
  expect(content).toContain('FOR UPDATE SKIP LOCKED');
  expect(content).toContain('workflow_notifications_anchor_confirmed_unique');
  expect(content).toContain('CREATE OR REPLACE FUNCTION public.append_document_entity_event(');
  expect(content).toContain('SELECT COALESCE(de.events,');
  expect(content).toContain('FOR UPDATE;');
  expect(content).toContain('jsonb_array_elements(current_events)');
  expect(content).toContain('RETURN;');
});

test('ui derivation must use the shared probative helper (single source)', async () => {
  const [probativeContent, infoContent, tooltipContent] = await Promise.all([
    fs.readFile(UI_PROBATIVE_HELPER_FILE, 'utf8'),
    fs.readFile(UI_DOCUMENT_INFO_FILE, 'utf8'),
    fs.readFile(UI_TOOLTIP_FILE, 'utf8'),
  ]);

  expect(probativeContent).toContain('export const PROBATIVE_STATES');
  expect(probativeContent).toContain('deriveAnchorProbativeState(');
  expect(probativeContent).toContain("kind === 'anchor.timeout'");
  expect(probativeContent).toContain("kind === 'anchor.failed'");

  expect(infoContent).toContain("from '../lib/anchorProbativeState'");
  expect(infoContent).toContain('deriveAnchorProbativeState(');

  expect(tooltipContent).toContain("from './anchorProbativeState'");
  expect(tooltipContent).toContain('deriveAnchorProbativeState(');
});
