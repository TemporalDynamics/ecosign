#!/usr/bin/env node
const fetch = require('node-fetch');

const URL = 'https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/events?select=event_type,timestamp,metadata&order=timestamp.desc&limit=30';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3MDIxNSwiZXhwIjoyMDc5MjQ2MjE1fQ.p2BGhgKApeNNqwyr-62Rvk_6lqIAt7y9UVstw6XlNCQ';

async function checkEvents() {
  const res = await fetch(URL, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });

  const events = await res.json();
  const anchorEvents = events.filter(e => e.event_type && e.event_type.startsWith('anchor'));

  console.log(`\n📊 Anchor Events (últimos 30):\n`);

  if (anchorEvents.length === 0) {
    console.log('❌ No se encontraron eventos de anchoring');
  } else {
    anchorEvents.forEach(e => {
      const network = e.metadata?.network || '?';
      const status = e.metadata?.status || '?';
      const time = new Date(e.timestamp).toLocaleString();
      console.log(`${time} | ${e.event_type} | ${network} | ${status}`);
    });
  }

  console.log(`\n✅ Total: ${anchorEvents.length} eventos`);
}

checkEvents().catch(console.error);
