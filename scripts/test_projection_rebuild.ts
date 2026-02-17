/**
 * Projection Rebuild Test
 * 
 * Verifies: user_documents is fully derivable from events[]
 * 
 * Run: deno run --allow-env --allow-net scripts/test_projection_rebuild.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Projection Rebuild Test ===\n');

  // Step 1: Find documents with anchor.confirmed events
  console.log('Step 1: Finding documents with anchor.confirmed events...');
  const { data: documents, error: docError } = await supabase
    .from('document_entities')
    .select('id, witness_hash, events, user_documents!inner(overall_status, has_polygon_anchor, has_bitcoin_anchor, download_enabled)')
    .not('events', 'is', null)
    .limit(5);

  if (docError) {
    console.error('❌ Error fetching documents:', docError.message);
    Deno.exit(1);
  }

  if (!documents || documents.length === 0) {
    console.log('⚠️  No documents with events found. Skipping test.');
    Deno.exit(0);
  }

  console.log(`✅ Found ${documents.length} documents with events\n`);

  // Step 2: Pick first document for testing
  const testDoc = documents[0];
  const beforeState = {
    id: testDoc.id,
    overall_status: testDoc.user_documents?.overall_status,
    has_polygon_anchor: testDoc.user_documents?.has_polygon_anchor,
    has_bitcoin_anchor: testDoc.user_documents?.has_bitcoin_anchor,
    download_enabled: testDoc.user_documents?.download_enabled,
  };

  console.log('Step 2: Test document selected:');
  console.log(`  ID: ${beforeState.id}`);
  console.log(`  overall_status: ${beforeState.overall_status}`);
  console.log(`  has_polygon_anchor: ${beforeState.has_polygon_anchor}`);
  console.log(`  has_bitcoin_anchor: ${beforeState.has_bitcoin_anchor}`);
  console.log(`  download_enabled: ${beforeState.download_enabled}\n`);

  // Step 3: DELETE user_documents
  console.log('Step 3: Deleting user_documents for test document...');
  const { error: deleteError } = await supabase
    .from('user_documents')
    .delete()
    .eq('document_entity_id', beforeState.id);

  if (deleteError) {
    console.error('❌ Error deleting user_documents:', deleteError.message);
    Deno.exit(1);
  }
  console.log('✅ Deleted\n');

  // Step 4: Trigger projection by touching events[]
  console.log('Step 4: Triggering projection via UPDATE events...');
  const { error: updateError } = await supabase
    .from('document_entities')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', beforeState.id);

  if (updateError) {
    console.error('❌ Error updating document_entities:', updateError.message);
    Deno.exit(1);
  }
  console.log('✅ Triggered\n');

  // Step 5: Verify rebuilt state
  console.log('Step 5: Verifying rebuilt state...');
  const { data: afterData, error: afterError } = await supabase
    .from('user_documents')
    .select('overall_status, has_polygon_anchor, has_bitcoin_anchor, download_enabled')
    .eq('document_entity_id', beforeState.id)
    .single();

  if (afterError) {
    console.error('❌ Error fetching rebuilt user_documents:', afterError.message);
    Deno.exit(1);
  }

  const afterState = {
    overall_status: afterData?.overall_status,
    has_polygon_anchor: afterData?.has_polygon_anchor,
    has_bitcoin_anchor: afterData?.has_bitcoin_anchor,
    download_enabled: afterData?.download_enabled,
  };

  console.log('Rebuilt state:');
  console.log(`  overall_status: ${afterState.overall_status}`);
  console.log(`  has_polygon_anchor: ${afterState.has_polygon_anchor}`);
  console.log(`  has_bitcoin_anchor: ${afterState.has_bitcoin_anchor}`);
  console.log(`  download_enabled: ${afterState.download_enabled}\n`);

  // Step 6: Compare before/after
  console.log('Step 6: Comparing before/after...');
  const matches = 
    beforeState.overall_status === afterState.overall_status &&
    beforeState.has_polygon_anchor === afterState.has_polygon_anchor &&
    beforeState.has_bitcoin_anchor === afterState.has_bitcoin_anchor &&
    beforeState.download_enabled === afterState.download_enabled;

  if (matches) {
    console.log('✅ PROJECTION TEST PASSED: user_documents rebuilt correctly\n');
    console.log('🎉 Authority is closed: events[] → user_documents works!');
  } else {
    console.log('❌ PROJECTION TEST FAILED: state mismatch\n');
    console.log('Before:', beforeState);
    console.log('After:', afterState);
    Deno.exit(1);
  }
}

main();
