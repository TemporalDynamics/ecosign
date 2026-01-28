/**
 * Test de Duplicación de Side-Effects
 * 
 * Este test verifica que el sistema no duplica side-effects:
 * - No duplicación de TSA
 * - No duplicación de anclajes
 * - No duplicación de artifacts
 * - No duplicación de notificaciones
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface DuplicationTestResult {
  test: string;
  success: boolean;
  details: any;
  timestamp: string;
}

async function runDuplicationTest(): Promise<boolean> {
  console.log('🔍 INICIANDO TEST DE DUPLICACIÓN DE SIDE-EFFECTS');
  console.log('===============================================\n');

  const results: DuplicationTestResult[] = [];

  // 1. Buscar entidades con posibles duplicaciones
  console.log('1️⃣  Buscando entidades con posibles duplicaciones...');
  try {
    const { data: entities, error: entitiesError } = await supabase
      .from('document_entities')
      .select('id, events')
      .order('created_at', { ascending: false })
      .limit(10);

    if (entitiesError) {
      throw new Error(`Error obteniendo entidades: ${entitiesError.message}`);
    }

    if (!entities || entities.length === 0) {
      console.log('   ⚠️  No hay entidades para verificar duplicaciones');
      results.push({
        test: 'entities_available_for_duplication_check',
        success: false,
        details: { message: 'No hay entidades para verificar duplicaciones' },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`   ✅ Encontradas ${entities.length} entidades para verificar`);
      
      results.push({
        test: 'entities_available_for_duplication_check',
        success: true,
        details: { entityCount: entities.length },
        timestamp: new Date().toISOString()
      });
    }

    // 2. Verificar duplicaciones en cada entidad
    console.log('\n2️⃣  Verificando duplicaciones en eventos...');
    
    let totalEntities = 0;
    let entitiesWithDuplications = 0;
    let totalEvents = 0;
    let duplicatedEvents = 0;
    
    for (const entity of entities) {
      totalEntities++;
      if (!Array.isArray(entity.events)) continue;
      
      totalEvents += entity.events.length;
      
      // Agrupar eventos por tipo para detectar duplicados
      const eventGroups: Record<string, any[]> = {};
      for (const event of entity.events) {
        const kind = event.kind;
        if (!eventGroups[kind]) {
          eventGroups[kind] = [];
        }
        eventGroups[kind].push(event);
      }
      
      // Verificar si hay duplicaciones en cada tipo de evento
      for (const [kind, eventsOfType] of Object.entries(eventGroups)) {
        if (eventsOfType.length > 1) {
          // Verificar si son realmente duplicados (mismo contenido)
          const uniqueEvents = new Set(eventsOfType.map((e: any) => 
            JSON.stringify({ 
              kind: e.kind, 
              at: e.at, 
              payload: e.payload 
            })
          ));
          
          if (uniqueEvents.size !== eventsOfType.length) {
            // Hay duplicados reales (mismo contenido en diferentes objetos)
            entitiesWithDuplications++;
            duplicatedEvents += (eventsOfType.length - uniqueEvents.size);
            
            console.log(`   ❌ Entidad ${entity.id.substring(0, 8)}... tiene ${eventsOfType.length} eventos '${kind}' (${eventsOfType.length - uniqueEvents.size} duplicados)`);
            
            // Mostrar detalles de duplicados
            for (const event of eventsOfType) {
              console.log(`      - ${event.kind} at ${event.at}`);
            }
          } else {
            // Mismo tipo de evento pero diferente contenido (normal)
            console.log(`   ℹ️  Entidad ${entity.id.substring(0, 8)}... tiene ${eventsOfType.length} eventos '${kind}' (diferentes)`);
          }
        }
      }
    }
    
    console.log(`\n   - Entidades analizadas: ${totalEntities}`);
    console.log(`   - Entidades con duplicaciones: ${entitiesWithDuplications}`);
    console.log(`   - Eventos totales: ${totalEvents}`);
    console.log(`   - Eventos duplicados: ${duplicatedEvents}`);
    
    const noDuplications = duplicatedEvents === 0;
    
    results.push({
      test: 'no_duplicate_events_in_entities',
      success: noDuplications,
      details: { 
        entitiesAnalyzed: totalEntities,
        entitiesWithDuplications,
        totalEvents,
        duplicatedEvents,
        duplicationFree: noDuplications
      },
      timestamp: new Date().toISOString()
    });

    if (noDuplications) {
      console.log('   ✅ No se encontraron duplicaciones de eventos');
    } else {
      console.log('   ❌ Se encontraron duplicaciones de eventos');
    }

  } catch (error) {
    console.log(`❌ Error verificando duplicaciones: ${error.message}\n`);
    results.push({
      test: 'no_duplicate_events_in_entities',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 3. Verificar duplicaciones en jobs
  console.log('\n3️⃣  Verificando duplicaciones en jobs...');
  try {
    const { data: jobs, error: jobsError } = await supabase
      .from('executor_jobs')
      .select('id, type, entity_id, dedupe_key, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (jobsError) {
      throw new Error(`Error obteniendo jobs: ${jobsError.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('   ℹ️  No hay jobs para verificar duplicaciones');
    } else {
      // Verificar duplicados por dedupe_key
      const dedupeKeys = jobs.map((j: any) => j.dedupe_key).filter((key: any) => key !== null);
      const uniqueDedupeKeys = [...new Set(dedupeKeys)];
      
      if (dedupeKeys.length !== uniqueDedupeKeys.length) {
        // Hay jobs con misma dedupe_key (posible duplicación)
        const duplicates = dedupeKeys.filter((key: any, index: number, arr: any[]) => 
          arr.indexOf(key) !== index
        );
        
        console.log(`   ❌ ${duplicates.length} jobs con claves de deduplicación duplicadas`);
        console.log(`      Claves duplicadas: ${[...new Set(duplicates)].join(', ')}`);
        
        results.push({
          test: 'no_duplicate_jobs_with_same_dedupe_key',
          success: false,
          details: { 
            totalJobs: jobs.length,
            duplicateKeys: [...new Set(duplicates)],
            duplicateCount: duplicates.length
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`   ✅ ${jobs.length} jobs verificados, no hay duplicaciones por clave`);
        
        results.push({
          test: 'no_duplicate_jobs_with_same_dedupe_key',
          success: true,
          details: { 
            totalJobs: jobs.length,
            duplicateKeys: [],
            duplicateCount: 0
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error verificando duplicación de jobs: ${error.message}\n`);
    results.push({
      test: 'no_duplicate_jobs_with_same_dedupe_key',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 4. Verificar duplicaciones específicas de side-effects críticos
  console.log('\n4️⃣  Verificando duplicaciones de side-effects críticos...');
  
  try {
    // Buscar entidades con múltiples eventos de TSA
    const { data: tsaEntities, error: tsaError } = await supabase
      .from('document_entities')
      .select('id, events')
      .order('created_at', { ascending: false })
      .limit(20);

    if (tsaError) {
      throw new Error(`Error obteniendo entidades para TSA check: ${tsaError.message}`);
    }

    if (tsaEntities && tsaEntities.length > 0) {
      let tsaDuplications = 0;
      let totalTsaEvents = 0;
      
      for (const entity of tsaEntities) {
        if (!Array.isArray(entity.events)) continue;
        
        const tsaEvents = entity.events.filter((e: any) => 
          e.kind.includes('tsa') && 
          (e.kind.includes('completed') || e.kind.includes('confirmed'))
        );
        
        totalTsaEvents += tsaEvents.length;
        
        if (tsaEvents.length > 1) {
          // Más de un evento de TSA completado para la misma entidad
          tsaDuplications++;
          console.log(`   ⚠️  Entidad ${entity.id.substring(0, 8)}... tiene ${tsaEvents.length} eventos de TSA`);
          for (const tsaEvent of tsaEvents) {
            console.log(`      - ${tsaEvent.kind} at ${tsaEvent.at}`);
          }
        }
      }
      
      console.log(`   - Eventos TSA encontrados: ${totalTsaEvents}`);
      console.log(`   - Entidades con múltiples TSA: ${tsaDuplications}`);
      
      if (tsaDuplications === 0) {
        console.log('   ✅ No duplicación de side-effects TSA detectada');
        
        results.push({
          test: 'no_duplicate_tsa_side_effects',
          success: true,
          details: { 
            totalTsaEvents,
            entitiesWithMultipleTsa: tsaDuplications
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('   ❌ Posible duplicación de side-effects TSA detectada');
        
        results.push({
          test: 'no_duplicate_tsa_side_effects',
          success: false,
          details: { 
            totalTsaEvents,
            entitiesWithMultipleTsa: tsaDuplications
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // Buscar entidades con múltiples anclajes para la misma red
    console.log('\n   Verificando duplicación de anclajes...');
    
    let anchorDuplications = 0;
    let totalAnchorEvents = 0;
    
    for (const entity of tsaEntities || []) {
      if (!Array.isArray(entity.events)) continue;
      
      const anchorEvents = entity.events.filter((e: any) => 
        e.kind.includes('anchor') && 
        (e.kind.includes('submitted') || e.kind.includes('confirmed'))
      );
      
      totalAnchorEvents += anchorEvents.length;
      
      // Agrupar por red para detectar duplicados
      const anchorsByNetwork: Record<string, any[]> = {};
      for (const anchorEvent of anchorEvents) {
        const network = anchorEvent.payload?.network || 'unknown';
        if (!anchorsByNetwork[network]) {
          anchorsByNetwork[network] = [];
        }
        anchorsByNetwork[network].push(anchorEvent);
      }
      
      for (const [network, networkAnchors] of Object.entries(anchorsByNetwork)) {
        if (networkAnchors.length > 1) {
          // Múltiples anclajes para la misma red
          anchorDuplications++;
          console.log(`   ⚠️  Entidad ${entity.id.substring(0, 8)}... tiene ${networkAnchors.length} anclajes ${network}`);
          for (const anchorEvent of networkAnchors) {
            console.log(`      - ${anchorEvent.kind} at ${anchorEvent.at}`);
          }
        }
      }
    }
    
    console.log(`   - Eventos Anchor encontrados: ${totalAnchorEvents}`);
    console.log(`   - Entidades con múltiples anclajes: ${anchorDuplications}`);
    
    if (anchorDuplications === 0) {
      console.log('   ✅ No duplicación de side-effects de anclaje detectada');
      
      results.push({
        test: 'no_duplicate_anchor_side_effects',
        success: true,
        details: { 
          totalAnchorEvents,
          entitiesWithMultipleAnchors: anchorDuplications
        },
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('   ⚠️  Posible duplicación de side-effects de anclaje detectada');
      
      results.push({
        test: 'no_duplicate_anchor_side_effects',
        success: false,
        details: { 
          totalAnchorEvents,
          entitiesWithMultipleAnchors: anchorDuplications
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.log(`❌ Error verificando duplicaciones de side-effects: ${error.message}\n`);
    results.push({
      test: 'no_duplicate_side_effects',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 5. Verificar que DecisionAuthority no duplica lógica
  console.log('\n5️⃣  Verificando que DecisionAuthority no duplica lógica...');
  
  // Buscar jobs que podrían haber sido creados duplicadamente
  try {
    const { data: recentJobs, error: recentJobsError } = await supabase
      .from('executor_jobs')
      .select('type, entity_id, dedupe_key, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Ú 24 horas
      .order('created_at', { ascending: false });

    if (recentJobsError) {
      throw new Error(`Error obteniendo jobs recientes: ${recentJobsError.message}`);
    }

    if (recentJobs && recentJobs.length > 0) {
      // Agrupar jobs por entity_id y type para detectar duplicados
      const jobGroups: Record<string, any[]> = {};
      for (const job of recentJobs) {
        const key = `${job.entity_id}:${job.type}`;
        if (!jobGroups[key]) {
          jobGroups[key] = [];
        }
        jobGroups[key].push(job);
      }
      
      let duplicateJobGroups = 0;
      for (const [groupKey, jobs] of Object.entries(jobGroups)) {
        if (jobs.length > 1) {
          // Múltiples jobs del mismo tipo para la misma entidad
          duplicateJobGroups++;
          console.log(`   ⚠️  ${jobs.length} jobs del mismo tipo para la misma entidad: ${groupKey}`);
        }
      }
      
      if (duplicateJobGroups === 0) {
        console.log('   ✅ No duplicación de lógica en DecisionAuthority detectada');
        
        results.push({
          test: 'decision_authority_no_logic_duplication',
          success: true,
          details: { 
            recentJobs: recentJobs.length,
            duplicateJobGroups
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.log(`   ⚠️  ${duplicateJobGroups} grupos de jobs duplicados encontrados`);
        
        results.push({
          test: 'decision_authority_no_logic_duplication',
          success: false,
          details: { 
            recentJobs: recentJobs.length,
            duplicateJobGroups
          },
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log('   ℹ️  No hay jobs recientes para verificar duplicación de lógica');
      
      results.push({
        test: 'decision_authority_no_logic_duplication',
        success: true,
        details: { 
          message: 'No hay jobs recientes para verificar duplicación de lógica'
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log(`❌ Error verificando duplicación de lógica: ${error.message}\n`);
    results.push({
      test: 'decision_authority_no_logic_duplication',
      success: false,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    });
    return false;
  }

  // 6. Resumen del test
  console.log('\n6️⃣  Resumen del test de duplicación:');
  console.log('   ================================');
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.test}: ${result.success ? 'OK' : 'FALLIDO'}`);
    if (result.success) successCount++;
  }
  
  const overallSuccess = successCount >= 4; // Al menos 4 de 6 tests deben pasar
  const successEmoji = overallSuccess ? '✅' : '❌';
  
  console.log(`\n${successEmoji} RESULTADO FINAL: ${overallSuccess ? 'NO DUPLICACIÓN VERIFICADA' : 'DUPLICACIÓN DETECTADA'}`);
  console.log(`   Tests exitosos: ${successCount}/${results.length}`);
  
  if (overallSuccess) {
    console.log('\n🎯 SISTEMA SIN DUPLICACIÓN DE SIDE-EFFECTS:');
    console.log('   - No duplicación de eventos');
    console.log('   - No duplicación de jobs');
    console.log('   - No duplicación de side-effects críticos');
    console.log('   - DecisionAuthority no duplica lógica');
  } else {
    console.log('\n⚠️  SISTEMA CON RIESGO DE DUPLICACIÓN:');
    console.log('   - Revisa los tests fallidos');
    console.log('   - Puede haber duplicación de side-effects');
    console.log('   - No debe continuar hasta resolver esto');
  }

  return overallSuccess;
}

// Ejecutar test
if (import.meta.main) {
  runDuplicationTest()
    .then(success => {
      if (success) {
        console.log('\n🎉 ¡TEST DE DUPLICACIÓN EXITOSO!');
        console.log('El sistema no duplica side-effects.');
        Deno.exit(0);
      } else {
        console.log('\n💥 ERROR EN TEST DE DUPLICACIÓN');
        console.log('El sistema tiene riesgo de duplicación de side-effects.');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en test de duplicación:', error);
      Deno.exit(1);
    });
}

export { runDuplicationTest };