/**
 * Nuevo trigger: Conectar eventos de documentos con sistema canónico
 * 
 * Este trigger remplaza al legacy para que nuevos eventos vayan directamente
 * al sistema canónico: document_entities.events[]
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
import { appendEvent } from '../_shared/eventHelper.ts';

// Este trigger debe ser llamado cuando se crea un nuevo documento
// y debe escribir directamente en document_entities.events[]

export async function handleNewDocumentCreated(documentId: string, metadata: any) {
  // 1. Obtener el user_document para obtener el hash
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userDoc, error: docError } = await supabase
    .from('user_documents')
    .select('id, document_hash, user_id')
    .eq('id', documentId)
    .single();

  if (docError || !userDoc) {
    throw new Error(`Documento no encontrado: ${documentId}`);
  }

  // 2. Buscar o crear el document_entity correspondiente
  let documentEntityId: string;
  
  // Intentar encontrar el entity existente
  const { data: existingEntity } = await supabase
    .from('document_entities')
    .select('id')
    .eq('source_hash', userDoc.document_hash)
    .single();

  if (existingEntity) {
    documentEntityId = existingEntity.id;
  } else {
    // Crear nuevo document_entity
    const { data: newEntity, error: createError } = await supabase
      .from('document_entities')
      .insert({
        source_hash: userDoc.document_hash,
        witness_hash: userDoc.document_hash, // o calcular el witness hash real
        events: [],
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error(`Error creando document_entity: ${createError.message}`);
    }
    
    documentEntityId = newEntity.id;
  }

  // 3. Crear el evento canónico
  const canonicalEvent = {
    kind: 'document.created',
    at: new Date().toISOString(),
    payload: {
      ...metadata,
      document_id: documentId,
      user_id: userDoc.user_id
    }
  };

  // 4. Agregar el evento canónico al document_entity
  const result = await appendEvent(
    supabase,
    documentEntityId,
    canonicalEvent,
    'document_created_trigger'
  );

  if (!result.success) {
    throw new Error(`Error appending canonical event: ${result.error}`);
  }

  console.log(`✅ Evento canónico creado para document_entity: ${documentEntityId}`);
  
  return {
    documentEntityId,
    eventId: result.eventId
  };
}

// Handler para Supabase Edge Function
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { documentId, metadata } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await handleNewDocumentCreated(documentId, metadata);
    
    return new Response(
      JSON.stringify({ success: true, ...result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en trigger de documento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});