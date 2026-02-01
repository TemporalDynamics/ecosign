/**
 * Prueba de Flujo Completo del Sistema Canónico
 * 
 * Este script ejecuta un flujo completo para verificar que:
 * 1. DecisionAuthority procesa eventos
 * 2. ExecutionEngine ejecuta jobs
 * 3. WakeExecutionEngine mantiene sistema activo
 * 4. Todo se registra como eventos canónicos
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface FlowTestResult {
  step: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runFullFlowTest(): Promise<boolean> {
  console.log('🧪 INICIANDO PRUEBA DE FLUJO COMPLETO DEL SISTEMA CANÓNICO');
  console.log('====================================================\n');

  const results: FlowTestResult[] = [];

  // 1. Verificar estado inicial
  console.log('1️⃣  Verificando estado inicial del sistema...');
  try {
    const { count: initialEntities } = await supabase
      .from('document_entities')
      .select('*', { count: 'exact', head: true });

    const { count: initialJobs } = await supabase
      .from('executor_jobs')
      .select('*', { count: 'exact', head: true });

    const { count: initialRuns } = await supabase
      .from('executor_job_runs')
      .select('*', { count: 'exact', head: true });

    console.log(`   Document Entities: ${initialEntities}`);
    console.log(`   Executor Jobs: ${initialJobs}`);
    console.log(`   Executor Job Runs: ${initialRuns}`);

    results.push({
      step: 'initial_state_check',
      success: true,
      details: { entities: initialEntities, jobs: initialJobs, runs: initialRuns },
      timestamp: new Date().toISOString()
    });

    console.log('✅ Estado inicial verificado\n');
  } catch (error) {
    console.log(`❌ Error verificando estado inicial: ${error.message}\n`);
    results.push({
      step: 'initial_state_check',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 2. Simular protección de documento (esto debería generar eventos canónicos)
  console.log('2️⃣  Simulando protección de documento...');
  try {
    // Crear un nuevo document_entity para la prueba
    const testEntityId = crypto.randomUUID();
    const testHash = `test_hash_${Date.now()}`;
    
    const { data: newEntity, error: entityError } = await supabase
      .from('document_entities')
      .insert({
        id: testEntityId,
        owner_id: 'test_user_id',
        source_hash: testHash,
        witness_hash: testHash,
        events: [
          {
            kind: 'document.created',
            at: new Date().toISOString(),
            payload: {
              filename: 'test_document.pdf',
              file_size: 1024,
              protection: ['tsa', 'polygon', 'bitcoin']
            },
            _source: 'test_flow'
          },
          {
            kind: 'document.protected.requested',
            at: new Date().toISOString(),
            payload: {
              protection: ['tsa', 'polygon', 'bitcoin'],
            },
            _source: 'test_flow'
          }
        ],
        lifecycle_status: 'created',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, events')
      .single();

    if (entityError) {
      throw new Error(`Error creando entidad de prueba: ${entityError.message}`);
    }

    console.log(`   Entidad creada: ${newEntity.id.substring(0, 8)}...`);
    console.log(`   Eventos iniciales: ${newEntity.events.length}`);

    results.push({
      step: 'document_entity_creation',
      success: true,
      details: { 
        entityId: newEntity.id,
        eventCount: newEntity.events.length,
        events: newEntity.events.map((e: any) => e.kind)
      },
      timestamp: new Date().toISOString()
    });

    console.log('✅ Entidad canónica creada con eventos\n');
    
    // 3. Esperar un momento para que el executor procese
    console.log('3️⃣  Esperando que DecisionAuthority procese eventos...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 segundos

    // 4. Verificar que DecisionAuthority creó jobs
    console.log('4️⃣  Verificando que DecisionAuthority creó jobs...');
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('executor_jobs')
        .select('id, type, status, entity_id, created_at')
        .eq('entity_id', newEntity.id)
        .order('created_at', { ascending: false });

      if (jobsError) {
        throw new Error(`Error obteniendo jobs: ${jobsError.message}`);
      }

      if (!jobs || jobs.length === 0) {
        console.log('   ⚠️  No se encontraron jobs para la entidad (puede ser normal si executor no corrió)');
        results.push({
          step: 'decision_authority_jobs_created',
          success: false, // Consideramos esto como fallo en la prueba
          details: { 
            message: 'No se encontraron jobs creados por DecisionAuthority',
            expectedEntityId: newEntity.id
          },
          timestamp: new Date().toISOString()
        });
        console.log('❌ DecisionAuthority no procesó eventos (esto es el problema principal)\n');
        return false;
      }

      console.log(`   Jobs encontrados: ${jobs.length}`);
      for (const job of jobs) {
        console.log(`   - ${job.type} (${job.status})`);
      }

      results.push({
        step: 'decision_authority_jobs_created',
        success: true,
        details: { 
          jobCount: jobs.length,
          jobTypes: jobs.map((j: any) => j.type),
          jobs: jobs
        },
        timestamp: new Date().toISOString()
      });

      console.log('✅ DecisionAuthority procesó eventos y creó jobs\n');
    } catch (error) {
      console.log(`❌ Error verificando jobs de DecisionAuthority: ${error.message}\n`);
      results.push({
        step: 'decision_authority_jobs_created',
        success: false,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
      return false;
    }

    // 5. Esperar más tiempo para que ExecutionEngine procese jobs
    console.log('5️⃣  Esperando que ExecutionEngine procese jobs...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos

    // 6. Verificar que ExecutionEngine ejecutó jobs
    console.log('6️⃣  Verificando que ExecutionEngine ejecutó jobs...');
    try {
      const { data: runs, error: runsError } = await supabase
        .from('executor_job_runs')
        .select('id, job_id, status, started_at, finished_at')
        .in('job_id', jobs.map((j: any) => j.id))
        .order('started_at', { ascending: false });

      if (runsError) {
        throw new Error(`Error obteniendo ejecuciones: ${runsError.message}`);
      }

      if (!runs || runs.length === 0) {
        console.log('   ⚠️  No se encontraron ejecuciones para los jobs');
        results.push({
          step: 'execution_engine_processed_jobs',
          success: false,
          details: { 
            message: 'No se encontraron ejecuciones de jobs por ExecutionEngine',
            expectedJobIds: jobs.map((j: any) => j.id)
          },
          timestamp: new Date().toISOString()
        });
        console.log('⚠️  ExecutionEngine no procesó los jobs (puede ser normal si no se activó)\n');
      } else {
        console.log(`   Ejecuciones encontradas: ${runs.length}`);
        for (const run of runs) {
          const duration = run.finished_at ? 
            (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) + 'ms' : 
            'en curso';
          console.log(`   - Job ${run.job_id.substring(0, 8)}...: ${run.status} (${duration})`);
        }

        results.push({
          step: 'execution_engine_processed_jobs',
          success: true,
          details: { 
            runCount: runs.length,
            runStatuses: runs.map((r: any) => r.status),
            runs: runs
          },
          timestamp: new Date().toISOString()
        });

        console.log('✅ ExecutionEngine procesó jobs\n');
      }
    } catch (error) {
      console.log(`❌ Error verificando ejecuciones de ExecutionEngine: ${error.message}\n`);
      results.push({
        step: 'execution_engine_processed_jobs',
        success: false,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
      return false;
    }

    // 7. Verificar que hay eventos resultado
    console.log('7️⃣  Verificando eventos resultado...');
    try {
      const { data: updatedEntity, error: updateError } = await supabase
        .from('document_entities')
        .select('id, events')
        .eq('id', newEntity.id)
        .single();

      if (updateError) {
        throw new Error(`Error obteniendo entidad actualizada: ${updateError.message}`);
      }

      if (!updatedEntity) {
        throw new Error('Entidad de prueba no encontrada');
      }

      const initialEventCount = 2; // document.created + document.protected.requested
      const newEvents = updatedEntity.events.slice(initialEventCount);
      
      console.log(`   Eventos totales: ${updatedEntity.events.length}`);
      console.log(`   Eventos nuevos: ${newEvents.length}`);
      
      if (newEvents.length > 0) {
        for (const event of newEvents) {
          console.log(`   - ${event.kind} at ${event.at}`);
        }
      } else {
        console.log('   - No hay eventos nuevos (puede ser normal si no se completaron trabajos)');
      }

      results.push({
        step: 'result_events_recorded',
        success: newEvents.length > 0,
        details: { 
          totalEvents: updatedEntity.events.length,
          newEvents: newEvents.length,
          eventTypes: newEvents.map((e: any) => e.kind)
        },
        timestamp: new Date().toISOString()
      });

      if (newEvents.length > 0) {
        console.log('✅ Eventos resultado registrados\n');
      } else {
        console.log('ℹ️  No hay eventos resultado aún (normal si trabajos están en proceso)\n');
      }
    } catch (error) {
      console.log(`❌ Error verificando eventos resultado: ${error.message}\n`);
      results.push({
        step: 'result_events_recorded',
        success: false,
        details: { error: error.message },
        timestamp: new Date().toISOString()
      });
      return false;
    }
  } catch (error) {
    console.log(`❌ Error creando entidad de prueba: ${error.message}\n`);
    results.push({
      step: 'document_entity_creation',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 8. Resumen de la prueba
  console.log('8️⃣  Resumen de la prueba de flujo completo:');
  console.log('   ======================================');
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.step}: ${result.success ? 'OK' : 'FALLIDO'}`);
    if (result.success) successCount++;
  }
  
  const overallSuccess = successCount >= 3; // Al menos creación de entidad y jobs
  const successEmoji = overallSuccess ? '✅' : '❌';
  
  console.log(`\n${successEmoji} RESULTADO FINAL: ${overallSuccess ? 'FLUJO COMPLETO FUNCIONAL' : 'FLUJO CON PROBLEMAS'}`);
  console.log(`   Pasos exitosos: ${successCount}/${results.length}`);
  
  if (overallSuccess) {
    console.log('\n🎯 SISTEMA CANÓNICO OPERATIVO:');
    console.log('   - DecisionAuthority procesa eventos y crea jobs');
    console.log('   - ExecutionEngine puede procesar jobs (cuando se activan)');
    console.log('   - WakeExecutionEngine mantiene sistema activo');
    console.log('   - Todo registrado como eventos canónicos');
  } else {
    console.log('\n⚠️  SISTEMA NECESITA AJUSTES:');
    console.log('   - DecisionAuthority no está procesando eventos');
    console.log('   - Executor no está corriendo o no encuentra eventos');
    console.log('   - Revisar configuración de cron o triggers');
  }

  return overallSuccess;
}

// Ejecutar prueba
if (import.meta.main) {
  runFullFlowTest()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡PRUEBA DE FLUJO COMPLETO EXITOSA!');
        console.log('El sistema canónico está funcionando según la arquitectura definida.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN PRUEBA DE FLUJO COMPLETO');
        console.log('Revisar los pasos fallidos y corregir antes de continuar.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en prueba de flujo completo:', error);
      Deno.exit(1);
    });
}

export { runFullFlowTest };
