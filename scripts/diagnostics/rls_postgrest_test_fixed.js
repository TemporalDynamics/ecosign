#!/usr/bin/env node
/**
 * RLS PostgREST Test - Fixed Version
 *
 * Tests RLS policies by:
 * 1. Creating test data via service role
 * 2. Testing access with owner JWT
 * 3. Testing access with attacker JWT
 */

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ||
  process.env.JWT_SECRET ||
  'super-secret-jwt-token-with-at-least-32-characters-long';

if (!SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (or SERVICE_ROLE_KEY)');
}

const OWNER_ID = '11111111-0000-0000-0000-000000000001';
const ATTACKER_ID = '22222222-0000-0000-0000-000000000002';
const DOC_ID = 'aaaa0000-0000-0000-0000-000000000001';
const ANCHOR_ID = 'bbbb0000-0000-0000-0000-000000000002';

function signJwt(sub) {
  return jwt.sign(
    { sub: String(sub), role: 'authenticated' },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '60s' }
  );
}

async function createUser(userId, email) {
  const url = `${SUPABASE_URL}/rest/v1/users`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      id: userId,
      email: email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function createDocument() {
  const url = `${SUPABASE_URL}/rest/v1/user_documents`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: DOC_ID,
      user_id: OWNER_ID,
      document_name: 'rls-test-doc.pdf',
      overall_status: 'created',
      eco_data: { test: true }
    })
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function createAnchor() {
  const url = `${SUPABASE_URL}/rest/v1/anchors`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: ANCHOR_ID,
      user_document_id: DOC_ID,
      user_id: OWNER_ID,
      document_hash: 'test-hash-1234567890',
      anchor_type: 'polygon',
      polygon_tx_hash: '0x1234567890abcdef',
      polygon_status: 'pending'
    })
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function queryDocumentsAs(userId) {
  const token = signJwt(userId);
  const url = `${SUPABASE_URL}/rest/v1/user_documents?id=eq.${DOC_ID}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });
  const data = await res.json();
  return { status: res.status, count: data.length };
}

async function queryAnchorsAs(userId) {
  const token = signJwt(userId);
  const url = `${SUPABASE_URL}/rest/v1/anchors?id=eq.${ANCHOR_ID}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });
  const data = await res.json();
  return { status: res.status, count: data.length };
}

async function cleanup() {
  const urlAnchor = `${SUPABASE_URL}/rest/v1/anchors?id=eq.${ANCHOR_ID}`;
  const urlDoc = `${SUPABASE_URL}/rest/v1/user_documents?id=eq.${DOC_ID}`;
  const urlUsers = `${SUPABASE_URL}/rest/v1/users?id=in.(${OWNER_ID},${ATTACKER_ID})`;

  await fetch(urlAnchor, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });

  await fetch(urlDoc, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });

  await fetch(urlUsers, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY
    }
  });
}

(async function main() {
  console.log('\n🧪 RLS PostgREST Tests - Fixed Version');
  console.log('Date:', new Date().toISOString());
  console.log('URL:', SUPABASE_URL);
  console.log('─'.repeat(60));

  // 1. Create test users
  console.log('\n1️⃣ Creating test users...');
  const ownerResult = await createUser(OWNER_ID, 'owner@test.com');
  const attackerResult = await createUser(ATTACKER_ID, 'attacker@test.com');
  console.log('   Owner:', ownerResult.status === 201 ? '✅' : `❌ ${ownerResult.status}`);
  console.log('   Attacker:', attackerResult.status === 201 ? '✅' : `❌ ${attackerResult.status}`);

  // 2. Create document (as owner)
  console.log('\n2️⃣ Creating document via service role...');
  const docResult = await createDocument();
  console.log('   Status:', docResult.status === 201 ? '✅ Created' : `❌ ${docResult.status}`);
  if (docResult.status !== 201) {
    console.log('   Error:', docResult.text);
  }

  // 3. Create anchor (as owner)
  console.log('\n3️⃣ Creating anchor via service role...');
  const anchorResult = await createAnchor();
  console.log('   Status:', anchorResult.status === 201 ? '✅ Created' : `❌ ${anchorResult.status}`);
  if (anchorResult.status !== 201) {
    console.log('   Error:', anchorResult.text);
  }

  // 4. Test RLS: Owner access
  console.log('\n4️⃣ Testing Owner access (should see documents)...');
  const ownerDocAccess = await queryDocumentsAs(OWNER_ID);
  const ownerAnchorAccess = await queryAnchorsAs(OWNER_ID);
  console.log('   Documents:', ownerDocAccess.count > 0 ? `✅ Found ${ownerDocAccess.count}` : `❌ Blocked by RLS`);
  console.log('   Anchors:', ownerAnchorAccess.count > 0 ? `✅ Found ${ownerAnchorAccess.count}` : `❌ Blocked by RLS`);

  // 5. Test RLS: Attacker access
  console.log('\n5️⃣ Testing Attacker access (should NOT see documents)...');
  const attackerDocAccess = await queryDocumentsAs(ATTACKER_ID);
  const attackerAnchorAccess = await queryAnchorsAs(ATTACKER_ID);
  console.log('   Documents:', attackerDocAccess.count === 0 ? `✅ Blocked (RLS working)` : `❌ SECURITY ISSUE: Found ${attackerDocAccess.count}`);
  console.log('   Anchors:', attackerAnchorAccess.count === 0 ? `✅ Blocked (RLS working)` : `❌ SECURITY ISSUE: Found ${attackerAnchorAccess.count}`);

  // 6. Cleanup
  console.log('\n6️⃣ Cleaning up test data...');
  await cleanup();
  console.log('   ✅ Cleanup done');

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('📊 RLS Test Summary:');
  console.log('');
  const rlsWorking = ownerDocAccess.count > 0 && attackerDocAccess.count === 0;
  if (rlsWorking) {
    console.log('✅ RLS POLICIES ARE WORKING CORRECTLY');
    console.log('   - Owner can access their documents ✓');
    console.log('   - Attacker is blocked from accessing owner documents ✓');
  } else {
    console.log('❌ RLS ISSUES DETECTED');
    if (ownerDocAccess.count === 0) {
      console.log('   - Owner cannot access their own documents (too restrictive)');
    }
    if (attackerDocAccess.count > 0) {
      console.log('   - Attacker can access owner documents (SECURITY ISSUE)');
    }
  }
  console.log('');
})();
