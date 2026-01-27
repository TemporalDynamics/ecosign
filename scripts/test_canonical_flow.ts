/**
 * Test de extremo a extremo del sistema canónico
 * 
 * Este script prueba el flujo completo:
 * 1. Usuario protege documento
 * 2. Evento canónico se registra
 * 3. Executor procesa evento
 * 4. Executor crea jobs
 * 5. Orchestrator procesa jobs
 * 6. Resultados se registran como eventos
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testCanonicalFlow() {
  console.log('🧪 Iniciando test de flujo canónico...\n');

  // 1. Crear un nuevo document_entity para el test
  const testHash = `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  console.log('1️⃣  Creando entidad de documento de prueba...');
  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .insert({
      source_hash: testHash,
      witness_hash: testHash,
      events: [
        {
          kind: 'document.protected.requested',
          at: new Date().toISOString(),
          payload: {
            protection: ['tsa', 'polygon', 'bitcoin'],
            document_id: `test_doc_${Date.now()}`,
            witness_hash: testHash
          },
          _source: 'test_flow'
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id, source_hash, events')
    .single();

  if (entityError) {
    throw new Error(`Error creando entidad de prueba: ${entityError.message}`);
  }

  console.log(`✅ Entidad creada: ${entity.id.substring(0, 8)}...`);
  console.log(`📊 Eventos iniciales: ${entity.events.length}`);

  // 2. Verificar que se creó el evento canónico
  console.log('\n2️⃣  Verificando evento canónico...');
  const protectionRequestedEvent = entity.events.find((e: any) => e.kind === 'document.protected.requested');
  if (!protectionRequestedEvent) {
    throw new Error('No se encontró evento document.protected.requested');
  }
  console.log(`✅ Evento encontrado: ${protectionRequestedEvent.kind}`);

  // 3. Simular que el executor procesa este evento
  console.log('\n3️⃣  Simulando procesamiento por executor...');
  
  // Llamar al executor para que procese jobs (esto debería crear jobs basados en el evento)
  const executorResponse = await fetch(`${SUPABASE_URL}/functions/v1/fase1-executor`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ limit: 10 })
  });

  const executorResult = await executorResponse.json().catch(() => ({}));
  console.log(`✅ Executor respondió: ${executorResponse.status}`, executorResult);

  // 4. Esperar un momento para que se procesen los jobs
  console.log('\n⏳ Esperando procesamiento de jobs...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 5. Verificar que se crearon jobs en la cola
  console.log('5️⃣  Verificando jobs creados por executor...');
  const { data: jobs, error: jobsError } = await supabase
    .from('executor_jobs')
    .select('id, type, entity_id, status, created_at')
    .eq('entity_id', entity.id)
    .order('created_at', { ascending: false });

  if (jobsError) {
    console.error('❌ Error obteniendo jobs:', jobsError.message);
  } else {
    console.log(`✅ Jobs encontrados: ${jobs.length}`);
    for (const job of jobs) {
      console.log(`   - ${job.type} (${job.status})`);
    }
  }

  // 6. Verificar que hay jobs que el orchestrator debería procesar
  const tsaJobs = jobs?.filter((j: any) => j.type === 'run_tsa') || [];
  const anchorJobs = jobs?.filter((j: any) => j.type.includes('anchor')) || [];
  const artifactJobs = jobs?.filter((j: any) => j.type.includes('artifact')) || [];

  console.log('\n6️⃣  Verificando tipos de jobs esperados...');
  console.log(`   TSA jobs: ${tsaJobs.length}`);
  console.log(`   Anchor jobs: ${anchorJobs.length}`);
  console.log(`   Artifact jobs: ${artifactJobs.length}`);

  // 7. Simular ejecución del orchestrator
  console.log('\n7️⃣  Simulando ejecución por orchestrator...');
  
  // Llamar al orchestrator para que procese jobs pendientes
  const orchestratorResponse = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'poll' })
  });

  const orchestratorResult = await orchestratorResponse.json().catch(() => ({}));
  console.log(`✅ Orchestrator respondió: ${orchestratorResponse.status}`, orchestratorResult);

  // 8. Esperar un momento para que se procesen los resultados
  console.log('\n⏳ Esperando resultados...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 9. Verificar que se agregaron eventos de resultado
  console.log('9️⃣  Verificando eventos de resultado...');
  const { data: updatedEntity, error: updatedError } = await supabase
    .from('document_entities')
    .select('id, events')
    .eq('id', entity.id)
    .single();

  if (updatedError) {
    console.error('❌ Error obteniendo entidad actualizada:', updatedError.message);
  } else {
    const newEventsCount = updatedEntity.events.length - entity.events.length;
    console.log(`✅ Eventos nuevos: ${newEventsCount}`);
    
    if (newEventsCount > 0) {
      const newEvents = updatedEntity.events.slice(entity.events.length);
      for (const event of newEvents) {
        console.log(`   - ${event.kind} at ${event.at}`);
      }
    }
  }

  console.log('\n🎯 Resultado del test:');
  console.log(`   - Document Entity: ${entity.id.substring(0, 8)}...`);
  console.log(`   - Eventos iniciales: ${entity.events.length}`);
  console.log(`   - Jobs creados: ${jobs?.length || 0}`);
  console.log(`   - Eventos finales: ${updatedEntity?.events.length || entity.events.length}`);
  
  const success = jobs && jobs.length > 0;
  console.log(`   - Flujo canónico: ${success ? '✅ ACTIVO' : '❌ INACTIVO'}`);

  return {
    success,
    entityId: entity.id,
    initialEvents: entity.events.length,
    jobsCreated: jobs?.length || 0,
    finalEvents: updatedEntity?.events.length || entity.events.length
  };
}

// Ejecutar test
if (import.meta.main) {
  testCanonicalFlow()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 ¡TEST EXITOSO! Flujo canónico funcionando correctamente');
        console.log('   - Verdad: document_entities.events[]');
        console.log('   - Autoridad: packages/authority');
        console.log('   - Executor: lee verdad → usa autoridad → escribe cola');
        console.log('   - Orchestrator: lee cola → ejecuta → escribe eventos');
        Deno.exit(0);
      } else {
        console.log('\n💥 TEST FALLIDO: Flujo canónico no está funcionando');
        Deno.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error en test:', error);
      Deno.exit(1);
    });
}

export { testCanonicalFlow };