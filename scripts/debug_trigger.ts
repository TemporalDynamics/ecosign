/**
 * Debug: Check if trigger exists and fires
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Checking trigger status ===\n');

  // Check if trigger exists
  const { data: triggers, error: trigError } = await supabase
    .from('information_schema.triggers')
    .select('trigger_name, event_manipulation, action_statement')
    .ilike('trigger_name', '%project%');

  if (trigError) {
    console.error('Error checking triggers:', trigError.message);
  } else {
    console.log('Triggers:', JSON.stringify(triggers, null, 2));
  }

  // Check if function exists
  const { data: functions, error: funcError } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_type')
    .eq('routine_name', 'project_events_to_user_document');

  if (funcError) {
    console.error('Error checking functions:', funcError.message);
  } else {
    console.log('\nFunctions:', JSON.stringify(functions, null, 2));
  }

  // Manual test: update events with a new event and check if user_documents is created
  console.log('\n=== Manual trigger test ===');
  
  // Find a document with document_entity_id
  const { data: docs } = await supabase
    .from('document_entities')
    .select('id, events')
    .limit(1);

  if (!docs || docs.length === 0) {
    console.log('No documents found');
    return;
  }

  const testDoc = docs[0];
  console.log(`Test document: ${testDoc.id}`);
  
  // Add a test event
  const newEvent = {
    kind: 'test.event',
    at: new Date().toISOString(),
    payload: { test: true }
  };
  
  const currentEvents = Array.isArray(testDoc.events) ? testDoc.events : [];
  const updatedEvents = [...currentEvents, newEvent];

  console.log('Adding test event...');
  const { error: updateError } = await supabase
    .from('document_entities')
    .update({ events: updatedEvents })
    .eq('id', testDoc.id);

  if (updateError) {
    console.error('Error updating events:', updateError.message);
  } else {
    console.log('✅ Events updated');
    
    // Check if user_documents was created/updated
    const { data: ud } = await supabase
      .from('user_documents')
      .select('*')
      .eq('document_entity_id', testDoc.id);

    console.log('user_documents after update:', JSON.stringify(ud, null, 2));
  }
}

main();
