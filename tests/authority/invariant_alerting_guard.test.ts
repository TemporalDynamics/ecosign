import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// P5.1: external alerting — send-invariant-alert Edge Function must implement the alerting contract.
test('send-invariant-alert function must implement the P5.1 alerting contract', async () => {
  const fnPath = path.join(ROOT, 'supabase/functions/send-invariant-alert/index.ts');
  const fnRaw = await fs.readFile(fnPath, 'utf8');

  // Must read ALERT_WEBHOOK_URL from env
  expect(fnRaw).toContain('ALERT_WEBHOOK_URL');

  // Must query invariant_violations table
  expect(fnRaw).toContain('invariant_violations');

  // Must filter by acknowledged_at (only unacknowledged violations trigger alerts)
  expect(fnRaw).toContain('acknowledged_at');

  // Must POST to the webhook URL
  expect(fnRaw).toContain("method: 'POST'");

  // Must handle missing ALERT_WEBHOOK_URL gracefully without crashing
  expect(fnRaw).toContain('skipped');

  // Must respect ALERT_MIN_SEVERITY (default: critical)
  expect(fnRaw).toContain('ALERT_MIN_SEVERITY');

  // Must respect ALERT_WINDOW_MINUTES to avoid stale alerts
  expect(fnRaw).toContain('ALERT_WINDOW_MINUTES');

  // Must be gated by ALERT_JOB_TOKEN via x-cron-secret header (cronInternal pattern)
  expect(fnRaw).toContain('ALERT_JOB_TOKEN');
  expect(fnRaw).toContain('x-cron-secret');
  expect(fnRaw).toContain('unauthorized');
});

test('continuous-hardening-audit workflow must reference send-invariant-alert (P5.1)', async () => {
  const workflowPath = path.join(ROOT, '.github/workflows/continuous-hardening-audit.yml');
  const workflowRaw = await fs.readFile(workflowPath, 'utf8');

  // Workflow must invoke or document the alert function
  expect(workflowRaw).toContain('send-invariant-alert');
});
