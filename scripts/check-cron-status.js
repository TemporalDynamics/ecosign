#!/usr/bin/env node
/**
 * Check cron job status in production
 * Verifica el estado de los cron jobs de blockchain anchoring
 */

const fetch = require('node-fetch');

const SUPABASE_URL = 'https://uiyojopjbhooxrmamaiw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeW9qb3BqYmhvb3hybWFtYWl3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3MDIxNSwiZXhwIjoyMDc5MjQ2MjE1fQ.p2BGhgKApeNNqwyr-62Rvk_6lqIAt7y9UVstw6XlNCQ';

async function checkCronJobs() {
  console.log('🔍 Verificando estado de cron jobs en producción...\n');

  // Query usando SQL function
  const query = `
    SELECT
      jobname,
      schedule,
      active,
      CASE
        WHEN active THEN '✅ ACTIVO'
        ELSE '❌ INACTIVO'
      END as status
    FROM cron.job
    WHERE jobname IN ('process-polygon-anchors', 'process-bitcoin-anchors')
    ORDER BY jobname
  `;

  try {
    // Usar PostgREST raw SQL via rpc (si existe función)
    // Alternativamente, podemos verificar vía edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('📊 Health Check Response:\n');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log(`❌ Error: ${response.status}`);
      console.log(text);
    }
  } catch (error) {
    console.error('❌ Error al verificar cron jobs:', error.message);
  }
}

checkCronJobs();
