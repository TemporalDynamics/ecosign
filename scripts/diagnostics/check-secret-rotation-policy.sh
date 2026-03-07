#!/usr/bin/env bash
set -euo pipefail

POLICY_FILE="${POLICY_FILE:-security/secret_rotation_policy.json}"
AS_OF_DATE="${AS_OF_DATE:-}"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "[secret-rotation-policy] missing policy file: $POLICY_FILE" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[secret-rotation-policy] node is required" >&2
  exit 1
fi

echo "=== Secret/Role rotation policy audit ==="
echo "Policy: $POLICY_FILE"
if [[ -n "$AS_OF_DATE" ]]; then
  echo "As-of:  $AS_OF_DATE"
fi

POLICY_FILE="$POLICY_FILE" AS_OF_DATE="$AS_OF_DATE" node <<'NODE'
const fs = require('node:fs');

const policyFile = process.env.POLICY_FILE;
const asOfRaw = process.env.AS_OF_DATE || '';

const raw = fs.readFileSync(policyFile, 'utf8');
const policy = JSON.parse(raw);

if (!Array.isArray(policy.items) || policy.items.length === 0) {
  console.error('[secret-rotation-policy] policy.items must be a non-empty array');
  process.exit(1);
}

const asOf = asOfRaw ? new Date(`${asOfRaw}T00:00:00.000Z`) : new Date();
if (Number.isNaN(asOf.getTime())) {
  console.error(`[secret-rotation-policy] invalid AS_OF_DATE: ${asOfRaw}`);
  process.exit(1);
}

const defaultMaxAge = Number(policy.default_max_age_days ?? 90);
const msPerDay = 24 * 60 * 60 * 1000;
const violations = [];

for (const item of policy.items) {
  const id = item.id;
  const lastRotatedRaw = item.last_rotated_at;
  const maxAgeDays = Number(item.max_age_days ?? defaultMaxAge);
  if (!id || !lastRotatedRaw || !Number.isFinite(maxAgeDays) || maxAgeDays <= 0) {
    violations.push(`${id || '(missing-id)'} => invalid policy entry`);
    continue;
  }

  const rotatedAt = new Date(`${lastRotatedRaw}T00:00:00.000Z`);
  if (Number.isNaN(rotatedAt.getTime())) {
    violations.push(`${id} => invalid last_rotated_at (${lastRotatedRaw})`);
    continue;
  }

  const ageDays = Math.floor((asOf.getTime() - rotatedAt.getTime()) / msPerDay);
  const status = ageDays > maxAgeDays ? 'OVERDUE' : 'OK';
  console.log(
    `${status}\t${id}\towner=${item.owner || '-'}\tage_days=${ageDays}\tmax_age_days=${maxAgeDays}`
  );

  if (status === 'OVERDUE') {
    violations.push(`${id} age_days=${ageDays} > max_age_days=${maxAgeDays}`);
  }
}

if (violations.length > 0) {
  console.error('\n[secret-rotation-policy] rotation violations detected:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('\n[secret-rotation-policy] OK all items within rotation window.');
NODE
