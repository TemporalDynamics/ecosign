/**
 * Script de migración: Conectar eventos legacy con sistema canónico
 * 
 * Este script migra eventos de user_document_events → document_entities.events[]
 * para activar el sistema dormido.
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateLegacyEventsToCanonical() {
  console.log('🔍 Iniciando migración de eventos legacy a canónico...');

  try {
    // 1. Obtener eventos legacy que no han sido migrados
    const { data: legacyEvents, error: legacyError } = await supabase
      .from('user_document_events')
      .select(`
        id,
        document_id,
        event_type,
        timestamp,
        metadata,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100); // Limitar por seguridad

    if (legacyError) {
      throw new Error(`Error obteniendo eventos legacy: ${legacyError.message}`);
    }

    console.log(`📦 Encontrados ${legacyEvents.length} eventos legacy`);

    if (legacyEvents.length === 0) {
      console.log('✅ No hay eventos legacy para migrar');
      return;
    }

    // 2. Para cada evento legacy, encontrar el document_entity correspondiente
    for (const legacyEvent of legacyEvents) {
      try {
        // Buscar el user_document correspondiente
        const { data: userDoc, error: docError } = await supabase
          .from('user_documents')
          .select('id, document_hash, user_id')
          .eq('id', legacyEvent.document_id)
          .single();

        if (docError || !userDoc) {
          console.warn(`⚠️ Documento no encontrado para evento ${legacyEvent.id}, saltando...`);
          continue;
        }

        // Buscar o crear el document_entity correspondiente
        let { data: docEntity, error: entityError } = await supabase
          .from('document_entities')
          .select('id, source_hash, events')
          .eq('source_hash', userDoc.document_hash)
          .single();

        if (entityError || !docEntity) {
          // Crear nuevo document_entity si no existe
          const { data: newEntity, error: createError } = await supabase
            .from('document_entities')
            .insert({
              source_hash: userDoc.document_hash,
              witness_hash: userDoc.document_hash, // o calcular el witness hash real
              events: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id, source_hash, events')
            .single();

          if (createError) {
            console.error(`❌ Error creando document_entity: ${createError.message}`);
            continue;
          }
          
          docEntity = newEntity;
          console.log(`🆕 Creado nuevo document_entity: ${docEntity.id}`);
        }

        // 3. Convertir evento legacy a evento canónico
        const canonicalEventType = legacyEvent.event_type === 'created' 
          ? 'document.created' 
          : `document.${legacyEvent.event_type}`;
          
        const canonicalEvent = {
          kind: canonicalEventType,
          at: legacyEvent.timestamp || legacyEvent.created_at,
          payload: legacyEvent.metadata ? JSON.parse(legacyEvent.metadata as string) : {},
          _source: 'migration_bridge_legacy_to_canonical'
        };

        // 4. Verificar si ya existe este evento canónico
        const eventsArray = Array.isArray(docEntity.events) ? docEntity.events : [];
        const eventExists = eventsArray.some((event: any) => 
          event.kind === canonicalEvent.kind && 
          event.at === canonicalEvent.at
        );

        if (eventExists) {
          console.log(`⏭️ Evento canónico ya existe para entity ${docEntity.id}, saltando...`);
          continue;
        }

        // 5. Agregar evento canónico al array de eventos
        const updatedEvents = [...eventsArray, canonicalEvent];

        // 6. Actualizar document_entity con el nuevo evento
        const { error: updateError } = await supabase
          .from('document_entities')
          .update({
            events: updatedEvents,
            updated_at: new Date().toISOString()
          })
          .eq('id', docEntity.id);

        if (updateError) {
          console.error(`❌ Error actualizando entity ${docEntity.id}:`, updateError.message);
          continue;
        }

        console.log(`✅ Evento migrado: ${legacyEvent.id} → entity ${docEntity.id}`);

      } catch (error) {
        console.error(`❌ Error procesando evento ${legacyEvent.id}:`, error.message);
        continue;
      }
    }

    console.log('✅ Migración de eventos legacy completada');
    
  } catch (error) {
    console.error('❌ Error fatal en migración:', error.message);
    throw error;
  }
}

// Ejecutar migración
if (import.meta.main) {
  migrateLegacyEventsToCanonical()
    .then(() => {
      console.log('🏁 Script de migración completado exitosamente');
      Deno.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en script de migración:', error);
      Deno.exit(1);
    });
}

export { migrateLegacyEventsToCanonical };