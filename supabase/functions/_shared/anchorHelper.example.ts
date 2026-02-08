/**
 * EXAMPLE: How to integrate anchorHelper into existing edge functions
 *
 * This file shows how anchor-polygon and anchor-bitcoin edge functions
 * should call appendAnchorEventFromEdge() after confirming the anchor.
 *
 * DO NOT import this file. It's documentation only.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.42.0';
import { appendAnchorEventFromEdge } from './anchorHelper.ts';

// =============================================================================
// EXAMPLE 1: anchor-polygon edge function
// =============================================================================

async function anchorPolygonExample() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  // ... existing code that submits transaction to Polygon ...

  // STEP 1: Get document entity to read witness_hash
  const { data: entity, error: fetchError } = await supabase
    .from('document_entities')
    .select('id, witness_hash')
    .eq('id', documentEntityId) // From request body
    .single();

  if (fetchError || !entity) {
    return { success: false, error: 'Document entity not found' };
  }

  // STEP 2: Submit transaction to Polygon (existing code)
  const txHash = '0x...'; // From Polygon RPC response

  // STEP 3: Insert into anchors table (existing code - keep for now)
  const { data: anchor } = await supabase
    .from('anchors')
    .insert({
      document_hash: entity.witness_hash, // NOTE: Should be witness_hash
      anchor_type: 'polygon',
      anchor_status: 'pending',
      polygon_tx_hash: txHash,
      polygon_status: 'pending',
    })
    .select()
    .single();

  // STEP 4: Return immediately (anchor will be confirmed by worker)
  return {
    success: true,
    anchorId: anchor.id,
    txHash: txHash,
  };
}

// =============================================================================
// EXAMPLE 2: process-polygon-anchors worker (confirmation)
// =============================================================================

async function processPolygonAnchorsExample() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  // ... fetch pending anchors ...
  // ... check transaction receipt on Polygon RPC ...

  // When transaction is confirmed:
  const receipt = {
    transactionHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    blockNumber: 52341567,
    blockHash: '0x...',
    status: 1, // Success
  };

  const confirmedAt = new Date().toISOString();

  // STEP 1: Update legacy tables (atomic transaction - keep existing code)
  await supabase.rpc('anchor_polygon_atomic_tx', {
    _anchor_id: anchorId,
    _anchor_user_id: userId,
    _tx_hash: receipt.transactionHash,
    _block_number: receipt.blockNumber,
    _block_hash: receipt.blockHash,
    _confirmed_at: confirmedAt,
    _metadata: {},
    _user_document_updates: {},
    _polygon_attempts: 1,
  });

  // STEP 2: ✅ NEW - Append canonical event
  const result = await appendAnchorEventFromEdge(supabase, documentEntityId, {
    network: 'polygon',
    witness_hash: witnessHash, // From document_entities
    txid: receipt.transactionHash,
    block_height: receipt.blockNumber,
    confirmed_at: confirmedAt,
  });

  if (!result.success) {
    console.error('Failed to append anchor event:', result.error);
    // NOTE: Legacy tables are already updated, so this is non-critical
    // But we should log for monitoring
  } else {
    console.log('✅ Anchor event appended to events[]');
  }

  // STEP 3: Update protection level (existing code)
  await supabase.rpc('upgrade_protection_level', { doc_id: documentEntityId });

  // STEP 4: Send notification (existing code)
  await supabase.from('workflow_notifications').insert({
    // ... notification data ...
  });
}

// =============================================================================
// EXAMPLE 3: process-bitcoin-anchors worker (confirmation)
// =============================================================================

async function processBitcoinAnchorsExample() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  // ... fetch pending anchors ...
  // ... verify OpenTimestamps proof ...

  // When proof is confirmed:
  const proofData = {
    bitcoinTxId: 'batch-2026-01-06-12345', // OTS batch identifier
    blockHeight: 825432,
    otsProof: 'base64...', // Full OTS proof
  };

  const confirmedAt = new Date().toISOString();

  // STEP 1: Update legacy tables (atomic transaction - keep existing code)
  await supabase.rpc('anchor_atomic_tx', {
    _anchor_id: anchorId,
    _anchor_user_id: userId,
    _ots: otsProofBytes,
    _metadata: {
      bitcoin_tx_id: proofData.bitcoinTxId,
      bitcoin_block_height: proofData.blockHeight,
    },
    _user_document_updates: {},
    _bitcoin_attempts: attempts,
  });

  // STEP 2: ✅ NEW - Append canonical event
  const result = await appendAnchorEventFromEdge(supabase, documentEntityId, {
    network: 'bitcoin',
    witness_hash: witnessHash, // From document_entities
    txid: proofData.bitcoinTxId,
    block_height: proofData.blockHeight,
    confirmed_at: confirmedAt,
  });

  if (!result.success) {
    console.error('Failed to append anchor event:', result.error);
    // Non-critical: legacy tables are updated
  } else {
    console.log('✅ Bitcoin anchor event appended to events[]');
  }

  // STEP 3: Update protection level (existing code)
  await supabase.rpc('upgrade_protection_level', { doc_id: documentEntityId });

  // STEP 4: Send notification (existing code)
  await supabase.from('workflow_notifications').insert({
    // ... notification data ...
  });
}

// =============================================================================
// EXAMPLE 4: Idempotence (retry safety)
// =============================================================================

async function idempotenceExample() {
  const supabase = createClient('...', '...');

  // First call: registers event
  const result1 = await appendAnchorEventFromEdge(supabase, 'doc-id', {
    network: 'polygon',
    witness_hash: 'abc123...',
    txid: '0x9a8b...',
    block_height: 52341567,
    confirmed_at: '2026-01-06T03:14:58.000Z',
  });
  // result1.success === true

  // Second call: same network + same txid (e.g., worker retry)
  const result2 = await appendAnchorEventFromEdge(supabase, 'doc-id', {
    network: 'polygon',
    witness_hash: 'abc123...',
    txid: '0x9a8b...', // Same txid
    block_height: 52341567,
    confirmed_at: '2026-01-06T03:14:58.000Z',
  });
  // result2.success === true (idempotent, no duplicate)

  // Third call: same network + DIFFERENT txid (violation)
  const result3 = await appendAnchorEventFromEdge(supabase, 'doc-id', {
    network: 'polygon',
    witness_hash: 'abc123...',
    txid: '0xDIFFERENT', // Different txid
    block_height: 99999999,
    confirmed_at: '2026-01-06T10:00:00.000Z',
  });
  // result3.success === false
  // result3.error === "Anchor already exists for network polygon..."
}

// =============================================================================
// EXAMPLE 5: witness_hash validation
// =============================================================================

async function witnessHashValidationExample() {
  const supabase = createClient('...', '...');

  // Document has witness_hash = "abc123..."
  // Attempt to anchor with DIFFERENT hash (WRONG!)
  const result = await appendAnchorEventFromEdge(supabase, 'doc-id', {
    network: 'polygon',
    witness_hash: 'WRONG_HASH', // ❌ Does not match document_entities.witness_hash
    txid: '0x...',
    confirmed_at: '2026-01-06T03:14:58.000Z',
  });

  // result.success === false
  // result.error === "Anchor witness_hash mismatch: expected abc123..., got WRONG_HASH"
}

// =============================================================================
// MIGRATION STRATEGY
// =============================================================================

/**
 * Phase 1: Dual-write (NOW)
 * - Keep all legacy code (anchors table, atomic functions)
 * - Add appendAnchorEventFromEdge() after confirmation
 * - If append fails, log error but don't fail the operation
 * - UI reads from events[] with fallback to legacy
 *
 * Phase 2: Canonical-first (LATER)
 * - UI reads ONLY from events[]
 * - Legacy tables are write-only (for audit/debugging)
 *
 * Phase 3: Deprecation (FUTURE)
 * - Stop writing to anchor_states
 * - anchors table becomes transactional detail only
 * - events[] is single source of truth
 */
