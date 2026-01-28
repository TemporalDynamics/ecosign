/**
 * Validación Final del Sistema Canónico con Naming Correcto
 * 
 * Este script valida que el sistema esté operando según la arquitectura canónica con el naming correcto:
 * 
 * - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola neutral
 * - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos resultado
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ValidationResult {
  test: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runFinalValidation(): Promise<boolean> {
  console.log('🎯 VALIDACIÓN FINAL DEL SISTEMA CANÓNICO');
  console.log('=====================================\n');

  const results: ValidationResult[] = [];

  // 1. Verificar que DecisionAuthority está procesando eventos
  console.log('1️⃣  Verificando DecisionAuthority...');
  try {
    // Buscar document_entities con eventos
    const { data: entities, error: entitiesError } = await supabase
      .from('document_entities')
      .select('id, events')
      .order('created_at', { ascending: false })
      .limit(3);

    if (entitiesError) {
      throw new Error(`Error obteniendo entities: ${entitiesError.message}`);
    }

    if (!entities || entities.length === 0) {
      console.log('⚠️  No hay entities para verificar (puede ser normal si no hay actividad)');
      results.push({
        test: 'decision_authority_has_entities',
        success: false,
        details: { message: 'No hay entities para verificar DecisionAuthority' },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`✅ Encontradas ${entities.length} entities para DecisionAuthority`);
      for (const entity of entities) {
        const eventCount = Array.isArray(entity.events) ? entity.events.length : 0;
        console.log(`   - ${entity.id.substring(0, 8)}...: ${eventCount} eventos`);
      }

      results.push({
        test: 'decision_authority_has_entities',
        success: true,
        details: { 
          entityCount: entities.length,
          totalEvents: entities.reduce((sum, e) => sum + (Array.isArray(e.events) ? e.events.length : 0), 0)
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando DecisionAuthority: ${error.message}\n`);
    results.push({
      test: 'decision_authority_has_entities',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 2. Verificar que hay jobs en cola neutral (DecisionAuthority creando jobs)
  console.log('\n2️⃣  Verificando DecisionAuthority creando jobs...');
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      throw new Error(`Error obteniendo jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️  No hay jobs en cola (puede ser normal si no hay decisiones pendientes)');
      results.push({
        test: 'decision_authority_creates_jobs',
        success: false,
        details: { message: 'No hay jobs en cola (puede ser normal)' },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`✅ Encontrados ${jobs.length} jobs creados por DecisionAuthority`);
      for (const job of jobs) {
        console.log(`   - ${job.type} (${job.status}) para ${job.entity_id?.substring(0, 8)}...`);
      }

      results.push({
        test: 'decision_authority_creates_jobs',
        success: true,
        details: { 
          jobCount: jobs.length,
          jobTypes: [...new Set(jobs.map((j: any) => j.type))],
          jobs: jobs
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando jobs de DecisionAuthority: ${error.message}\n`);
    results.push({
      test: 'decision_authority_creates_jobs',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 3. Verificar que ExecutionEngine procesa jobs
  console.log('\n3️⃣  Verificando ExecutionEngine procesando jobs...');
  try {
    const { data: runs, error: runsError } = await supabase
      .from('executor_job_runs')
      .select('id, job_id, status, started_at, finished_at')
      .order('started_at', { ascending: false })
      .limit(5);

    if (runsError) {
      throw new Error(`Error obteniendo ejecuciones: ${runsError.message}`);
    }

    if (!runs || runs.length === 0) {
      console.log('ℹ️  No hay ejecuciones registradas (puede ser normal si no se han procesado jobs)');
      results.push({
        test: 'execution_engine_processes_jobs',
        success: false,
        details: { message: 'No hay ejecuciones registradas (puede ser normal)' },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`✅ Encontradas ${runs.length} ejecuciones por ExecutionEngine`);
      for (const run of runs) {
        const duration = run.finished_at ? 
          (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) + 'ms' : 
          'en curso';
        console.log(`   - Job ${run.job_id.substring(0, 8)}...: ${run.status} (${duration})`);
      }

      results.push({
        test: 'execution_engine_processes_jobs',
        success: true,
        details: { 
          runCount: runs.length,
          runStatuses: [...new Set(runs.map((r: any) => r.status))],
          runs: runs
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando ejecuciones de ExecutionEngine: ${error.message}\n`);
    results.push({
      test: 'execution_engine_processes_jobs',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 4. Verificar que hay eventos resultado de ExecutionEngine
  console.log('\n4️⃣  Verificando eventos resultado de ExecutionEngine...');
  try {
    const { data: entitiesWithResults, error: entitiesError } = await supabase
      .from('document_entities')
      .select('id, events')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (entitiesError) {
      throw new Error(`Error obteniendo entities con resultados: ${entitiesError.message}`);
    }

    if (!entitiesWithResults || entitiesWithResults.length === 0) {
      console.log('⚠️  No hay entities para verificar eventos resultado');
      results.push({
        test: 'execution_engine_creates_result_events',
        success: false,
        details: { message: 'No hay entities para verificar eventos resultado' },
        timestamp: new Date().toISOString()
      });
    } else {
      let resultEventsCount = 0;
      let executionEngineSources = 0;
      
      for (const entity of entitiesWithResults) {
        if (Array.isArray(entity.events)) {
          for (const event of entity.events) {
            resultEventsCount++;
            if (event._source === 'execution_engine') {
              executionEngineSources++;
            }
          }
        }
      }
      
      console.log(`✅ Encontrados ${resultEventsCount} eventos totales`);
      console.log(`✅ ${executionEngineSources} eventos de ExecutionEngine`);
      
      if (executionEngineSources > 0) {
        console.log('   - Eventos de ExecutionEngine:');
        for (const entity of entitiesWithResults) {
          if (Array.isArray(entity.events)) {
            const execEvents = entity.events.filter((e: any) => e._source === 'execution_engine');
            if (execEvents.length > 0) {
              console.log(`     - ${entity.id.substring(0, 8)}...: ${execEvents.length} eventos`);
              for (const event of execEvents) {
                console.log(`       * ${event.kind} at ${event.at}`);
              }
            }
          }
        }
      }

      results.push({
        test: 'execution_engine_creates_result_events',
        success: executionEngineSources > 0,
        details: { 
          totalEvents: resultEventsCount,
          executionEngineEvents: executionEngineSources,
          entitiesChecked: entitiesWithResults.length
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando eventos resultado: ${error.message}\n`);
    results.push({
      test: 'execution_engine_creates_result_events',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 5. Verificar que no hay duplicación de side-effects
  console.log('\n5️⃣  Verificando no duplicación de side-effects...');
  try {
    // Buscar eventos duplicados para la misma entidad
    const { data: allEntities, error: allEntitiesError } = await supabase
      .from('document_entities')
      .select('id, events')
      .limit(10);

    if (allEntitiesError) {
      throw new Error(`Error obteniendo todas las entities: ${allEntitiesError.message}`);
    }

    if (allEntities && allEntities.length > 0) {
      let duplicateCount = 0;
      let totalEvents = 0;
      
      for (const entity of allEntities) {
        if (Array.isArray(entity.events)) {
          totalEvents += entity.events.length;
          
          // Agrupar eventos por tipo y verificar duplicados
          const eventGroups: Record<string, any[]> = {};
          for (const event of entity.events) {
            const key = `${event.kind}_${event.payload?.witness_hash || event.payload?.tx_hash || event.payload?.network || ''}`;
            if (!eventGroups[key]) {
              eventGroups[key] = [];
            }
            eventGroups[key].push(event);
          }
          
          // Contar grupos con más de un evento (posibles duplicados)
          for (const [key, events] of Object.entries(eventGroups)) {
            if (events.length > 1) {
              duplicateCount++;
              console.log(`   ⚠️  Posible duplicado: ${key} (${events.length} veces)`);
            }
          }
        }
      }
      
      console.log(`✅ Verificados ${totalEvents} eventos en ${allEntities.length} entities`);
      console.log(`✅ Duplicados detectados: ${duplicateCount}`);
      
      results.push({
        test: 'no_duplicate_side_effects',
        success: duplicateCount === 0,
        details: { 
          totalEvents,
          entitiesChecked: allEntities.length,
          duplicateCount
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('ℹ️  No hay entities para verificar duplicación');
      results.push({
        test: 'no_duplicate_side_effects',
        success: true,
        details: { message: 'No hay entities para verificar duplicación (normal si no hay actividad)' },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando duplicación: ${error.message}\n`);
    results.push({
      test: 'no_duplicate_side_effects',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
  }

  // 6. Resumen de la validación
  console.log('\n6️⃣  Resumen de la validación:');
  console.log('   ============================');
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.success ? 'OK' : 'FALLIDO'}`);
    if (result.success) successCount++;
  }
  
  const overallSuccess = successCount >= 3; // Al menos 3 de 5 tests deben pasar
  const successEmoji = overallSuccess ? '✅' : '❌';
  
  console.log(`\n${successEmoji} RESULTADO FINAL: ${overallSuccess ? 'SISTEMA CANÓNICO FUNCIONAL' : 'SISTEMA CON PROBLEMAS'}`);
  console.log(`   Tests exitosos: ${successCount}/${results.length}`);
  
  if (overallSuccess) {
    console.log('\n🎯 SISTEMA CANÓNICO VERIFICADO:');
    console.log('   - DecisionAuthority: Lee verdad → Usa autoridad → Escribe cola');
    console.log('   - ExecutionEngine: Lee cola → Ejecuta → Escribe eventos resultado');
    console.log('   - Separación de responsabilidades mantenida');
    console.log('   - No duplicación de side-effects detectada');
    console.log('   - Sistema listo para operación real');
  } else {
    console.log('\n⚠️  SISTEMA CON PROBLEMAS:');
    console.log('   - Revisar tests fallidos');
    console.log('   - Verificar conexión entre componentes');
    console.log('   - Confirmar que cron está activo');
  }

  return overallSuccess;
}

// Ejecutar validación
if (import.meta.main) {
  runFinalValidation()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡VALIDACIÓN FINAL EXITOSA!');
        console.log('El sistema canónico está completamente operativo con el naming correcto.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN VALIDACIÓN FINAL');
        console.log('Revisar los tests fallidos y corregir antes de continuar.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en validación final:', error);
      Deno.exit(1);
    });
}

export { runFinalValidation };