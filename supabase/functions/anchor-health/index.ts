/**
 * Anchor Workers Health Check
 * 
 * GET /functions/v1/anchor-health
 * 
 * Returns:
 * - pending_anchors: count of anchors waiting for confirmation
 * - recent_confirmations: anchors confirmed in last X minutes
 * - workers_alive: whether cron/workers are processing
 * 
 * Used for:
 * - Monitoring dashboard
 * - Alerts if system stalls
 * - Health checks
 */

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!supabaseAdmin) {
    return jsonResponse({ error: 'Supabase not configured' }, 500);
  }

  try {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // Pending anchors (not confirmed, not failed)
    const { count: pendingPolygon } = await supabaseAdmin
      .from('anchors')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_type', 'polygon')
      .in('anchor_status', ['pending', 'processing']);

    const { count: pendingBitcoin } = await supabaseAdmin
      .from('anchors')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_type', 'opentimestamps')
      .in('anchor_status', ['pending', 'processing', 'queued']);

    // Recent confirmations (last 10 minutes)
    const { count: recentPolygon } = await supabaseAdmin
      .from('anchors')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_type', 'polygon')
      .eq('anchor_status', 'confirmed')
      .gte('polygon_confirmed_at', tenMinutesAgo);

    const { count: recentBitcoin } = await supabaseAdmin
      .from('anchors')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_type', 'opentimestamps')
      .eq('anchor_status', 'confirmed')
      .gte('confirmed_at', tenMinutesAgo);

    // Stalled: pending for more than 1 hour
    const { count: stalledPolygon } = await supabaseAdmin
      .from('anchors')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_type', 'polygon')
      .in('anchor_status', ['pending', 'processing'])
      .lt('created_at', oneHourAgo);

    const { count: stalledBitcoin } = await supabaseAdmin
      .from('anchors')
      .select('*', { count: 'exact', head: true })
      .eq('anchor_type', 'opentimestamps')
      .in('anchor_status', ['pending', 'processing', 'queued'])
      .lt('created_at', oneHourAgo);

    // Workers alive: check heartbeat table (real-time, not dependent on anchor activity)
    const { data: workers } = await supabaseAdmin
      .from('system_workers')
      .select('name, last_seen_at, status')
      .in('name', ['process-polygon-anchors', 'process-bitcoin-anchors']);

    // Workers alive: ALL workers must be alive (not just ANY)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const workersAlive = workers?.filter((w: any) => w.last_seen_at > fiveMinutesAgo) ?? [];
    const allWorkersAlive = (workers?.length ?? 0) === 2 && workersAlive.length === 2;
    const workersStatus = workers?.reduce((acc: any, w: any) => {
      acc[w.name] = {
        last_seen_at: w.last_seen_at,
        status: w.last_seen_at > fiveMinutesAgo ? 'alive' : 'stalled'
      };
      return acc;
    }, {} as Record<string, { last_seen_at: string; status: string }>) ?? {};

    const health = {
      timestamp: now.toISOString(),
      workers_alive: allWorkersAlive,
      workers: workersStatus,
      pending: {
        polygon: pendingPolygon ?? 0,
        bitcoin: pendingBitcoin ?? 0,
        total: (pendingPolygon ?? 0) + (pendingBitcoin ?? 0),
      },
      recent_confirmations: {
        polygon: recentPolygon ?? 0,
        bitcoin: recentBitcoin ?? 0,
      },
      stalled: {
        polygon: stalledPolygon ?? 0,
        bitcoin: stalledBitcoin ?? 0,
      },
      alert: (stalledPolygon ?? 0) > 10 || (stalledBitcoin ?? 0) > 10 || !allWorkersAlive,
    };

    return jsonResponse(health);
  } catch (err) {
    return jsonResponse({ 
      error: err instanceof Error ? err.message : String(err),
      workers_alive: false,
      workers: {} 
    }, 500);
  }
});
