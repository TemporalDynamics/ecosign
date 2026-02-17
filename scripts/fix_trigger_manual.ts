/**
 * Fix trigger using direct SQL via Supabase REST
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Fixing trigger via REST ===\n');

  // Use the pgrst schema to execute raw SQL
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

  // Try using the supabase_rest schema
  const { data, error } = await supabase
    .schema('supabase_migrations')
    .from('schema_migrations')
    .select('version')
    .limit(1);

  if (error) {
    console.log('Cannot access schema_migrations, trying alternative...');
  }

  // Alternative: use the migration system by creating a new migration file
  console.log('Manual fix required:');
  console.log('Run this SQL in Supabase Dashboard → SQL Editor:');
  console.log('\n```sql');
  console.log(sql);
  console.log('```');
}

main();
