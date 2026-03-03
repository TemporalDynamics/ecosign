#!/usr/bin/env node
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uiyojopjbhooxrmamaiw.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

async function checkEvents() {
  const url = `${SUPABASE_URL}/rest/v1/events?select=event_type,timestamp,metadata&order=timestamp.desc&limit=30`;
  const res = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  });

  const events = await res.json();
  const anchorEvents = Array.isArray(events)
    ? events.filter((event) => event.event_type && event.event_type.startsWith('anchor'))
    : [];

  console.log('\n📊 Anchor Events (últimos 30):\n');

  if (anchorEvents.length === 0) {
    console.log('❌ No se encontraron eventos de anchoring');
  } else {
    anchorEvents.forEach((event) => {
      const network = event.metadata?.network || '?';
      const status = event.metadata?.status || '?';
      const time = new Date(event.timestamp).toLocaleString();
      console.log(`${time} | ${event.event_type} | ${network} | ${status}`);
    });
  }

  console.log(`\n✅ Total: ${anchorEvents.length} eventos`);
}

checkEvents().catch((error) => {
  console.error(error);
  process.exit(1);
});
