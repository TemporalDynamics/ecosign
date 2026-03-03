#!/usr/bin/env node
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uiyojopjbhooxrmamaiw.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

async function checkEvents() {
  const url = `${SUPABASE_URL}/rest/v1/events?select=event_type,timestamp&order=timestamp.desc&limit=10`;
  const res = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  });

  const events = await res.json();
  if (!Array.isArray(events)) {
    console.log('Unexpected response:', events);
    return;
  }

  console.log('✅ Total eventos en tabla:', events.length);
  if (events.length > 0) {
    console.log('\nÚltimos 10 eventos:');
    events.forEach((event) => {
      console.log(`  ${new Date(event.timestamp).toLocaleString()} | ${event.event_type}`);
    });
  }
}

checkEvents().catch((error) => {
  console.error(error);
  process.exit(1);
});
