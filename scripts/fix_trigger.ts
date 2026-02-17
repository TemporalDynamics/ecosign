/**
 * Fix trigger WHEN clause
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Fixing trigger WHEN clause ===\n');

  const sql = `
    DROP TRIGGER IF EXISTS trg_project_events_to_user_document ON document_entities;

    CREATE TRIGGER trg_project_events_to_user_document
      AFTER UPDATE OF events ON document_entities
      FOR EACH ROW
      WHEN (
        COALESCE(jsonb_array_length(NEW.events), 0) > COALESCE(jsonb_array_length(OLD.events), 0)
      )
      EXECUTE FUNCTION project_events_to_user_document();
  `;

  // Execute via supabase RPC
  const { error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('❌ Error:', error.message);
    Deno.exit(1);
  } else {
    console.log('✅ Trigger fixed');
  }
}

main();
