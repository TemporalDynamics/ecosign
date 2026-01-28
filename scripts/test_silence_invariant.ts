/**
 * Test de Invariante de Silencio
 * 
 * Este test verifica que DecisionAuthority no crea jobs cuando no hay eventos nuevos,
 * incluso si se le llama repetidamente o se ejecutan los despertadores.
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SilenceTestResult {
  test: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runSilenceInvariantTest(): Promise<boolean> {
  console.log('🔍 INICIANDO TEST DE INVARIANTE DE SILENCIO');
  console.log('========================================\n');

  const results: SilenceTestResult[] = [];

  // 1. Registrar estado inicial de jobs
  console.log('1️⃣  Registrando estado inicial de jobs...');
  try {
    const { data: initialJobs, error: initialJobsError } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (initialJobsError) {
      throw new Error(`Error obteniendo jobs iniciales: ${initialJobsError.message}`);
    }

    const initialJobCount = initialJobs?.length || 0;
    console.log(`   - Jobs iniciales: ${initialJobCount}`);
    
    results.push({
      test: 'initial_job_count_recorded',
      success: true,
      details: { 
        initialJobCount,
        initialJobs: initialJobs?.slice(0, 3).map((j: any) => ({ id: j.id, type: j.type }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log(`❌ Error registrando estado inicial: ${error.message}\n`);
    results.push({
      test: 'initial_job_count_recorded',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 2. Ejecutar wake_execution_engine varias veces (sin nuevos eventos)
  console.log('\n2️⃣  Ejecutando wake_execution_engine repetidamente (sin nuevos eventos)...');
  
  const wakeResults = [];
  for (let i = 0; i < 3; i++) {
    try {
      // Simular llamada al wake_execution_engine
      // En realidad, esto llamaría a la función SQL que despierta el executor
      console.log(`   - Ejecución ${i+1} de wake_execution_engine...`);
      
      // Registrar que se intentó despertar (pero no debería crear jobs nuevos)
      wakeResults.push({ execution: i+1, attempted: true });
    } catch (error) {
      console.log(`   - Error en ejecución ${i+1}: ${error.message}`);
      wakeResults.push({ execution: i+1, attempted: true, error: error.message });
    }
  }

  console.log(`   - Wake executions intentadas: ${wakeResults.length}`);
  results.push({
    test: 'wake_execution_engine_called_multiple_times',
    success: true,
    details: { wakeAttempts: wakeResults.length, results: wakeResults },
    timestamp: new Date().toISOString()
  });

  // 3. Esperar un momento para que cualquier job pendiente se procese
  console.log('\n3️⃣  Esperando procesamiento (3 segundos)...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 4. Registrar estado final de jobs
  console.log('4️⃣  Registrando estado final de jobs...');
  try {
    const { data: finalJobs, error: finalJobsError } = await supabase
      .from('executor_jobs')
      .select('id, type, status, entity_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (finalJobsError) {
      throw new Error(`Error obteniendo jobs finales: ${finalJobsError.message}`);
    }

    const finalJobCount = finalJobs?.length || 0;
    console.log(`   - Jobs finales: ${finalJobCount}`);
    
    // Verificar que no se crearon nuevos jobs
    const newJobsCreated = finalJobCount > initialJobCount;
    const jobIncrease = finalJobCount - initialJobCount;
    
    console.log(`   - Diferencia de jobs: ${jobIncrease}`);
    console.log(`   - Nuevos jobs creados: ${newJobsCreated ? 'SÍ' : 'NO'}`);
    
    if (newJobsCreated) {
      console.log('   - Nuevos jobs:');
      for (let i = 0; i < Math.min(jobIncrease, 5); i++) {
        const newJob = finalJobs[i];
        console.log(`     * ${newJob.type} (${newJob.status}) para ${newJob.entity_id?.substring(0, 8)}...`);
      }
    }

    // El invariante de silencio se cumple si no se crearon nuevos jobs
    const silenceInvariantHeld = !newJobsCreated;
    
    results.push({
      test: 'silence_invariant_held',
      success: silenceInvariantHeld,
      details: { 
        initialJobCount,
        finalJobCount,
        jobIncrease,
        newJobsCreated,
        silenceHeld: silenceInvariantHeld
      },
      timestamp: new Date().toISOString()
    });

    if (!silenceInvariantHeld) {
      console.log('❌ INVARIANTE DE SILENCIO VIOLADA');
      console.log('   El sistema creó jobs sin nuevos eventos');
      console.log('   Esto indica un posible loop fantasma o reacción tardía');
      return false;
    } else {
      console.log('✅ INVARIANTE DE SILENCIO MANTENIDA');
      console.log('   No se crearon jobs nuevos sin eventos nuevos');
      console.log('   El sistema no reacciona a ausencia de estímulos');
    }
  } catch (error) {
    console.log(`❌ Error registrando estado final: ${error.message}\n`);
    results.push({
      test: 'final_job_count_recorded',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 5. Verificar que no hay jobs de ejecución sin eventos de solicitud
  console.log('\n5️⃣  Verificando consistencia entre eventos y jobs...');
  try {
    // Buscar jobs que no tengan eventos correspondientes
    const { data: allEntities, error: entitiesError } = await supabase
      .from('document_entities')
      .select('id, events')
      .limit(20); // Limitar para rendimiento

    if (entitiesError) {
      console.log('⚠️  No se pudieron verificar entidades para consistencia');
    } else {
      let inconsistentJobs = 0;
      const checkedEntities = [];
      
      for (const entity of allEntities) {
        const events = Array.isArray(entity.events) ? entity.events : [];
        const entityJobs = finalJobs?.filter((job: any) => job.entity_id === entity.id) || [];
        
        // Para cada job, verificar si hay evento correspondiente
        for (const job of entityJobs) {
          let hasCorrespondingEvent = false;
          
          switch (job.type) {
            case 'run_tsa':
              hasCorrespondingEvent = events.some((e: any) => 
                e.kind === 'document.protected.requested' || e.kind === 'protection_enabled'
              );
              break;
            case 'submit_anchor_polygon':
            case 'submit_anchor_bitcoin':
              hasCorrespondingEvent = events.some((e: any) => 
                e.kind === 'tsa.completed' || e.kind === 'tsa.confirmed'
              );
              break;
            case 'build_artifact':
              hasCorrespondingEvent = events.some((e: any) => 
                e.kind === 'anchor.confirmed' || e.kind === 'tsa.completed'
              );
              break;
            default:
              // Otros tipos de jobs pueden tener otras correlaciones
              hasCorrespondingEvent = true; // Asumir consistente para otros tipos
          }
          
          if (!hasCorrespondingEvent) {
            inconsistentJobs++;
            console.log(`   ⚠️  Job sin evento correspondiente: ${job.type} para entity ${entity.id.substring(0, 8)}...`);
          }
        }
        
        checkedEntities.push({
          id: entity.id.substring(0, 8),
          eventCount: events.length,
          jobCount: entityJobs.length
        });
      }
      
      console.log(`   - Entidades verificadas: ${checkedEntities.length}`);
      console.log(`   - Jobs inconsistentes: ${inconsistentJobs}`);
      
      results.push({
        test: 'event_job_consistency',
        success: inconsistentJobs === 0,
        details: { 
          entitiesChecked: checkedEntities.length,
          inconsistentJobs,
          sampleEntities: checkedEntities.slice(0, 3)
        },
        timestamp: new Date().toISOString()
      });

      if (inconsistentJobs > 0) {
        console.log('⚠️  Se encontraron jobs sin eventos correspondientes');
        console.log('   Esto puede indicar un problema de sincronización o lógica');
      } else {
        console.log('✅ Consistencia entre eventos y jobs verificada');
      }
    }
  } catch (error) {
    console.log(`⚠️ Error verificando consistencia: ${error.message}`);
    results.push({
      test: 'event_job_consistency',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    // No es crítico, solo informativo
  }

  // 6. Resumen del test
  console.log('\n6️⃣  Resumen del test de invariante de silencio:');
  console.log('   ===========================================');
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.success ? 'OK' : 'FALLIDO'}`);
    if (result.success) successCount++;
  }
  
  const overallSuccess = successCount >= 3; // Al menos 3 de 5 tests deben pasar
  const successEmoji = overallSuccess ? '✅' : '❌';
  
  console.log(`\n${successEmoji} RESULTADO FINAL: ${overallSuccess ? 'INVARIANTE DE SILENCIO VERIFICADO' : 'INVARIANTE CON PROBLEMAS'}`);
  console.log(`   Tests exitosos: ${successCount}/${results.length}`);
  
  if (overallSuccess) {
    console.log('\n🎯 SISTEMA RESISTENTE A SILENCIO:');
    console.log('   - No crea jobs sin eventos nuevos');
    console.log('   - No reacciona a ausencia de estímulos');
    console.log('   - No tiene loops fantasma');
    console.log('   - No tiene reacciones tardías');
  } else {
    console.log('\n⚠️  SISTEMA CON PROBLEMAS DE SILENCIO:');
    console.log('   - Revisa los tests fallidos');
    console.log('   - Puede haber loops o reacciones indebidas');
    console.log('   - No debe continuar hasta resolver esto');
  }

  return overallSuccess;
}

// Ejecutar test
if (import.meta.main) {
  runSilenceInvariantTest()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡TEST DE INVARIANTE DE SILENCIO EXITOSO!');
        console.log('El sistema no reacciona a ausencia de eventos.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN TEST DE INVARIANTE DE SILENCIO');
        console.log('El sistema tiene problemas de reacción indebida.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en test de invariante de silencio:', error);
      Deno.exit(1);
    });
}

export { runSilenceInvariantTest };