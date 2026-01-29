import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('URL:', SUPABASE_URL);
console.log('KEY START:', SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkPendingJobs() {
  try {
    // Intentar buscar documentos en la tabla document_entities
    const { data: pendingDocs, error: docsError } = await supabase
      .from('document_entities')
      .select('id, source_name, lifecycle_status, events, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (docsError) {
      console.log('Error getting documents:', docsError.message);
      console.log('Details:', docsError);
    } else {
      console.log(`Found ${pendingDocs?.length || 0} documents`);
      if (pendingDocs) {
        for (const doc of pendingDocs) {
          console.log(`- ${doc.id.substring(0, 8)}...: ${doc.lifecycle_status} (${doc.source_name})`);
          console.log(`  Events count: ${doc.events?.length || 0}`);
          console.log(`  Created: ${doc.created_at}`);
        }
      }
    }
  } catch (error) {
    console.log('General error:', error.message);
    console.log('Error details:', error);
  }
}

await checkPendingJobs();