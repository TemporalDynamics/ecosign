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
  // 1. Resolver documento y su entidad canónica
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('id, owner_id, title, original_filename, document_entity_id')
    .eq('id', documentId)
    .maybeSingle();

  if (docError || !document) {
    throw new Error(`Documento no encontrado: ${documentId}`);
  }

  const documentEntityId = document.document_entity_id ?? metadata?.document_entity_id ?? null;
  if (!documentEntityId) {
    throw new Error(`documents.document_entity_id faltante para ${documentId}`);
  }

  const { data: entity, error: entityError } = await supabase
    .from('document_entities')
    .select('id')
    .eq('id', documentEntityId)
    .maybeSingle();

  if (entityError || !entity) {
    throw new Error(`Document entity no encontrado: ${documentEntityId}`);
  }

  // 2. Crear el evento canónico
  const canonicalEvent = {
    kind: 'document.created',
    at: new Date().toISOString(),
    payload: {
      ...metadata,
      document_id: documentId,
      document_entity_id: documentEntityId,
      owner_id: document.owner_id,
      title: document.title ?? null,
      original_filename: document.original_filename ?? null,
    }
  };

  // 3. Agregar el evento canónico al document_entity
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
    success: true,
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
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en trigger de documento:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
