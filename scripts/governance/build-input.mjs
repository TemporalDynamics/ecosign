#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readJson(path) {
  const content = readFileSync(resolve(process.cwd(), path), 'utf8');
  return JSON.parse(content);
}

function parseFlag(argv, name, fallback = '') {
  const idx = argv.indexOf(name);
  if (idx === -1) return fallback;
  return argv[idx + 1] ?? fallback;
}

export function buildGovernanceInput({
  matrixPath = 'docs/paradigm/INVARIANT_MATRIX.json',
  configPath = 'docs/paradigm/paradigm.config.json',
  env = process.env
} = {}) {
  const releaseModeEnv = env.GOVERNANCE_RELEASE_MODE;
  const strictEnv = env.GOVERNANCE_STRICT_MATRIX;

  const matrix = readJson(matrixPath);
  const config = readJson(configPath);

  const invariants = Array.isArray(matrix.invariants) ? matrix.invariants : [];
  const changedFilesRaw = env.GOVERNANCE_CHANGED_FILES || '';
  const changedFiles = changedFilesRaw.split(',').map((x) => x.trim()).filter(Boolean);

  const decisionLogChanged = changedFiles.some((f) =>
    f.startsWith('docs/decisions/DECISION_LOG_3.0.md')
  );
  const invariantsChanged = changedFiles.some((f) =>
    f.startsWith('docs/paradigm/INVARIANT_MATRIX')
  );

  return {
    invariants,
    critical_invariants: config.critical_invariants || [],
    target_level: config.target_level || 'L3',
    strict_matrix: strictEnv ? strictEnv === '1' : Boolean(config.strict_matrix),
    release_mode: releaseModeEnv ? releaseModeEnv === '1' : Boolean(config.release_mode),
    metadata: {
      protocol_version: config.protocol_version || '1.0.0',
      protocol_version_changed: Boolean(env.GOVERNANCE_PROTOCOL_VERSION_CHANGED === '1'),
      decision_log_changed: Boolean(
        env.GOVERNANCE_DECISION_LOG_CHANGED === '1' || decisionLogChanged
      ),
      invariants_changed: Boolean(env.GOVERNANCE_INVARIANTS_CHANGED === '1' || invariantsChanged)
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const matrixPath = parseFlag(process.argv, '--matrix', 'docs/paradigm/INVARIANT_MATRIX.json');
  const configPath = parseFlag(process.argv, '--config', 'docs/paradigm/paradigm.config.json');
  const input = buildGovernanceInput({ matrixPath, configPath, env: process.env });
  console.log(JSON.stringify(input));
}
