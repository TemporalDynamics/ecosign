#!/usr/bin/env node
/**
 * Quick snapshot of pending/queued/processing anchors.
 *
 * Required env:
 * - SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 * - SUPABASE_URL
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uiyojopjbhooxrmamaiw.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

async function checkAnchors() {
  const url = `${SUPABASE_URL}/rest/v1/anchors?select=id,document_entity_id,anchor_type,anchor_status,updated_at&anchor_status=in.(queued,pending,processing)&order=updated_at.asc&limit=100`;
  const res = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  });

  const anchors = await res.json();
  if (!Array.isArray(anchors)) {
    console.log('Unexpected response:', anchors);
    return;
  }

  console.log('\n📊 Primeros anchors pendientes (max 100):\n');
  console.log(JSON.stringify(anchors.slice(0, 10), null, 2));

  const grouped = {};
  for (const anchor of anchors) {
    const key = `${anchor.anchor_type}:${anchor.anchor_status}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }

  console.log('\n🔍 Resumen agrupado (sample actual):');
  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([groupKey, count]) => {
      console.log(`- ${groupKey} => ${count}`);
    });
}

checkAnchors().catch((error) => {
  console.error(error);
  process.exit(1);
});
