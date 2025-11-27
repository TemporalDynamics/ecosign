// ============================================
// Edge Function: log-ecox-event
// Descripción: Registra eventos de auditoría ECOX desde el frontend
// ============================================
// El frontend llama a esta función en cada paso del flujo de firma:
// - Cuando el firmante abre el link
// - Cuando acepta el NDA
// - Cuando completa el MFA
// - Cuando ve el documento
// - Cuando aplica la firma
// ============================================

import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getLocationFromIP,
  validateLocationConsistency,
  detectVPNUsage,
  formatLocation
} from '../_shared/geolocation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LogEventRequest {
  workflow_id: string
  signer_id: string
  event_type: string
  source_ip?: string
  user_agent?: string
  timezone?: string  // Timezone del navegador (ej: "America/Argentina/Buenos_Aires")
  geolocation?: {
    country?: string
    city?: string
    // NO aceptamos lat/lon del frontend
  }
  details?: Record<string, any>
  document_hash_snapshot?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parsear el body
    const payload: LogEventRequest = await req.json()

    // Validaciones
    if (!payload.workflow_id || !payload.signer_id || !payload.event_type) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: workflow_id, signer_id, event_type'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar que el event_type sea válido
    const validEventTypes = [
      'access_link_opened',
      'nda_accepted',
      'mfa_challenged',
      'mfa_success',
      'mfa_failed',
      'document_decrypted',
      'document_viewed',
      'signature_started',
      'signature_applied',
      'signature_completed',
      'eco_downloaded'
    ]

    if (!validEventTypes.includes(payload.event_type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener IP del cliente si no se proveyó
    let sourceIp = payload.source_ip
    if (!sourceIp) {
      const forwardedFor = req.headers.get('x-forwarded-for')
      const realIp = req.headers.get('x-real-ip')
      sourceIp = forwardedFor?.split(',')[0].trim() || realIp || 'unknown'
    }

    // Obtener User-Agent si no se proveyó
    const userAgent = payload.user_agent || req.headers.get('user-agent') || 'unknown'

    // 🌍 GEOLOCALIZACIÓN AUTOMÁTICA (solo si no se proveyó)
    let geoLocation = payload.geolocation

    if (!geoLocation && sourceIp && sourceIp !== 'unknown') {
      console.log(`🌍 Obteniendo geolocalización para IP: ${sourceIp}`)
      geoLocation = await getLocationFromIP(sourceIp)
      console.log(`📍 Ubicación: ${formatLocation(geoLocation)}`)
    }

    // Validar consistencia con timezone (si se proveyó)
    let locationValidation = null
    let securityFlags = []

    if (payload.timezone && geoLocation) {
      locationValidation = validateLocationConsistency(geoLocation, payload.timezone)

      // Detectar posible uso de VPN
      if (detectVPNUsage(locationValidation)) {
        securityFlags.push('possible_vpn_detected')
        console.warn(`⚠️ Posible VPN detectado: IP=${sourceIp}, Timezone=${payload.timezone}`)
      }

      console.log(`🔍 Validación de ubicación: ${locationValidation.confidence_level} confidence`)
    }

    // Agregar información de validación a los details
    const enrichedDetails = {
      ...(payload.details || {}),
      timezone: payload.timezone,
      location_validation: locationValidation,
      security_flags: securityFlags.length > 0 ? securityFlags : undefined
    }

    // Registrar el evento usando la función SQL
    const { data, error } = await supabase.rpc('log_ecox_event', {
      p_workflow_id: payload.workflow_id,
      p_signer_id: payload.signer_id,
      p_event_type: payload.event_type,
      p_source_ip: sourceIp,
      p_user_agent: userAgent,
      p_geolocation: geoLocation || null,
      p_details: enrichedDetails,
      p_document_hash_snapshot: payload.document_hash_snapshot || null
    })

    if (error) {
      console.error('Error al registrar evento ECOX:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log event', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Evento ECOX registrado: ${payload.event_type} para signer ${payload.signer_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        event_id: data,
        message: `Event ${payload.event_type} logged successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error en log-ecox-event:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
