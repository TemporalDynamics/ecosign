#!/usr/bin/env node
const fetch = require('node-fetch');

const URL = 'https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/events';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3MDIxNSwiZXhwIjoyMDc5MjQ2MjE1fQ.p2BGhgKApeNNqwyr-62Rvk_6lqIAt7y9UVstw6XlNCQ';

async function testInsert() {
  console.log('🧪 Probando insert de anchor.attempt event...\n');

  const testEvent = {
    event_type: 'anchor.attempt',
    document_id: '00000000-0000-0000-0000-000000000001',
    metadata: {
      network: 'polygon',
      witness_hash: 'test-hash',
      status: 'pending',
      attempted_at: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(testEvent)
  });

  const text = await res.text();

  console.log('Status:', res.status);
  console.log('Response:', text);

  if (res.ok) {
    console.log('\n✅ INSERT funcionó correctamente');
  } else {
    console.log('\n❌ INSERT falló - probablemente RLS bloqueando');
  }
}

testInsert().catch(console.error);
