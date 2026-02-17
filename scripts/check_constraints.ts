/**
 * Check constraints on user_documents
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Checking user_documents constraints ===\n');

  // Check constraints
  const { data: constraints, error: conError } = await supabase
    .from('information_schema.table_constraints')
    .select('constraint_name, constraint_type')
    .eq('table_name', 'user_documents');

  if (conError) {
    console.error('Error:', conError.message);
  } else {
    console.log('Constraints:', JSON.stringify(constraints, null, 2));
  }

  // Check for remaining duplicates
  console.log('\n=== Checking for remaining duplicates ===');
  const { data: dups, error: dupError } = await supabase
    .rpc('exec_direct_sql', { 
      sql: `SELECT document_entity_id, COUNT(*) as cnt FROM user_documents WHERE document_entity_id IS NOT NULL GROUP BY document_entity_id HAVING COUNT(*) > 1` 
    });

  if (dupError) {
    console.log('Could not check duplicates via RPC');
    // Alternative: just count total
    const { count } = await supabase
      .from('user_documents')
      .select('*', { count: 'exact', head: true });
    console.log(`Total user_documents: ${count}`);
  } else {
    console.log('Duplicates:', dups);
  }
}

main();
