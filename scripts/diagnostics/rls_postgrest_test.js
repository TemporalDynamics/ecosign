#!/usr/bin/env node
// rls_postgrest_test.js
// Creates JWTs and calls Supabase REST endpoints to validate RLS behavior.
// Usage (after installing deps):
//   export SUPABASE_URL="http://127.0.0.1:54321"
//   export SERVICE_ROLE_KEY="<your service role key>"
//   export SUPABASE_JWT_SECRET="<your jwt secret or service role key>" (optional)
//   export OWNER_ID="<owner user id>" (optional, will pick first user if missing)
//   node scripts/rls_postgrest_test.js

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || SERVICE_ROLE_KEY;
const OWNER_ID = process.env.OWNER_ID; // optional

if (!SERVICE_ROLE_KEY) {
  console.error('SERVICE_ROLE_KEY is required (export SERVICE_ROLE_KEY)');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('SUPABASE_JWT_SECRET or SERVICE_ROLE_KEY must be set to sign JWTs');
  process.exit(1);
}

const DOC_ID = process.env.DOC_ID || 'aaaa0000-0000-0000-0000-000000000001';
const ANCHOR_ID = process.env.ANCHOR_ID || 'bbbb0000-0000-0000-0000-000000000002';

function signJwt(sub) {
  const payload = { sub: String(sub), role: 'authenticated' };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: '60s' });
}

async function serviceInsertDocument() {
  const url = `${SUPABASE_URL}/rest/v1/user_documents`;
  const ownerId = OWNER_ID || '00000000-0000-0000-0000-000000000001';
  const body = {
    id: DOC_ID,
    user_id: ownerId,
    overall_status: 'created',
    eco_data: { test: true }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  console.log('serviceInsertDocument', res.status, text);
}

async function serviceInsertAnchor() {
  const url = `${SUPABASE_URL}/rest/v1/anchors`;
  const ownerId = OWNER_ID || '00000000-0000-0000-0000-000000000001';
  const body = {
    id: ANCHOR_ID,
    user_document_id: DOC_ID,
    user_id: ownerId,
    document_hash: 'doc-hash-1',
    anchor_type: 'polygon',
    polygon_tx_hash: '0x1234567890abcdef',
    polygon_status: 'pending'
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  console.log('serviceInsertAnchor', res.status, text);
}

async function getDocumentWithJwt(token) {
  const url = `${SUPABASE_URL}/rest/v1/user_documents?id=eq.${DOC_ID}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_ROLE_KEY, Accept: 'application/json' } });
  const text = await res.text();
  console.log('GET document', res.status, text);
}

async function getAnchorWithJwt(token) {
  const url = `${SUPABASE_URL}/rest/v1/anchors?id=eq.${ANCHOR_ID}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_ROLE_KEY, Accept: 'application/json' } });
  const text = await res.text();
  console.log('GET anchor', res.status, text);
}

async function deleteViaService() {
  const urlDoc = `${SUPABASE_URL}/rest/v1/user_documents?id=eq.${DOC_ID}`;
  const urlAnchor = `${SUPABASE_URL}/rest/v1/anchors?id=eq.${ANCHOR_ID}`;
  await fetch(urlAnchor, { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } });
  await fetch(urlDoc, { method: 'DELETE', headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: SERVICE_ROLE_KEY } });
  console.log('cleanup done');
}

(async function main(){
  console.log('RLS PostgREST tests -', new Date().toISOString());
  // Insert via service role
  await serviceInsertDocument();
  await serviceInsertAnchor();

  // Owner token
  const ownerId = OWNER_ID || '00000000-0000-0000-0000-000000000001';
  const ownerToken = signJwt(ownerId);
  console.log('Owner JWT:', ownerToken.slice(0,20) + '...');
  await getDocumentWithJwt(ownerToken);
  await getAnchorWithJwt(ownerToken);

  // Attacker token
  const attackerToken = signJwt('00000000-0000-0000-0000-000000000002');
  console.log('Attacker JWT:', attackerToken.slice(0,20) + '...');
  await getDocumentWithJwt(attackerToken);
  await getAnchorWithJwt(attackerToken);

  // Cleanup
  await deleteViaService();

  console.log('Done');
})();
