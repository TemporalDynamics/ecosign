#!/usr/bin/env node
/**
 * Legacy table smoke check.
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

async function testInsert() {
  console.log('🧪 Probando insert de anchor.attempt event...\n');

  const testEvent = {
    event_type: 'anchor.attempt',
    document_id: '00000000-0000-0000-0000-000000000001',
    metadata: {
      network: 'polygon',
      witness_hash: 'test-hash',
      status: 'pending',
      attempted_at: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(testEvent),
  });

  const text = await res.text();

  console.log('Status:', res.status);
  console.log('Response:', text);
  console.log(res.ok ? '\n✅ INSERT funcionó correctamente' : '\n❌ INSERT falló (posible RLS o tabla legacy)');
}

testInsert().catch((error) => {
  console.error(error);
  process.exit(1);
});
