// P1-3: Health check for anchoring infrastructure
// Tests calendar servers, RPC providers, and database connectivity

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { ethers } from 'npm:ethers@6.9.0'
import { createLogger } from '../_shared/logger.ts'

const logger = createLogger('anchoring-health-check')

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}

interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: HealthCheck
    polygonRpc: HealthCheck
    bitcoinCalendars: HealthCheck
    mempoolApi: HealthCheck
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { data, error } = await supabase
      .from('anchors')
      .select('id')
      .limit(1)
    
    const latencyMs = Date.now() - startTime
    
    if (error) {
      return {
        status: 'unhealthy',
        latencyMs,
        error: error.message
      }
    }
    
    return {
      status: 'healthy',
      latencyMs
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function checkPolygonRpc(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const rpcUrl = Deno.env.get('POLYGON_RPC_URL') ?? Deno.env.get('ALCHEMY_RPC_URL')
    
    if (!rpcUrl) {
      return {
        status: 'unhealthy',
        error: 'POLYGON_RPC_URL not configured'
      }
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const blockNumber = await provider.getBlockNumber()
    
    const latencyMs = Date.now() - startTime
    
    // Check if block number is recent (within 5 minutes)
    const block = await provider.getBlock(blockNumber)
    const blockAge = Date.now() / 1000 - (block?.timestamp ?? 0)
    
    if (blockAge > 300) {
      return {
        status: 'degraded',
        latencyMs,
        details: {
          blockNumber,
          blockAgeSeconds: blockAge,
          warning: 'Block is older than 5 minutes'
        }
      }
    }
    
    return {
      status: 'healthy',
      latencyMs,
      details: {
        blockNumber,
        blockAgeSeconds: blockAge
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

async function checkBitcoinCalendars(): Promise<HealthCheck> {
  const calendars = [
    'https://a.pool.opentimestamps.org',
    'https://b.pool.opentimestamps.org',
    'https://finney.calendar.eternitywall.com'
  ]
  
  const startTime = Date.now()
  const results: Record<string, boolean> = {}
  
  for (const calendar of calendars) {
    try {
      // Try to fetch timestamp (simple health check)
      const response = await fetch(`${calendar}/timestamp`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      results[calendar] = response.ok
    } catch {
      results[calendar] = false
    }
  }
  
  const latencyMs = Date.now() - startTime
  const healthyCount = Object.values(results).filter(Boolean).length
  
  if (healthyCount === 0) {
    return {
      status: 'unhealthy',
      latencyMs,
      error: 'All calendar servers are down',
      details: results
    }
  }
  
  if (healthyCount < calendars.length) {
    return {
      status: 'degraded',
      latencyMs,
      details: {
        ...results,
        healthyCount,
        totalCount: calendars.length
      }
    }
  }
  
  return {
    status: 'healthy',
    latencyMs,
    details: results
  }
}

async function checkMempoolApi(): Promise<HealthCheck> {
  const startTime = Date.now()
  const mempoolApiUrl = Deno.env.get('MEMPOOL_API_URL') || 'https://mempool.space/api'
  
  try {
    const response = await fetch(`${mempoolApiUrl}/blocks/tip/height`, {
      signal: AbortSignal.timeout(5000)
    })
    
    const latencyMs = Date.now() - startTime
    
    if (!response.ok) {
      return {
        status: 'degraded',
        latencyMs,
        error: `HTTP ${response.status}`
      }
    }
    
    const height = await response.json()
    
    return {
      status: 'healthy',
      latencyMs,
      details: {
        tipHeight: height
      }
    }
  } catch (error) {
    return {
      status: 'degraded',
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    logger.info('health_check_started')
    
    // Run all checks in parallel
    const [database, polygonRpc, bitcoinCalendars, mempoolApi] = await Promise.all([
      checkDatabase(),
      checkPolygonRpc(),
      checkBitcoinCalendars(),
      checkMempoolApi()
    ])
    
    // Determine overall status
    const checks = { database, polygonRpc, bitcoinCalendars, mempoolApi }
    const statuses = Object.values(checks).map(c => c.status)
    
    let overall: 'healthy' | 'degraded' | 'unhealthy'
    if (statuses.includes('unhealthy')) {
      overall = 'unhealthy'
    } else if (statuses.includes('degraded')) {
      overall = 'degraded'
    } else {
      overall = 'healthy'
    }
    
    const report: HealthReport = {
      overall,
      timestamp: new Date().toISOString(),
      checks
    }
    
    logger.info('health_check_completed', {
      overall,
      databaseLatency: database.latencyMs,
      polygonRpcLatency: polygonRpc.latencyMs,
      bitcoinCalendarsLatency: bitcoinCalendars.latencyMs,
      mempoolApiLatency: mempoolApi.latencyMs
    })
    
    // Return appropriate HTTP status
    const statusCode = overall === 'healthy' ? 200 : overall === 'degraded' ? 200 : 503
    
    return new Response(JSON.stringify(report, null, 2), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    logger.error('health_check_failed', {}, error instanceof Error ? error : new Error(String(error)))
    
    return new Response(JSON.stringify({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 503,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
})
