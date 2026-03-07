import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// P5.2: threshold tuning — thresholds must be explicit, justified, and wired into the scan script.
test('invariant_thresholds.json must define all required thresholds with rationale (P5.2)', async () => {
  const thresholdsPath = path.join(ROOT, 'security', 'invariant_thresholds.json');
  const thresholdsRaw = await fs.readFile(thresholdsPath, 'utf8');
  const config = JSON.parse(thresholdsRaw) as {
    version: string;
    thresholds: Record<string, { value: number; default?: number; rationale: string }>;
  };

  expect(config.version).toBeTruthy();
  expect(config.thresholds).toBeTruthy();

  const { thresholds } = config;

  // All required threshold keys must be present and numeric
  // Only the three detection thresholds that are passed to scan_runtime_invariant_violations()
  const requiredKeys = ['stuck_minutes', 'attempt_threshold', 'queue_stale_minutes'];
  for (const key of requiredKeys) {
    expect(thresholds[key], `thresholds.${key} is missing`).toBeTruthy();
    expect(
      typeof thresholds[key].value,
      `thresholds.${key}.value must be a number`
    ).toBe('number');
    expect(Number(thresholds[key].value)).toBeGreaterThan(0);
    expect(thresholds[key].rationale, `thresholds.${key} is missing rationale`).toBeTruthy();
  }

  // dedupe_window_seconds is intentionally absent: the scanner has it hardcoded per-call.
  // If it appears it must NOT silently imply it is used by the script.
  if (thresholds['dedupe_window_seconds']) {
    // If present for documentation purposes, it still must have a rationale
    expect(thresholds['dedupe_window_seconds'].rationale).toBeTruthy();
  }

  // Tuned values must not exceed DB function defaults (we must be stricter or equal)
  expect(Number(thresholds.stuck_minutes.value)).toBeLessThanOrEqual(30);
  expect(Number(thresholds.attempt_threshold.value)).toBeLessThanOrEqual(8);
  expect(Number(thresholds.queue_stale_minutes.value)).toBeLessThanOrEqual(30);
});

test('check-invariant-scan.sh must use invariant_thresholds.json and invoke the DB scanner (P5.2)', async () => {
  const scriptPath = path.join(ROOT, 'scripts', 'diagnostics', 'check-invariant-scan.sh');
  const packagePath = path.join(ROOT, 'package.json');

  const [scriptRaw, packageRaw] = await Promise.all([
    fs.readFile(scriptPath, 'utf8'),
    fs.readFile(packagePath, 'utf8'),
  ]);

  // Script must load thresholds from the JSON file, not hardcode them
  expect(scriptRaw).toContain('THRESHOLDS_FILE');
  expect(scriptRaw).toContain('invariant_thresholds.json');

  // Script must invoke the DB scanner function
  expect(scriptRaw).toContain('scan_runtime_invariant_violations');

  // Script must fail when violations are detected
  expect(scriptRaw).toContain('violations detected');

  // Must be wired as an npm script
  expect(packageRaw).toContain('"diag:invariant-scan"');
});
