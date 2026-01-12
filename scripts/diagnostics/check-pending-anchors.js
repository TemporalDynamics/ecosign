#!/usr/bin/env node
const fetch = require('node-fetch');

const URL = 'https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/anchors?select=id,user_document_id,polygon_status,anchor_type&polygon_status=in.(pending,processing)&limit=5';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3MDIxNSwiZXhwIjoyMDc5MjQ2MjE1fQ.p2BGhgKApeNNqwyr-62Rvk_6lqIAt7y9UVstw6XlNCQ';

async function checkAnchors() {
  const res = await fetch(URL, {
    headers: {
      'apikey': KEY,
      'Authorization': `Bearer ${KEY}`
    }
  });

  const anchors = await res.json();
  console.log('\n📊 Primeros 5 anchors pending/processing:\n');
  console.log(JSON.stringify(anchors, null, 2));

  console.log('\n🔍 Análisis:');
  anchors.forEach((a, i) => {
    console.log(`${i+1}. ${a.id.substring(0, 8)}... | user_document_id: ${a.user_document_id ? 'SÍ ✅' : 'NO ❌'} | ${a.polygon_status}`);
  });
}

checkAnchors().catch(console.error);
