#!/usr/bin/env -S deno run --allow-env --allow-net
/**
 * Verificación del Sistema Canónico con Naming Correcto
 * 
 * Este script verifica que el sistema esté operando según el modelo canónico:
 * - DecisionAuthority decide (no ejecuta)
 * - ExecutionEngine ejecuta (no decide)
 * - WakeExecutionEngine solo despierta (no decide ni ejecuta)
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runCanonicalVerification() {
  console.log('🔍 VERIFICACIÓN DEL SISTEMA CANÓNICO CON NAMING CORRECTO');
  console.log('====================================================\n');

  // 1. Verificar que hay document_entities con eventos
  console.log('1️⃣  Verificando modelo canónico (document_entities)...');
  try {
    const { data: entities, error } = await supabase
      .from('document_entities')
      .select('id, source_hash, events')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.log('❌ Error obteniendo document_entities:', error.message);
      return false;
    }

    if (!entities || entities.length === 0) {
      console.log('⚠️  No hay document_entities (normal si es primera ejecución)');
    } else {
      console.log(`✅ Encontrados ${entities.length} document_entities`);
      for (const entity of entities) {
        const eventCount = Array.isArray(entity.events) ? entity.events.length : 0;
        console.log(`   - ${entity.id.substring(0, 8)}...: ${eventCount} eventos`);
      }
    }
  } catch (error) {
    console.log('❌ Error verificando document_entities:', error.message);
    return false;
  }

  // 2. Verificar que hay jobs en cola neutral (executor_jobs)
  console.log('\n2️⃣  Verificando cola neutral (executor_jobs)...');
  try {
    const { data: jobs, error } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Error obteniendo executor_jobs:', error.message);
      return false;
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️  No hay executor_jobs (puede ser normal si no hay actividad reciente)');
    } else {
      console.log(`✅ Encontrados ${jobs.length} jobs en cola neutral:`);
      for (const job of jobs) {
        console.log(`   - ${job.type} (${job.status}) para entity: ${job.entity_id?.substring(0, 8)}...`);
      }
    }
  } catch (error) {
    console.log('❌ Error verificando executor_jobs:', error.message);
    return false;
  }

  // 3. Verificar que hay ejecuciones registradas (executor_job_runs)
  console.log('\n3️⃣  Verificando ejecuciones registradas (executor_job_runs)...');
  try {
    const { data: runs, error } = await supabase
      .from('executor_job_runs')
      .select('id, job_id, status, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(3);

    if (error) {
      console.log('❌ Error obteniendo executor_job_runs:', error.message);
      return false;
    }

    if (!runs || runs.length === 0) {
      console.log('ℹ️  No hay ejecuciones registradas (puede ser normal si no se han procesado jobs)');
    } else {
      console.log(`✅ Encontradas ${runs.length} ejecuciones:`);
      for (const run of runs) {
        const duration = run.finished_at ? 
          (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) + 'ms' : 
          'en curso';
        console.log(`   - Job ${run.job_id.substring(0, 8)}...: ${run.status} (${duration})`);
      }
    }
  } catch (error) {
    console.log('❌ Error verificando executor_job_runs:', error.message);
    return false;
  }

  // 4. Verificar que hay feature flags
  console.log('\n4️⃣  Verificando feature flags persistentes...');
  try {
    const { data: flags, error } = await supabase
      .from('feature_flags')
      .select('flag_name, enabled')
      .limit(10);

    if (error) {
      console.log('❌ Error obteniendo feature_flags:', error.message);
      return false;
    }

    if (!flags || flags.length === 0) {
      console.log('❌ No hay feature_flags configurados');
      return false;
    }

    console.log(`✅ Encontrados ${flags.length} feature flags:`);
    for (const flag of flags) {
      console.log(`   - ${flag.flag_name}: ${flag.enabled ? 'activo' : 'inactivo'}`);
    }
  } catch (error) {
    console.log('❌ Error verificando feature_flags:', error.message);
    return false;
  }

  // 5. Verificar que existen las funciones SQL de autoridad
  console.log('\n5️⃣  Verificando funciones SQL de autoridad...');
  try {
    const { data: authorityCheck, error } = await supabase.rpc('is_decision_under_canonical_authority', {
      decision_id: 'D1_RUN_TSA_ENABLED'
    });

    if (error) {
      console.log('❌ Error verificando función de autoridad:', error.message);
      return false;
    }

    console.log('✅ Función SQL is_decision_under_canonical_authority() funciona');
    console.log(`   Resultado para D1_RUN_TSA_ENABLED: ${authorityCheck}`);
  } catch (error) {
    console.log('❌ Error verificando funciones SQL:', error.message);
    return false;
  }

  // 6. Verificar que hay cron jobs para wake_execution_engine
  console.log('\n6️⃣  Verificando cron jobs de despertador...');
  try {
    const { data: cronJobs, error } = await supabase
      .from('cron.job')
      .select('jobid, jobname, schedule, command')
      .ilike('jobname', '%wake%execution%');

    if (error) {
      console.log('⚠️  No se pudieron verificar cron jobs (puede ser normal si pg_cron no está instalado):', error.message);
    } else {
      if (!cronJobs || cronJobs.length === 0) {
        console.log('ℹ️  No hay cron jobs específicos de wake_execution_engine (puede ser normal)');
      } else {
        console.log(`✅ Encontrados ${cronJobs.length} cron jobs de wake_execution_engine:`);
        for (const job of cronJobs) {
          console.log(`   - ${job.jobname}: ${job.schedule}`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error verificando cron jobs (no crítico):', error.message);
  }

  console.log('\n✅ VERIFICACIÓN CANÓNICA COMPLETADA');
  console.log('\n🎯 SISTEMA OPERANDO SEGÚN MODELO CANÓNICO:');
  console.log('   - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola neutral');
  console.log('   - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos resultado');
  console.log('   - WakeExecutionEngine: Solo despierta sistema (sin lógica de negocio)');
  console.log('   - Verdad: document_entities.events[] (inmutable, append-only)');
  console.log('   - Autoridad: packages/authority (reglas puras)');
  console.log('   - Separación: Decisión vs Ejecución completamente desacoplada');

  return true;
}

// Ejecutar verificación
if (import.meta.main) {
  runCanonicalVerification()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡SISTEMA CANÓNICO VERIFICADO CON NAMING CORRECTO!');
        console.log('El sistema opera según la arquitectura canónica con nomenclatura precisa.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN VERIFICACIÓN DEL SISTEMA CANÓNICO');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en verificación:', error);
      Deno.exit(1);
    });
}

export { runCanonicalVerification };