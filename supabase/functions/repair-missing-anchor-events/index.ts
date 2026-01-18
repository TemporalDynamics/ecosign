/**
 * Edge Function: Repair Missing Anchor Events
 *
 * Purpose: Manual repair of dual-write inconsistencies
 * Priority: P0.3 (ÚLTIMO GAP PROBATORIO)
 *
 * Gap: Legacy says "anchor confirmed" but events[] is empty
 * Strategy: Controlled manual repair (admin-only, explicit dry_run)
 *
 * Contract: docs/contratos/ANCHOR_EVENT_RULES.md
 *
 * ⚠️ CRITICAL RULES:
 * - NO bypasses triggers
 * - NO creates "special" events
 * - NO edits legacy tables
 * - NO changes protection_level
 * - MUST validate witness_hash
 * - MUST respect idempotence
 * - MUST log explicitly (who, when, why)
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { appendAnchorEventFromEdge } from '../_shared/anchorHelper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });

interface RepairRequest {
  document_entity_id: string;
  network: 'polygon' | 'bitcoin';
  dry_run?: boolean;
}

interface AnchorData {
  anchor_id: string;
  txid: string;
  block_number: number | null;
  confirmed_at: string;
  witness_hash: string;
}

serve(async (req) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
  }

  // ============================================================================
  // AUTH: Admin-only (service role required)
  // ============================================================================
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(supabaseServiceKey!)) {
    return jsonResponse({
      error: 'Unauthorized',
      message: 'This endpoint is admin-only. Service role key required.'
    }, 401);
  }

  try {
    const body: RepairRequest = await req.json();

    // Validate input
    if (!body.document_entity_id) {
      return jsonResponse({ error: 'Missing document_entity_id' }, 400);
    }

    if (!body.network || !['polygon', 'bitcoin'].includes(body.network)) {
      return jsonResponse({ error: 'Invalid network. Must be "polygon" or "bitcoin"' }, 400);
    }

    const dryRun = body.dry_run !== false; // Default to true for safety
    const network = body.network;
    const documentEntityId = body.document_entity_id;

    console.log(`[REPAIR] Starting repair for ${documentEntityId} (${network}) - dry_run=${dryRun}`);

    // ============================================================================
    // STEP 1: Fetch document_entity (canonical source)
    // ============================================================================
    const { data: documentEntity, error: docError } = await supabaseAdmin
      .from('document_entities')
      .select('id, witness_hash, events')
      .eq('id', documentEntityId)
      .single();

    if (docError || !documentEntity) {
      return jsonResponse({
        error: 'Document entity not found',
        document_entity_id: documentEntityId,
        details: docError?.message
      }, 404);
    }

    // ============================================================================
    // STEP 2: Check if anchor event already exists (idempotence)
    // ============================================================================
    const events = Array.isArray(documentEntity.events) ? documentEntity.events : [];
    const existingAnchor = events.find(
      (e: any) => e.kind === 'anchor' && e.anchor?.network === network
    );

    if (existingAnchor) {
      return jsonResponse({
        success: true,
        already_exists: true,
        message: `Anchor event for ${network} already exists`,
        document_entity_id: documentEntityId,
        existing_event: existingAnchor,
        dry_run: dryRun
      });
    }

    // ============================================================================
    // STEP 3: Fetch anchor data from legacy tables
    // ============================================================================
    let anchorData: AnchorData | null = null;

    if (network === 'polygon') {
      const { data: anchors, error: anchorError } = await supabaseAdmin
        .from('anchors')
        .select('id, polygon_tx_hash, polygon_block_number, polygon_confirmed_at')
        .eq('anchor_type', 'polygon')
        .eq('anchor_status', 'confirmed')
        .not('polygon_confirmed_at', 'is', null)
        .limit(1);

      if (anchorError || !anchors || anchors.length === 0) {
        return jsonResponse({
          error: 'No confirmed polygon anchor found in legacy tables',
          document_entity_id: documentEntityId,
          details: anchorError?.message
        }, 404);
      }

      const anchor = anchors[0];
      anchorData = {
        anchor_id: anchor.id,
        txid: anchor.polygon_tx_hash,
        block_number: anchor.polygon_block_number,
        confirmed_at: anchor.polygon_confirmed_at,
        witness_hash: documentEntity.witness_hash
      };
    } else if (network === 'bitcoin') {
      // Bitcoin data is stored across anchors table and user_documents table
      const { data: anchors, error: anchorError } = await supabaseAdmin
        .from('anchors')
        .select('id, metadata, user_document_id')
        .eq('anchor_type', 'bitcoin')
        .eq('anchor_status', 'confirmed')
        .limit(1);

      if (anchorError || !anchors || anchors.length === 0) {
        return jsonResponse({
          error: 'No confirmed bitcoin anchor found in legacy tables',
          document_entity_id: documentEntityId,
          details: anchorError?.message
        }, 404);
      }

      const anchor = anchors[0];
      const metadata = anchor.metadata as Record<string, any> || {};

      // Get confirmation timestamp from user_documents (where it's actually stored)
      const { data: userDoc, error: userDocError } = await supabaseAdmin
        .from('user_documents')
        .select('bitcoin_confirmed_at')
        .eq('id', anchor.user_document_id)
        .single();

      if (userDocError || !userDoc || !userDoc.bitcoin_confirmed_at) {
        return jsonResponse({
          error: 'No bitcoin confirmation timestamp found',
          document_entity_id: documentEntityId,
          anchor_id: anchor.id,
          details: userDocError?.message
        }, 404);
      }

      anchorData = {
        anchor_id: anchor.id,
        txid: metadata.bitcoin_tx || 'unknown',
        block_number: metadata.block || null,
        confirmed_at: userDoc.bitcoin_confirmed_at,
        witness_hash: documentEntity.witness_hash
      };
    }

    if (!anchorData) {
      return jsonResponse({
        error: 'Failed to resolve anchor data',
        document_entity_id: documentEntityId
      }, 500);
    }

    // ============================================================================
    // STEP 4: DRY RUN - Stop here if dry_run=true
    // ============================================================================
    if (dryRun) {
      return jsonResponse({
        success: true,
        dry_run: true,
        message: 'Dry run successful. No mutations performed.',
        would_create_event: {
          kind: 'anchor',
          network: network,
          witness_hash: anchorData.witness_hash,
          txid: anchorData.txid,
          block_height: anchorData.block_number,
          confirmed_at: anchorData.confirmed_at
        },
        document_entity_id: documentEntityId,
        anchor_id: anchorData.anchor_id
      });
    }

    // ============================================================================
    // STEP 5: REPAIR - Append anchor event (canonical helper)
    // ============================================================================
    const repairResult = await appendAnchorEventFromEdge(
      supabaseAdmin,
      documentEntityId,
      {
        network: network,
        witness_hash: anchorData.witness_hash,
        txid: anchorData.txid,
        block_height: anchorData.block_number || undefined,
        confirmed_at: anchorData.confirmed_at
      }
    );

    if (!repairResult.success) {
      return jsonResponse({
        error: 'Repair failed',
        document_entity_id: documentEntityId,
        anchor_id: anchorData.anchor_id,
        details: repairResult.error
      }, 500);
    }

    // ============================================================================
    // STEP 6: LOG REPAIR (audit trail)
    // ============================================================================
    console.log(JSON.stringify({
      event: 'anchor_event_repaired',
      document_entity_id: documentEntityId,
      network: network,
      anchor_id: anchorData.anchor_id,
      txid: anchorData.txid,
      block_height: anchorData.block_number,
      confirmed_at: anchorData.confirmed_at,
      repaired_at: new Date().toISOString(),
      dry_run: false
    }));

    // ============================================================================
    // SUCCESS
    // ============================================================================
    return jsonResponse({
      success: true,
      repaired: true,
      message: `Anchor event for ${network} successfully repaired`,
      document_entity_id: documentEntityId,
      anchor_id: anchorData.anchor_id,
      event_created: {
        kind: 'anchor',
        network: network,
        txid: anchorData.txid,
        block_height: anchorData.block_number,
        confirmed_at: anchorData.confirmed_at
      },
      dry_run: false
    });

  } catch (error) {
    console.error('[REPAIR] Fatal error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
