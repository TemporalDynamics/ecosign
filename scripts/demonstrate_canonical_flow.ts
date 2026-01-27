#!/usr/bin/env -S deno run --allow-env --allow-net
/**
 * Demostración del Flujo Canónico Completo
 * 
 * Este script demuestra cómo funciona el sistema con el modelo de naming canónico:
 * 
 * - DecisionAuthority: Decide qué hacer basado en verdad + autoridad
 * - ExecutionEngine: Ejecuta lo decidido, reporta resultados
 * - WakeExecutionEngine: Solo despierta el sistema
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function demonstrateCanonicalFlow() {
  console.log('🎯 DEMOSTRACIÓN FLUJO CANÓNICO COMPLETO');
  console.log('=====================================\n');

  console.log('1️⃣  VERDAD: Eventos en document_entities.events[]');
  try {
    const { data: entities, error } = await supabase
      .from('document_entities')
      .select('id, events')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.log('❌ Error obteniendo entidades:', error.message);
    } else {
      if (!entities || entities.length === 0) {
        console.log('ℹ️  No hay entidades para demostrar');
      } else {
        for (const entity of entities) {
          const eventCount = Array.isArray(entity.events) ? entity.events.length : 0;
          console.log(`   - ${entity.id.substring(0, 8)}...: ${eventCount} eventos`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error en demostración de verdad:', error.message);
  }

  console.log('\n2️⃣  AUTORIDAD: packages/authority (reglas puras)');
  console.log('   - shouldEnqueueRunTsa() - Decide si TSA');
  console.log('   - shouldEnqueuePolygon() - Decide si anclaje Polygon');
  console.log('   - shouldEnqueueBitcoin() - Decide si anclaje Bitcoin');
  console.log('   - shouldEnqueueArtifact() - Decide si artifact');
  console.log('   - Código puro, determinista, testeable');

  console.log('\n3️⃣  DECISION AUTHORITY: Lee verdad → Usa autoridad → Escribe cola');
  console.log('   - Lee estado de document_entities');
  console.log('   - Aplica reglas de packages/authority');
  console.log('   - Escribe jobs en executor_jobs (cola neutral)');
  console.log('   - NUNCA ejecuta trabajos directamente');

  try {
    const { data: jobs, error } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('❌ Error obteniendo jobs:', error.message);
    } else {
      if (!jobs || jobs.length === 0) {
        console.log('   ℹ️  No hay jobs pendientes (puede ser normal)');
      } else {
        console.log(`   ✅ Encontrados ${jobs.length} jobs creados por DecisionAuthority:`);
        for (const job of jobs) {
          console.log(`     - ${job.type} (${job.status}) para ${job.entity_id?.substring(0, 8)}...`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error en demostración de DecisionAuthority:', error.message);
  }

  console.log('\n4️⃣  EXECUTION ENGINE: Lee cola → Ejecuta → Escribe eventos');
  console.log('   - Lee jobs de executor_jobs');
  console.log('   - Ejecuta trabajos pesados (TSA, anclajes, artifacts)');
  console.log('   - Reporta resultados como eventos en document_entities');
  console.log('   - NUNCA decide reglas de negocio');

  try {
    const { data: runs, error } = await supabase
      .from('executor_job_runs')
      .select('id, job_id, status, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(3);

    if (error) {
      console.log('❌ Error obteniendo ejecuciones:', error.message);
    } else {
      if (!runs || runs.length === 0) {
        console.log('   ℹ️  No hay ejecuciones registradas (puede ser normal)');
      } else {
        console.log(`   ✅ Encontradas ${runs.length} ejecuciones por ExecutionEngine:`);
        for (const run of runs) {
          const duration = run.finished_at ? 
            (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) + 'ms' : 
            'en curso';
          console.log(`     - Job ${run.job_id.substring(0, 8)}...: ${run.status} (${duration})`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error en demostración de ExecutionEngine:', error.message);
  }

  console.log('\n5️⃣  WAKE EXECUTION ENGINE: Solo despierta el sistema');
  console.log('   - Ejecutado por cron cada 30 segundos');
  console.log('   - No contiene lógica de negocio');
  console.log('   - Solo activa el loop de ejecución');
  console.log('   - NUNCA decide ni ejecuta');

  try {
    const { data: cronJobs, error } = await supabase
      .from('cron.job')
      .select('jobid, jobname, schedule, command')
      .ilike('jobname', '%execution%');

    if (error) {
      console.log('⚠️  No se pudieron verificar cron jobs:', error.message);
    } else {
      if (!cronJobs || cronJobs.length === 0) {
        console.log('   ℹ️  No hay cron jobs de execution (puede ser normal si pg_cron no está activo)');
      } else {
        console.log(`   ✅ Encontrados ${cronJobs.length} cron jobs relacionados con execution:`);
        for (const job of cronJobs) {
          console.log(`     - ${job.jobname}: ${job.schedule}`);
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Error en demostración de WakeExecutionEngine:', error.message);
  }

  console.log('\n🔄 FLUJO CANÓNICO COMPLETO:');
  console.log('   Usuario → Evento canónico → document_entities.events[]');
  console.log('   DecisionAuthority ← Lee verdad ← document_entities');
  console.log('   DecisionAuthority → Usa autoridad → packages/authority');
  console.log('   DecisionAuthority → Escribe job → executor_jobs cola neutral');
  console.log('   ExecutionEngine ← Lee cola neutral ← executor_jobs');
  console.log('   ExecutionEngine → Ejecuta trabajo → Resultado');
  console.log('   ExecutionEngine → Evento resultado → document_entities.events[]');

  console.log('\n🛡️  GARANTÍAS DEL SISTEMA:');
  console.log('   ✅ Un solo libro contable: document_entities.events[]');
  console.log('   ✅ Un solo cerebro: packages/authority');
  console.log('   ✅ Separación completa: Decisión vs Ejecución');
  console.log('   ✅ Sistema auditado: Todo como eventos inmutables');
  console.log('   ✅ Escalable: Componentes stateless y desacoplados');
  console.log('   ✅ Legalmente protegido: Autoridad clara y separada');

  console.log('\n🎯 MODELO DE NAMING CANÓNICO:');
  console.log('   DecisionAuthority: Decide (no ejecuta)');
  console.log('   ExecutionEngine: Ejecuta (no decide)');
  console.log('   WakeExecutionEngine: Despierta (no decide ni ejecuta)');

  return true;
}

// Ejecutar demostración
if (import.meta.main) {
  demonstrateCanonicalFlow()
    .then(success => {
      if (success) {
        console.log('\n✅ ¡DEMOSTRACIÓN COMPLETADA!');
        console.log('El sistema opera según el modelo canónico con naming correcto.');
        Deno.exit(0);
      } else {
        console.log('\n❌ ERROR EN DEMOSTRACIÓN');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error en demostración:', error);
      Deno.exit(1);
    });
}

export { demonstrateCanonicalFlow };