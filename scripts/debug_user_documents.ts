/**
 * Debug: Check user_documents schema and data
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Debug: user_documents schema ===\n');

  // Check if document_entity_id column exists
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'user_documents')
    .order('ordinal_position');

  if (colError) {
    console.error('Error fetching columns:', colError.message);
  } else {
    console.log('Columns in user_documents:');
    console.log(columns?.map(c => `  - ${c.column_name} (${c.data_type})`).join('\n'));
  }

  console.log('\n=== Sample user_documents data ===\n');
  
  // Sample data
  const { data: sample, error: sampleError } = await supabase
    .from('user_documents')
    .select('*')
    .limit(3);

  if (sampleError) {
    console.error('Error fetching sample:', sampleError.message);
  } else {
    console.log('Sample data:', JSON.stringify(sample, null, 2));
  }

  console.log('\n=== Sample document_entities data ===\n');
  
  const { data: entities, error: entError } = await supabase
    .from('document_entities')
    .select('id, witness_hash, events')
    .limit(3);

  if (entError) {
    console.error('Error fetching entities:', entError.message);
  } else {
    console.log('Sample entities:', JSON.stringify(entities, null, 2));
  }
}

main();
