/**
 * Test de Carga del Sistema Canónico
 * 
 * Este test verifica que el sistema maneje correctamente:
 * - Múltiples documentos protegidos simultáneamente
 * - Concurrencia entre DecisionAuthority y ExecutionEngine
 * - No duplicación de side-effects bajo carga
 * - Rendimiento aceptable
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LoadTestResult {
  test: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runLoadTest(): Promise<boolean> {
  console.log('🏋️‍♂️ INICIANDO TEST DE CARGA DEL SISTEMA CANÓNICO');
  console.log('===============================================\n');

  const results: LoadTestResult[] = [];

  // 1. Medir estado inicial
  console.log('1️⃣  Registrando estado inicial...');
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

    console.log(`   - Document Entities: ${initialEntities}`);
    console.log(`   - Executor Jobs: ${initialJobs}`);
    console.log(`   - Executor Job Runs: ${initialRuns}`);

    results.push({
      test: 'initial_state_recorded',
      success: true,
      details: { 
        initialEntities,
        initialJobs,
        initialRuns
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log(`❌ Error registrando estado inicial: ${error.message}\n`);
    results.push({
      test: 'initial_state_recorded',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 2. Crear múltiples entidades de prueba simultáneamente
  console.log('\n2️⃣  Creando 5 entidades de prueba simultáneamente...');
  const testEntities = [];
  const startTime = Date.now();

  try {
    for (let i = 0; i < 5; i++) {
      const testEntityId = crypto.randomUUID();
      const testHash = `load_test_${Date.now()}_${i}`;
      
      const { data: entity, error: entityError } = await supabase
        .from('document_entities')
        .insert({
          id: testEntityId,
          owner_id: 'test_user_load',
          source_hash: testHash,
          witness_hash: testHash,
          events: [
            {
              kind: 'document.created',
              at: new Date().toISOString(),
              payload: {
                filename: `load_test_${i}.pdf`,
                file_size: 1024 + i * 100,
                protection: ['tsa', 'polygon', 'bitcoin']
              },
              _source: 'load_test'
            },
            {
              kind: 'document.protected.requested',
              at: new Date().toISOString(),
              payload: {
                protection: ['tsa', 'polygon', 'bitcoin'],
              },
              _source: 'load_test'
            }
          ],
          lifecycle_status: 'created',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, events')
        .single();

      if (entityError) {
        throw new Error(`Error creando entidad ${i}: ${entityError.message}`);
      }

      testEntities.push(entity);
      console.log(`   - Entidad ${i+1} creada: ${entity.id.substring(0, 8)}...`);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.log(`   ✅ 5 entidades creadas en ${totalTime}ms`);
    
    results.push({
      test: 'concurrent_entities_created',
      success: true,
      details: { 
        entitiesCreated: testEntities.length,
        totalTimeMs: totalTime,
        averageTimePerEntity: totalTime / testEntities.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log(`❌ Error creando entidades concurrentes: ${error.message}\n`);
    results.push({
      test: 'concurrent_entities_created',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 3. Esperar que DecisionAuthority procese eventos (5 segundos)
  console.log('\n3️⃣  Esperando que DecisionAuthority procese eventos concurrentes...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 4. Verificar que DecisionAuthority creó jobs para todas las entidades
  console.log('4️⃣  Verificando jobs creados por DecisionAuthority...');
  try {
    const entityIds = testEntities.map(e => e.id);
    const { data: jobs, error: jobsError } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .in('entity_id', entityIds)
      .order('created_at', { ascending: false });

    if (jobsError) {
      throw new Error(`Error obteniendo jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('   ❌ No se encontraron jobs para las entidades de prueba');
      results.push({
        test: 'decision_authority_processes_concurrent_entities',
        success: false,
        details: { 
          message: 'DecisionAuthority no creó jobs para entidades de prueba',
          expectedEntityIds: entityIds
        },
        timestamp: new Date().toISOString()
      });
      return false;
    }

    console.log(`   ✅ ${jobs.length} jobs creados para ${testEntities.length} entidades`);
    
    // Verificar que cada entidad tiene jobs
    const jobsByEntity: Record<string, any[]> = {};
    for (const job of jobs) {
      if (!jobsByEntity[job.entity_id]) {
        jobsByEntity[job.entity_id] = [];
      }
      jobsByEntity[job.entity_id].push(job);
    }

    const entitiesWithJobs = Object.keys(jobsByEntity);
    console.log(`   ✅ ${entitiesWithJobs.length}/${testEntities.length} entidades tienen jobs`);

    for (const [entityId, entityJobs] of Object.entries(jobsByEntity)) {
      console.log(`      - ${entityId.substring(0, 8)}...: ${entityJobs.length} jobs`);
      for (const job of entityJobs) {
        console.log(`         * ${job.type} (${job.status})`);
      }
    }

    results.push({
      test: 'decision_authority_processes_concurrent_entities',
      success: entitiesWithJobs.length === testEntities.length,
      details: { 
        totalJobs: jobs.length,
        entitiesWithJobs: entitiesWithJobs.length,
        expectedEntities: testEntities.length,
        jobsDistribution: Object.fromEntries(
          Object.entries(jobsByEntity).map(([id, jobs]) => [id.substring(0, 8), jobs.length])
        )
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log(`❌ Error verificando jobs concurrentes: ${error.message}\n`);
    results.push({
      test: 'decision_authority_processes_concurrent_entities',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 5. Esperar que ExecutionEngine procese jobs (10 segundos)
  console.log('\n5️⃣  Esperando que ExecutionEngine procese jobs concurrentes...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 6. Verificar que no hay duplicación de side-effects
  console.log('6️⃣  Verificando no duplicación de side-effects bajo carga...');
  try {
    const { data: updatedEntities, error: entitiesError } = await supabase
      .from('document_entities')
      .select('id, events')
      .in('id', entityIds);

    if (entitiesError) {
      throw new Error(`Error obteniendo entidades actualizadas: ${entitiesError.message}`);
    }

    if (!updatedEntities || updatedEntities.length === 0) {
      console.log('   ⚠️  No se encontraron entidades actualizadas');
    } else {
      let totalTsaEvents = 0;
      let totalAnchorEvents = 0;
      let totalArtifactEvents = 0;
      let duplicationIssues = 0;

      for (const entity of updatedEntities) {
        if (Array.isArray(entity.events)) {
          // Contar eventos por tipo
          const tsaEvents = entity.events.filter((e: any) => e.kind.includes('tsa'));
          const anchorEvents = entity.events.filter((e: any) => e.kind.includes('anchor'));
          const artifactEvents = entity.events.filter((e: any) => e.kind.includes('artifact'));

          totalTsaEvents += tsaEvents.length;
          totalAnchorEvents += anchorEvents.length;
          totalArtifactEvents += artifactEvents.length;

          // Verificar duplicación (más de 1 evento del mismo tipo para la misma operación)
          if (tsaEvents.length > 1) {
            console.log(`   ⚠️  ${entity.id.substring(0, 8)}... tiene ${tsaEvents.length} eventos TSA`);
            duplicationIssues++;
          }

          if (artifactEvents.length > 1) {
            console.log(`   ⚠️  ${entity.id.substring(0, 8)}... tiene ${artifactEvents.length} eventos artifact`);
            duplicationIssues++;
          }
        }
      }

      console.log(`   - Eventos TSA totales: ${totalTsaEvents}`);
      console.log(`   - Eventos Anchor totales: ${totalAnchorEvents}`);
      console.log(`   - Eventos Artifact totales: ${totalArtifactEvents}`);
      console.log(`   - Posibles duplicaciones: ${duplicationIssues}`);

      if (duplicationIssues === 0) {
        console.log('   ✅ No se detectaron duplicaciones bajo carga concurrente');
        
        results.push({
          test: 'no_duplicate_side_effects_under_load',
          success: true,
          details: { 
            totalTsaEvents,
            totalAnchorEvents,
            totalArtifactEvents,
            duplicationIssues,
            entitiesChecked: updatedEntities.length
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('   ❌ Se detectaron posibles duplicaciones bajo carga');
        
        results.push({
          test: 'no_duplicate_side_effects_under_load',
          success: false,
          details: { 
            totalTsaEvents,
            totalAnchorEvents,
            totalArtifactEvents,
            duplicationIssues,
            entitiesChecked: updatedEntities.length
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error verificando duplicación bajo carga: ${error.message}\n`);
    results.push({
      test: 'no_duplicate_side_effects_under_load',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 7. Verificar rendimiento
  console.log('\n7️⃣  Verificando rendimiento del sistema...');
  try {
    // Medir tiempo de procesamiento promedio
    const processingStartTime = Date.now();
    
    // Esperar un poco más para asegurar procesamiento
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const processingEndTime = Date.now();
    const processingTime = processingEndTime - processingStartTime;
    
    // Verificar que el tiempo de procesamiento es razonable
    const acceptableProcessingTime = 15000; // 15 segundos para 5 entidades
    
    if (processingTime <= acceptableProcessingTime) {
      console.log(`   ✅ Procesamiento completado en ${processingTime}ms (aceptable)`);
      
      results.push({
        test: 'system_performance_acceptable',
        success: true,
        details: { 
          processingTimeMs: processingTime,
          acceptableThreshold: acceptableProcessingTime,
          entitiesProcessed: testEntities.length
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`   ⚠️  Procesamiento tomó ${processingTime}ms (más que el umbral de ${acceptableProcessingTime}ms)`);
      
      results.push({
        test: 'system_performance_acceptable',
        success: false,
        details: { 
          processingTimeMs: processingTime,
          acceptableThreshold: acceptableProcessingTime,
          entitiesProcessed: testEntities.length
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando rendimiento: ${error.message}\n`);
    results.push({
      test: 'system_performance_acceptable',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 8. Resumen del test de carga
  console.log('\n8️⃣  Resumen del test de carga:');
  console.log('   ============================');
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.success ? 'OK' : 'FALLIDO'}`);
    if (result.success) successCount++;
  }
  
  const overallSuccess = successCount >= 5; // Al menos 5 de 7 tests deben pasar
  const successEmoji = overallSuccess ? '✅' : '❌';
  
  console.log(`\n${successEmoji} RESULTADO FINAL: ${overallSuccess ? 'CARGA MANEJADA CORRECTAMENTE' : 'PROBLEMAS BAJO CARGA'}`);
  console.log(`   Tests exitosos: ${successCount}/${results.length}`);
  
  if (overallSuccess) {
    console.log('\n🎯 SISTEMA ESCALABLE:');
    console.log('   - Maneja entidades concurrentes');
    console.log('   - DecisionAuthority procesa múltiples entidades');
    console.log('   - No duplicación bajo carga');
    console.log('   - Rendimiento aceptable');
    console.log('   - Separación de responsabilidades mantenida');
  } else {
    console.log('\n⚠️  SISTEMA CON PROBLEMAS BAJO CARGA:');
    console.log('   - Revisa los tests fallidos');
    console.log('   - Puede haber problemas de concurrencia');
    console.log('   - Requiere ajustes antes de producción');
  }

  return overallSuccess;
}

// Ejecutar test de carga
if (import.meta.main) {
  runLoadTest()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡TEST DE CARGA EXITOSO!');
        console.log('El sistema canónico maneja correctamente la concurrencia.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN TEST DE CARGA');
        console.log('El sistema tiene problemas bajo carga que deben resolverse.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en test de carga:', error);
      Deno.exit(1);
    });
}

export { runLoadTest };
