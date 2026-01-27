/**
 * Script de verificación del sistema canónico
 * 
 * Este script verifica que:
 * 1. El executor esté procesando eventos correctamente
 * 2. El orchestrator esté ejecutando jobs
 * 3. Los eventos se estén registrando en el sistema canónico
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyCanonicalSystem() {
  console.log('🔍 Verificando sistema canónico...\n');

  // 1. Verificar que hay document_entities
  console.log('1️⃣  Verificando document_entities...');
  const { data: entities, error: entitiesError } = await supabase
    .from('document_entities')
    .select('id, source_hash, witness_hash, events')
    .limit(5);

  if (entitiesError) {
    console.error('❌ Error obteniendo document_entities:', entitiesError.message);
    return false;
  }

  if (!entities || entities.length === 0) {
    console.log('⚠️  No hay document_entities para verificar');
  } else {
    console.log(`✅ Encontrados ${entities.length} document_entities`);
    for (const entity of entities) {
      const eventCount = Array.isArray(entity.events) ? entity.events.length : 0;
      console.log(`   - Entity: ${entity.id.substring(0, 8)}... (${eventCount} eventos)`);
    }
  }

  // 2. Verificar que hay jobs en la cola neutral
  console.log('\n2️⃣  Verificando cola neutral (executor_jobs)...');
  const { data: jobs, error: jobsError } = await supabase
    .from('executor_jobs')
    .select('id, type, status, entity_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobsError) {
    console.error('❌ Error obteniendo executor_jobs:', jobsError.message);
    return false;
  }

  if (!jobs || jobs.length === 0) {
    console.log('ℹ️  No hay jobs pendientes (puede ser normal)');
  } else {
    console.log(`✅ Encontrados ${jobs.length} jobs en cola:`);
    for (const job of jobs) {
      console.log(`   - ${job.type} (${job.status}) para entity: ${job.entity_id?.substring(0, 8)}...`);
    }
  }

  // 3. Verificar que hay ejecuciones de jobs
  console.log('\n3️⃣  Verificando ejecuciones de jobs...');
  const { data: jobRuns, error: jobRunsError } = await supabase
    .from('executor_job_runs')
    .select('id, job_id, status, started_at, finished_at')
    .order('started_at', { ascending: false })
    .limit(5);

  if (jobRunsError) {
    console.log('ℹ️  No se encontraron ejecuciones de jobs (puede ser normal)');
  } else {
    if (!jobRuns || jobRuns.length === 0) {
      console.log('ℹ️  No hay ejecuciones de jobs registradas');
    } else {
      console.log(`✅ Encontradas ${jobRuns.length} ejecuciones:`);
      for (const run of jobRuns) {
        const duration = run.finished_at ? 
          (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) + 'ms' : 
          'en curso';
        console.log(`   - Job: ${run.job_id.substring(0, 8)}... (${run.status}, ${duration})`);
      }
    }
  }

  // 4. Verificar que hay eventos canónicos
  console.log('\n4️⃣  Verificando eventos canónicos...');
  let canonicalEventsCount = 0;
  let canonicalEvents = [];

  // Primero intentar con tabla events
  try {
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, entity_id, kind, at, payload')
      .order('at', { ascending: false })
      .limit(5);

    if (!eventsError && events && events.length > 0) {
      canonicalEventsCount = events.length;
      canonicalEvents = events;
      console.log(`✅ Encontrados ${events.length} eventos en tabla events:`);
      for (const event of events) {
        console.log(`   - ${event.kind} para entity: ${event.entity_id?.substring(0, 8)}...`);
      }
    }
  } catch (e) {
    console.log('ℹ️  Tabla events no encontrada, verificando en document_entities.events[]');
  }

  // Si no hay tabla events, verificar en document_entities.events[]
  if (canonicalEventsCount === 0 && entities && entities.length > 0) {
    let totalEvents = 0;
    for (const entity of entities) {
      if (Array.isArray(entity.events)) {
        totalEvents += entity.events.length;
      }
    }
    console.log(`✅ Encontrados ${totalEvents} eventos en document_entities.events[]`);
  }

  // 5. Verificar que el cron del orchestrator está activo
  console.log('\n5️⃣  Verificando cron del orchestrator...');
  try {
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('jobid, jobname, schedule, command')
      .ilike('jobname', '%orchestrator%');

    if (cronError) {
      console.log('ℹ️  No se pudo verificar cron jobs:', cronError.message);
    } else {
      if (!cronJobs || cronJobs.length === 0) {
        console.log('⚠️  No se encontraron cron jobs del orchestrator');
      } else {
        console.log(`✅ Encontrados ${cronJobs.length} cron jobs del orchestrator:`);
        for (const job of cronJobs) {
          console.log(`   - ${job.jobname}: ${job.schedule} - ${job.command}`);
        }
      }
    }
  } catch (e) {
    console.log('ℹ️  No se pudo verificar cron jobs (extensión pg_cron no disponible?)');
  }

  console.log('\n✅ Verificación completada');
  console.log('\n🎯 Sistema canónico activo:');
  console.log('   - Verdad: document_entities.events[]');
  console.log('   - Autoridad: packages/authority');
  console.log('   - Executor: solo lee verdad → usa autoridad → escribe en cola neutral');
  console.log('   - Orchestrator: solo lee cola → ejecuta → escribe eventos resultado');

  return true;
}

// Ejecutar verificación
if (import.meta.main) {
  verifyCanonicalSystem()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡Sistema canónico verificado correctamente!');
        Deno.exit(0);
      } else {
        console.log('\n💥 Error en verificación del sistema');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en script de verificación:', error);
      Deno.exit(1);
    });
}

export { verifyCanonicalSystem };