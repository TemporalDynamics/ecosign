/**
 * Script de activación: Crear entidad canónica con evento de protección
 * 
 * Este script simula la protección de un documento para activar el sistema canónico
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function activateCanonicalSystem() {
  console.log('🚀 Activando sistema canónico creando entidad con evento...');

  try {
    // 1. Crear una entidad de documento canónica con un evento de protección
    const testDocumentHash = 'test_doc_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    console.log(`📝 Creando document_entity con hash: ${testDocumentHash}`);
    
    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .insert({
        source_hash: testDocumentHash,
        witness_hash: testDocumentHash,
        events: [
          {
            kind: 'protection_enabled',
            at: new Date().toISOString(),
            payload: {
              protection: {
                methods: ['tsa', 'polygon', 'bitcoin'],
                signature_type: 'none',
                forensic_enabled: true
              },
              document_id: 'test_doc_' + Date.now(),
              user_id: 'test_user_' + Date.now()
            },
            _source: 'activation_script'
          },
          {
            kind: 'document.protected.requested',
            at: new Date().toISOString(),
            payload: {
              document_entity_id: testDocumentHash,
              witness_hash: testDocumentHash,
              protection: ['tsa', 'polygon', 'bitcoin']
            },
            _source: 'activation_script'
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, source_hash, events')
      .single();

    if (entityError) {
      throw new Error(`Error creando entidad: ${entityError.message}`);
    }

    console.log(`✅ Document entity creada: ${entity.id}`);
    console.log(`📊 Eventos creados: ${entity.events.length}`);
    
    // 2. Verificar que la entidad se creó correctamente
    const { data: verifiedEntity, error: verifyError } = await supabase
      .from('document_entities')
      .select('id, source_hash, events')
      .eq('id', entity.id)
      .single();

    if (verifyError) {
      throw new Error(`Error verificando entidad: ${verifyError.message}`);
    }

    console.log(`🔍 Verificación: ${verifiedEntity.events.length} eventos en entidad ${verifiedEntity.id}`);
    
    // 3. Mostrar los eventos para confirmar
    console.log('\n📋 Eventos en la entidad:');
    for (const event of verifiedEntity.events) {
      console.log(`   - ${event.kind} at ${event.at}`);
    }

    console.log('\n🎉 Sistema canónico activado!');
    console.log('   - Entidad creada con eventos canónicos');
    console.log('   - El executor debería procesar esta entidad en el próximo ciclo');
    console.log('   - Esperando que el cron invoke-fase1-executor corra...');
    
    return entity.id;

  } catch (error) {
    console.error('❌ Error activando sistema:', error.message);
    throw error;
  }
}

// Ejecutar activación
if (import.meta.main) {
  activateCanonicalSystem()
    .then(entityId => {
      console.log(`\n✅ Activación completada. Entity ID: ${entityId}`);
      console.log('\n⏰ El executor debería procesar esta entidad en ~1 minuto (siguiente ciclo de cron)');
      Deno.exit(0);
    })
    .catch(error => {
      console.error('💥 Error en activación:', error);
      Deno.exit(1);
    });
}

export { activateCanonicalSystem };