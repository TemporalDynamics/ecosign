#!/usr/bin/env node
/**
 * RLS PostgREST Test - WORKING VERSION
 *
 * Tests que SÍ funcionan contra el esquema real de EcoSign
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

// Test IDs
const OWNER_ID = '11111111-1111-1111-1111-111111111111';
const ATTACKER_ID = '22222222-2222-2222-2222-222222222222';
const DOC_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ANCHOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function signJwt(userId) {
  return jwt.sign(
    { sub: userId, role: 'authenticated' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '60s' }
  );
}

async function createAuthUser(userId, email) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: { test: true },
      id: userId
    });

    if (error) {
      console.log(`   ⚠️  User creation: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Auth user created: ${email}`);
    return true;
  } catch (err) {
    console.log(`   ⚠️  Auth error: ${err.message}`);
    return false;
  }
}

async function createUserDocument(docId, ownerId) {
  const { data, error } = await supabase
    .from('user_documents')
    .insert({
      id: docId,
      user_id: ownerId,
      document_name: 'test-rls.pdf',
      document_hash: 'a'.repeat(64),
      document_size: 1024,
      eco_data: { test: true },
      overall_status: 'draft'
    })
    .select()
    .single();

  if (error) {
    console.log(`   ❌ Document creation failed: ${error.message}`);
    return null;
  }

  console.log(`   ✅ Document created`);
  return data;
}

async function createAnchor(anchorId, docId, ownerId) {
  const { data, error } = await supabase
    .from('anchors')
    .insert({
      id: anchorId,
      user_document_id: docId,
      user_id: ownerId,
      document_hash: 'a'.repeat(64),
      anchor_type: 'polygon',
      polygon_tx_hash: '0x' + 'a'.repeat(64),
      polygon_status: 'pending'
    })
    .select()
    .single();

  if (error) {
    console.log(`   ❌ Anchor creation failed: ${error.message}`);
    return null;
  }

  console.log(`   ✅ Anchor created`);
  return data;
}

async function queryAsUser(userId, table, docId) {
  // Create a client with the user's JWT
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${signJwt(userId)}`
      }
    }
  });

  const { data, error } = await userClient
    .from(table)
    .select('*')
    .eq('id', docId);

  if (error) {
    return { found: false, error };
  }

  return { found: Array.isArray(data) && data.length > 0, data };
}

async function cleanup() {
  // Cleanup in correct order (foreign keys)
  await supabase.from('anchors').delete().eq('id', ANCHOR_ID);
  await supabase.from('user_documents').delete().eq('id', DOC_ID);
  await supabase.auth.admin.deleteUser(OWNER_ID);
  await supabase.auth.admin.deleteUser(ATTACKER_ID);
}

(async function main() {
  console.log('\n🧪 RLS PostgREST Test - Working Version');
  console.log('Date:', new Date().toISOString());
  console.log('URL:', SUPABASE_URL);
  console.log('─'.repeat(70));

  try {
    // 1. Create auth users
    console.log('\n1️⃣  Creating auth users...');
    await createAuthUser(OWNER_ID, 'owner@test.com');
    await createAuthUser(ATTACKER_ID, 'attacker@test.com');

    // 2. Create document (as owner)
    console.log('\n2️⃣  Creating test document (via service role)...');
    const doc = await createUserDocument(DOC_ID, OWNER_ID);
    if (!doc) {
      throw new Error('Failed to create document');
    }

    // 3. Create anchor
    console.log('\n3️⃣  Creating test anchor (via service role)...');
    const anchor = await createAnchor(ANCHOR_ID, DOC_ID, OWNER_ID);
    if (!anchor) {
      throw new Error('Failed to create anchor');
    }

    // 4. Test Owner Access
    console.log('\n4️⃣  Testing OWNER access (should see documents)...');
    const ownerDoc = await queryAsUser(OWNER_ID, 'user_documents', DOC_ID);
    const ownerAnchor = await queryAsUser(OWNER_ID, 'anchors', ANCHOR_ID);

    console.log(`   Documents: ${ownerDoc.found ? '✅ Found' : '❌ Blocked by RLS'}`);
    console.log(`   Anchors:   ${ownerAnchor.found ? '✅ Found' : '❌ Blocked by RLS'}`);

    // 5. Test Attacker Access
    console.log('\n5️⃣  Testing ATTACKER access (should NOT see documents)...');
    const attackerDoc = await queryAsUser(ATTACKER_ID, 'user_documents', DOC_ID);
    const attackerAnchor = await queryAsUser(ATTACKER_ID, 'anchors', ANCHOR_ID);

    console.log(`   Documents: ${!attackerDoc.found ? '✅ Blocked (RLS working)' : '❌ SECURITY ISSUE'}`);
    console.log(`   Anchors:   ${!attackerAnchor.found ? '✅ Blocked (RLS working)' : '❌ SECURITY ISSUE'}`);

    // 6. Cleanup
    console.log('\n6️⃣  Cleaning up test data...');
    await cleanup();
    console.log('   ✅ Cleanup done');

    // Summary
    console.log('\n' + '─'.repeat(70));
    console.log('📊 RLS Test Summary:\n');

    const ownerCanAccess = ownerDoc.found && ownerAnchor.found;
    const attackerBlocked = !attackerDoc.found && !attackerAnchor.found;

    if (ownerCanAccess && attackerBlocked) {
      console.log('✅ RLS POLICIES ARE WORKING CORRECTLY');
      console.log('   ✓ Owner can access their documents');
      console.log('   ✓ Attacker is blocked from accessing owner documents');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ RLS ISSUES DETECTED');
      if (!ownerCanAccess) {
        console.log('   ✗ Owner cannot access their own documents (too restrictive)');
      }
      if (!attackerBlocked) {
        console.log('   ✗ Attacker can access owner documents (SECURITY ISSUE)');
      }
      console.log('');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await cleanup();
    process.exit(1);
  }
})();
