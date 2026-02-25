// Debug test for RLS
import { test } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTestUser } from '../helpers/supabase-test-helpers';

test('Debug: Can service_role insert documents?', async () => {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn('Skipping debug RLS test: SUPABASE_SERVICE_ROLE_KEY not configured');
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { error } = await adminClient.from('documents').select('id').limit(1);
    if (error) {
      console.warn('Skipping debug RLS test: local Supabase unavailable:', error.message);
      return;
    }
  } catch (err) {
    console.warn('Skipping debug RLS test: local Supabase unavailable:', (err as Error).message);
    return;
  }

  // 1. Create a real test user
  console.log('1. Creating real test user...');
  let testUser;
  try {
    testUser = await createTestUser(
      `debug-${Date.now()}@test.com`,
      'test-password-123'
    );
  } catch (err) {
    console.warn('Skipping debug RLS test: failed to create test user:', (err as Error).message);
    return;
  }
  console.log('   User created:', testUser.userId);

  console.log('2. Attempting insert with service_role...');
  const result = await adminClient
    .from('documents')
    .insert({
      title: 'Debug Test Document',
      owner_id: testUser.userId,
      eco_hash: 'debug_hash_' + Date.now(),
      status: 'active'
    })
    .select();

  console.log('3. Result:', JSON.stringify(result, null, 2));
  
  // Cleanup
  if (result.data && result.data.length > 0) {
    await adminClient.from('documents').delete().eq('id', result.data[0].id);
    console.log('4. ✅ Cleanup successful - service_role works!');
  } else {
    console.log('4. ❌ Insert failed - service_role policy not working');
  }
}, 15000);
