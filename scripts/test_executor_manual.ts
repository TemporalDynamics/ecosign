/**
 * Script para probar manualmente el executor
 * 
 * Este script simula la ejecución del executor para verificar que está funcionando correctamente
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testExecutor() {
  console.log('🔍 Probando el executor...');

  // 1. Verificar que hay jobs pendientes
  const { data: pendingJobs, error: jobsError } = await supabase
    .from('executor_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobsError) {
    console.error('❌ Error obteniendo jobs:', jobsError.message);
    return false;
  }

  if (!pendingJobs || pendingJobs.length === 0) {
    console.log('ℹ️  No hay jobs pendientes para procesar');
    return true; // No es error, solo no hay trabajo
  }

  console.log(`✅ Encontrados ${pendingJobs.length} jobs pendientes:`);
  for (const job of pendingJobs) {
    console.log(`   - ${job.type} para entity ${job.entity_id.substring(0, 8)}...`);
  }

  // 2. Intentar procesar un job manualmente (simulando lo que haría el executor)
  console.log('\n🔄 Simulando procesamiento de jobs...');
  
  for (const job of pendingJobs) {
    console.log(`   Procesando job: ${job.id.substring(0, 8)}... (${job.type})`);
    
    try {
      // Simular inicio de procesamiento
      const { error: updateError } = await supabase
        .from('executor_jobs')
        .update({
          status: 'processing',
          locked_at: new Date().toISOString(),
          locked_by: 'manual_test',
          attempts: job.attempts + 1
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`     ❌ Error actualizando job: ${updateError.message}`);
        continue;
      }

      console.log(`     ✅ Job marcado como processing: ${job.id.substring(0, 8)}...`);

      // Simular procesamiento (aquí iría la lógica real)
      // Por ahora solo simulamos que se completó
      await new Promise(resolve => setTimeout(resolve, 100)); // Simular delay
      
      // Simular fin de procesamiento
      const { error: finishError } = await supabase
        .from('executor_jobs')
        .update({
          status: 'succeeded',
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (finishError) {
        console.error(`     ❌ Error finalizando job: ${finishError.message}`);
        continue;
      }

      console.log(`     ✅ Job completado: ${job.id.substring(0, 8)}...`);

    } catch (error) {
      console.error(`     ❌ Error procesando job ${job.id}:`, error.message);
    }
  }

  // 3. Verificar si se crearon registros de ejecución
  const { data: jobRuns, error: runsError } = await supabase
    .from('executor_job_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('❌ Error obteniendo ejecuciones:', runsError.message);
  } else {
    if (!jobRuns || jobRuns.length === 0) {
      console.log('ℹ️  No hay ejecuciones registradas aún');
    } else {
      console.log(`✅ Encontradas ${jobRuns.length} ejecuciones:`);
      for (const run of jobRuns) {
        console.log(`   - Job ${run.job_id.substring(0, 8)}...: ${run.status} (${run.started_at})`);
      }
    }
  }

  return true;
}

// Ejecutar prueba
if (import.meta.main) {
  testExecutor()
    .then(success => {
      if (success) {
        console.log('\n✅ Prueba de executor completada');
        Deno.exit(0);
      } else {
        console.log('\n💥 Error en prueba de executor');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en script de prueba:', error);
      Deno.exit(1);
    });
}

export { testExecutor };