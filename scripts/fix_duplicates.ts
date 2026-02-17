/**
 * Fix duplicate document_entity_id in user_documents
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Fixing duplicate document_entity_id ===\n');

  // Find duplicates
  console.log('Step 1: Finding duplicates...');
  const { data: duplicates, error: dupError } = await supabase
    .from('user_documents')
    .select('id, document_entity_id, updated_at')
    .not('document_entity_id', 'is', null);

  if (dupError) {
    console.error('Error fetching documents:', dupError.message);
    Deno.exit(1);
  }

  // Group by document_entity_id
  const grouped = new Map<string, any[]>();
  duplicates?.forEach(doc => {
    const key = doc.document_entity_id;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(doc);
  });

  const duplicatesMap = Array.from(grouped.entries())
    .filter(([_, docs]) => docs.length > 1);

  if (duplicatesMap.length === 0) {
    console.log('✅ No duplicates found\n');
  } else {
    console.log(`Found ${duplicatesMap.length} document_entity_id with duplicates\n`);

    // Delete duplicates (keep most recent)
    console.log('Step 2: Deleting duplicates (keeping most recent)...');
    for (const [entityId, docs] of duplicatesMap) {
      // Sort by updated_at descending
      docs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      // Keep first, delete rest
      const toDelete = docs.slice(1);
      for (const doc of toDelete) {
        console.log(`  Deleting ${doc.id} (keeping ${docs[0].id})`);
        const { error } = await supabase
          .from('user_documents')
          .delete()
          .eq('id', doc.id);
        if (error) {
          console.error(`    Error: ${error.message}`);
        }
      }
    }
    console.log('✅ Duplicates deleted\n');
  }

  console.log('Done! Now you can add the unique constraint manually in SQL.');
}

main();
