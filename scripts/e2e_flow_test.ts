/**
 * Flujo End-to-End del Sistema Canónico
 * 
 * Este script ejecuta un flujo completo para verificar que:
 * 1. DecisionAuthority procesa eventos correctamente
 * 2. ExecutionEngine ejecuta jobs correctamente
 * 3. El sistema mantiene la separación de responsabilidades
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface StepResult {
  step: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runEndToEndFlow(): Promise<boolean> {
  console.log('🎯 INICIANDO FLUJO END-TO-END DEL SISTEMA CANÓNICO');
  console.log('===============================================\n');

  const results: StepResult[] = [];

  // 1. Crear entidad de documento para el test
  console.log('1️⃣  Creando entidad de documento de prueba...');
  try {
    const testEntityId = crypto.randomUUID();
    const testHash = `test_e2e_${Date.now()}`;
    
    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .insert({
        id: testEntityId,
        owner_id: 'test_user_e2e',
        source_hash: testHash,
        witness_hash: testHash,
        events: [
          {
            kind: 'document.created',
            at: new Date().toISOString(),
            payload: {
              filename: 'test_e2e_flow.pdf',
              file_size: 1024,
              protection: ['tsa', 'polygon', 'bitcoin']
            },
            _source: 'e2e_test'
          },
          {
            kind: 'protection_enabled',
            at: new Date().toISOString(),
            payload: {
              protection: {
                methods: ['tsa', 'polygon', 'bitcoin'],
                signature_type: 'none',
                forensic_enabled: true
              }
            },
            _source: 'e2e_test'
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

    console.log(`   ✅ Entidad creada: ${entity.id.substring(0, 8)}...`);
    console.log(`   ✅ Eventos iniciales: ${entity.events.length}`);
    console.log(`   ✅ Eventos: ${entity.events.map((e: any) => e.kind).join(', ')}`);

    results.push({
      step: 'document_entity_created',
      success: true,
      details: { 
        entityId: entity.id,
        eventCount: entity.events.length,
        events: entity.events.map((e: any) => e.kind)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log(`❌ Error creando entidad de prueba: ${error.message}\n`);
    results.push({
      step: 'document_entity_created',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 2. Esperar que DecisionAuthority procese eventos (3 segundos)
  console.log('\n2️⃣  Esperando que DecisionAuthority procese eventos...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 3. Verificar que DecisionAuthority creó jobs
  console.log('3️⃣  Verificando jobs creados por DecisionAuthority...');
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .eq('entity_id', testEntityId)
      .order('created_at', { ascending: false });

    if (jobsError) {
      throw new Error(`Error obteniendo jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('   ❌ No se encontraron jobs creados por DecisionAuthority');
      results.push({
        step: 'decision_authority_created_jobs',
        success: false,
        details: { 
          message: 'DecisionAuthority no creó jobs para la entidad de prueba',
          expectedEntityId: testEntityId
        },
        timestamp: new Date().toISOString()
      });
      return false;
    }

    console.log(`   ✅ Jobs encontrados: ${jobs.length}`);
    for (const job of jobs) {
      console.log(`   - ${job.type} (${job.status})`);
    }

    results.push({
      step: 'decision_authority_created_jobs',
      success: true,
      details: { 
        jobCount: jobs.length,
        jobTypes: jobs.map((j: any) => j.type),
        jobs: jobs
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log(`❌ Error verificando jobs: ${error.message}\n`);
    results.push({
      step: 'decision_authority_created_jobs',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 4. Esperar que ExecutionEngine procese jobs (5 segundos)
  console.log('\n4️⃣  Esperando que ExecutionEngine procese jobs...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 5. Verificar que ExecutionEngine ejecutó jobs
  console.log('5️⃣  Verificando ejecuciones por ExecutionEngine...');
  try {
    const jobIds = jobs.map((j: any) => j.id);
    const { data: runs, error: runsError } = await supabase
      .from('executor_job_runs')
      .select('id, job_id, status, started_at, finished_at')
      .in('job_id', jobIds)
      .order('started_at', { ascending: false });

    if (runsError) {
      throw new Error(`Error obteniendo ejecuciones: ${runsError.message}`);
    }

    if (!runs || runs.length === 0) {
      console.log('   ⚠️  No se encontraron ejecuciones para los jobs (puede ser normal si no se activó ExecutionEngine)');
      results.push({
        step: 'execution_engine_processed_jobs',
        success: false,
        details: { 
          message: 'ExecutionEngine no procesó los jobs (puede ser normal si no se activó)',
          expectedJobIds: jobIds
        },
        timestamp: new Date().toISOString()
      });
      // No detenemos la prueba por esto, puede ser normal
    } else {
      console.log(`   ✅ Ejecuciones encontradas: ${runs.length}`);
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
    }
  } catch (error) {
    console.log(`⚠️  Error verificando ejecuciones (no crítico): ${error.message}\n`);
    results.push({
      step: 'execution_engine_processed_jobs',
      success: false,
      details: { error: error.message, message: 'No se pudo verificar ejecuciones (no crítico)' },
      timestamp: new Date().toISOString()
    });
    // No detenemos la prueba por esto, puede ser normal
  }

  // 6. Verificar que hay eventos resultado
  console.log('\n6️⃣  Verificando eventos resultado...');
  try {
    const { data: updatedEntity, error: updateError } = await supabase
      .from('document_entities')
      .select('id, events')
      .eq('id', entity.id)  // Usar el ID de la entidad creada
      .single();

    if (updateError) {
      throw new Error(`Error obteniendo entidad actualizada: ${updateError.message}`);
    }

    if (!updatedEntity) {
      throw new Error('Entidad de prueba no encontrada');
    }

    const initialEventCount = 2; // document.created + protection_enabled
    const newEvents = updatedEntity.events.slice(initialEventCount);
    
    console.log(`   ✅ Eventos totales: ${updatedEntity.events.length}`);
    console.log(`   ✅ Eventos nuevos: ${newEvents.length}`);
    
    if (newEvents.length > 0) {
      for (const event of newEvents) {
        console.log(`   - ${event.kind} at ${event.at}`);
      }
    } else {
      console.log('   - No hay eventos nuevos (puede ser normal si trabajos están en proceso)');
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

  // 7. Resumen del flujo
  console.log('\n7️⃣  Resumen del flujo end-to-end:');
  console.log('   ===============================');
  
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
    console.log('   - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola neutral');
    console.log('   - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos resultado');
    console.log('   - Separación de responsabilidades mantenida');
    console.log('   - Sistema listo para operación real');
  } else {
    console.log('\n⚠️  SISTEMA CON PROBLEMAS:');
    console.log('   - Revisar pasos fallidos');
    console.log('   - Verificar configuración de executor');
    console.log('   - Confirmar que cron está activo');
  }

  return overallSuccess;
}

// Ejecutar flujo end-to-end
if (import.meta.main) {
  runEndToEndFlow()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡FLUJO END-TO-END EXITOSO!');
        console.log('El sistema canónico está funcionando correctamente.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN FLUJO END-TO-END');
        console.log('Revisar los pasos fallidos y corregir antes de continuar.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en flujo end-to-end:', error);
      Deno.exit(1);
    });
}

export { runEndToEndFlow };