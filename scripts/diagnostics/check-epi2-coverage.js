#!/usr/bin/env node
/**
 * Check recent document_entities for EPI2 readiness (source_hash + signature.completed with epi_state_hash).
 *
 * Required env:
 * - SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 * - SUPABASE_URL (defaults to prod)
 * - LIMIT (defaults to 30)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uiyojopjbhooxrmamaiw.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const LIMIT = Number.parseInt(process.env.LIMIT || '30', 10);

if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const HEX_64_RE = /^[0-9a-f]{64}$/i;

const isValidIso = (value) => typeof value === 'string' && ISO_TS_RE.test(value.trim());
const isValidHash = (value) => typeof value === 'string' && HEX_64_RE.test(value.trim());

async function fetchEntities() {
  const url = `${SUPABASE_URL}/rest/v1/document_entities?select=id,source_hash,created_at,events&order=created_at.desc&limit=${LIMIT}`;
  const res = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch document_entities: ${res.status} ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function extractStateHashes(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((e) => e?.kind === 'signature.completed')
    .map((e) => e?.evidence?.epi_state_hash || e?.payload?.evidence?.epi_state_hash || null)
    .filter((hash) => typeof hash === 'string' && hash.length > 0);
}

function summarizeEntity(entity) {
  const sourceHash = entity?.source_hash ?? '';
  const createdAt = entity?.created_at ?? '';
  const hasContent = isValidHash(sourceHash) && isValidIso(createdAt);
  const stateHashes = extractStateHashes(entity?.events);
  const validStateHashes = stateHashes.filter(isValidHash);
  const epi2Ready = hasContent && validStateHashes.length > 0;

  const reasons = [];
  if (!isValidHash(sourceHash)) reasons.push('missing_or_invalid_source_hash');
  if (!isValidIso(createdAt)) reasons.push('missing_or_invalid_created_at');
  if (validStateHashes.length === 0) reasons.push('missing_epi_state_hash_in_signature');

  return {
    id: entity?.id ?? 'unknown',
    created_at: createdAt || 'n/a',
    epi2_ready: epi2Ready,
    reasons: reasons.length > 0 ? reasons.join(',') : 'ok',
    state_hashes: validStateHashes.length,
  };
}

async function main() {
  const entities = await fetchEntities();
  if (entities.length === 0) {
    console.log('No document_entities found.');
    return;
  }

  const results = entities.map(summarizeEntity);
  const ok = results.filter((r) => r.epi2_ready).length;
  const missing = results.length - ok;

  console.log(`\nEPI2 readiness (last ${results.length} entities): ${ok} OK / ${missing} missing`);
  console.log('---');

  results.forEach((row) => {
    const status = row.epi2_ready ? 'OK' : 'MISSING';
    console.log(`${status} | ${row.created_at} | ${row.id} | state_hashes=${row.state_hashes} | ${row.reasons}`);
  });

  if (missing > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
