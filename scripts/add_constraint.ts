/**
 * Add unique constraint directly
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Adding unique constraint ===\n');

  // Try to add constraint via RPC
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_documents_document_entity_id_unique'
      ) THEN
        ALTER TABLE user_documents
        ADD CONSTRAINT user_documents_document_entity_id_unique UNIQUE (document_entity_id);
        RAISE NOTICE 'Unique constraint added';
      ELSE
        RAISE NOTICE 'Unique constraint already exists';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraint: %', SQLERRM;
    END $$;
  `;

  // Execute via supabase RPC or direct SQL
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('✅ Constraint added or already exists');
  }
}

main();
