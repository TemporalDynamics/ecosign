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
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';
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
      .select('id, witness_hash, source_hash, events')
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
    const existingAnchor = events.find((e: any) => {
      if (!e || (e.kind !== 'anchor' && e.kind !== 'anchor.confirmed')) return false;
      const eventNetwork = e.anchor?.network ?? e.payload?.network ?? null;
      return eventNetwork === network;
    });

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
    // STEP 3: Fetch anchor data from anchors table
    // ============================================================================
    let anchorData: AnchorData | null = null;

    if (network === 'polygon') {
      const { data: anchor, error: anchorError } = await supabaseAdmin
        .from('anchors')
        .select('id, polygon_tx_hash, polygon_block_number, polygon_confirmed_at, confirmed_at, metadata, document_hash')
        .eq('document_entity_id', documentEntityId)
        .eq('anchor_type', 'polygon')
        .eq('anchor_status', 'confirmed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anchorError || !anchor) {
        return jsonResponse({
          error: 'No confirmed polygon anchor found',
          document_entity_id: documentEntityId,
          details: anchorError?.message
        }, 404);
      }

      const metadata = (anchor.metadata as Record<string, any> | null) ?? {};
      const confirmedAt = anchor.polygon_confirmed_at || anchor.confirmed_at || metadata.confirmed_at || null;
      if (!confirmedAt) {
        return jsonResponse({
          error: 'No polygon confirmation timestamp found',
          document_entity_id: documentEntityId,
          anchor_id: anchor.id,
        }, 404);
      }

      anchorData = {
        anchor_id: anchor.id,
        txid: anchor.polygon_tx_hash || metadata.txid || 'unknown',
        block_number: anchor.polygon_block_number,
        confirmed_at: confirmedAt,
        witness_hash: documentEntity.witness_hash || documentEntity.source_hash || anchor.document_hash
      };
    } else if (network === 'bitcoin') {
      const { data: anchor, error: anchorError } = await supabaseAdmin
        .from('anchors')
        .select('id, metadata, bitcoin_tx_id, bitcoin_block_height, confirmed_at, document_hash')
        .eq('document_entity_id', documentEntityId)
        .in('anchor_type', ['bitcoin', 'opentimestamps'])
        .eq('anchor_status', 'confirmed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anchorError || !anchor) {
        return jsonResponse({
          error: 'No confirmed bitcoin anchor found',
          document_entity_id: documentEntityId,
          details: anchorError?.message
        }, 404);
      }

      const metadata = anchor.metadata as Record<string, any> || {};
      const confirmedAt = anchor.confirmed_at || metadata.confirmed_at || null;

      if (!confirmedAt) {
        return jsonResponse({
          error: 'No bitcoin confirmation timestamp found',
          document_entity_id: documentEntityId,
          anchor_id: anchor.id,
        }, 404);
      }

      anchorData = {
        anchor_id: anchor.id,
        txid: anchor.bitcoin_tx_id || metadata.bitcoin_tx || metadata.txid || 'unknown',
        block_number: anchor.bitcoin_block_height || metadata.block || null,
        confirmed_at: confirmedAt,
        witness_hash: documentEntity.witness_hash || documentEntity.source_hash || anchor.document_hash
      };
    }

    if (!anchorData) {
      return jsonResponse({
        error: 'Failed to resolve anchor data',
        document_entity_id: documentEntityId
      }, 500);
    }

    if (!anchorData.witness_hash) {
      return jsonResponse({
        error: 'Missing witness_hash for anchor repair',
        document_entity_id: documentEntityId,
        anchor_id: anchorData.anchor_id,
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
      supabaseAdmin as any,
      documentEntityId,
      {
        network: network,
        witness_hash: anchorData.witness_hash,
        txid: anchorData.txid,
        block_height: anchorData.block_number || undefined,
        confirmed_at: anchorData.confirmed_at
      },
      'repair-missing-anchor-events'
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
