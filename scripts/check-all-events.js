#!/usr/bin/env node
const fetch = require('node-fetch');

const URL = 'https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/events?select=event_type,timestamp&order=timestamp.desc&limit=10';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3MDIxNSwiZXhwIjoyMDc5MjQ2MjE1fQ.p2BGhgKApeNNqwyr-62Rvk_6lqIAt7y9UVstw6XlNCQ';

async function checkEvents() {
  const res = await fetch(URL, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });

  const events = await res.json();
  console.log('✅ Total eventos en tabla:', events.length);
  if (events.length > 0) {
    console.log('\nÚltimos 10 eventos:');
    events.forEach(e => {
      console.log(`  ${new Date(e.timestamp).toLocaleString()} | ${e.event_type}`);
    });
  }
}

checkEvents().catch(console.error);
