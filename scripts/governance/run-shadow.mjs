#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeGovernanceInput } from '../../packages/governance-core/src/domain/types.mjs';
import { evaluateGovernance } from '../../packages/governance-core/src/engine/index.mjs';
import { buildGovernanceInput } from './build-input.mjs';

const outDir = resolve(process.cwd(), 'reports/governance');
const inputPath = resolve(outDir, 'input.latest.json');
const outputPath = resolve(outDir, 'output.latest.json');

mkdirSync(outDir, { recursive: true });

try {
  const input = buildGovernanceInput({ env: process.env });
  writeFileSync(inputPath, JSON.stringify(input, null, 2) + '\n', 'utf8');

  const normalized = normalizeGovernanceInput(input);
  if (normalized.errors) {
    console.warn('[governance-shadow] CONFIG/SCHEMA ERROR detected (shadow, non-blocking)');
    console.warn(normalized.errors.join('\n'));
    process.exit(0);
  }

  const output = evaluateGovernance(normalized.input);
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(output, null, 2));

  if (output.pass) {
    console.log('[governance-shadow] PASS (shadow, non-blocking)');
  } else {
    console.warn('[governance-shadow] POLICY FAIL detected (shadow, non-blocking)');
  }
} catch (error) {
  console.warn('[governance-shadow] CONFIG/SCHEMA ERROR detected (shadow, non-blocking)');
  console.warn(error instanceof Error ? error.message : String(error));
}

process.exit(0);
