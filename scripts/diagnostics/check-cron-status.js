#!/usr/bin/env node
/**
 * Production cron/runtime diagnostics (read-only).
 *
 * Required env:
 * - SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 * - SUPABASE_URL (defaults to prod project URL)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uiyojopjbhooxrmamaiw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

function printSection(title, payload) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  console.log('🔍 Verificando estado runtime de cron y workers...');

  const [cronRuntime, anchorCrons, workers, pendingAnchors] = await Promise.all([
    request('/rest/v1/rpc/get_cron_runtime_status', {
      method: 'POST',
      body: '{}',
    }),
    request('/rest/v1/rpc/get_cron_status', {
      method: 'POST',
      body: JSON.stringify({ job_pattern: '%anchor%' }),
    }),
    request('/rest/v1/system_workers?select=name,status,last_seen_at,updated_at&order=name.asc'),
    request('/rest/v1/anchors?select=anchor_type,anchor_status&anchor_status=in.(queued,pending,processing)&limit=5000'),
  ]);

  printSection(`cron runtime (${cronRuntime.status})`, cronRuntime.data);
  printSection(`cron anchors (${anchorCrons.status})`, anchorCrons.data);
  printSection(`system_workers (${workers.status})`, workers.data);

  const grouped = {};
  if (Array.isArray(pendingAnchors.data)) {
    for (const row of pendingAnchors.data) {
      const key = `${row.anchor_type}:${row.anchor_status}`;
      grouped[key] = (grouped[key] || 0) + 1;
    }
  }
  printSection(`anchors pending grouped (${pendingAnchors.status})`, grouped);
}

main().catch((error) => {
  console.error('❌ Error en check-cron-status:', error?.message || error);
  process.exit(1);
});
