// supabase/functions/verify-access/index.ts
// Edge function to verify NDA link tokens and log access events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyAccessRequest {
  token: string
  event_type?: 'view' | 'download' | 'forward'
}

interface AccessMetadata {
  ip_address?: string
  user_agent?: string
  country?: string
  session_id?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body: VerifyAccessRequest = await req.json()
    const { token, event_type = 'view' } = body

    if (!token) {
      throw new Error('Missing token')
    }

    // Validate token format (should be 64 hex chars)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      throw new Error('Invalid token format')
    }

    // Hash the provided token to lookup in DB
    const tokenEncoder = new TextEncoder()
    const tokenData = tokenEncoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Find the link by token hash
    const { data: link, error: linkError } = await supabase
      .from('links')
      .select(`
        id,
        document_id,
        expires_at,
        revoked_at,
        require_nda,
        created_at
      `)
      .eq('token_hash', tokenHash)
      .single()

    if (linkError || !link) {
      console.log('Link not found for token hash:', tokenHash)
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Link not found or invalid'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Check if link is revoked
    if (link.revoked_at) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This link has been revoked'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This link has expired',
          expired_at: link.expires_at
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, original_filename, eco_hash, status')
      .eq('id', link.document_id)
      .single()

    if (docError || !document) {
      throw new Error('Document not found')
    }

    if (document.status !== 'active') {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Document is no longer available'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      )
    }

    // Get recipient info for this link
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .select('id, email, recipient_id')
      .eq('document_id', link.document_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recipientError || !recipient) {
      throw new Error('Recipient not found')
    }

    // Extract access metadata from request headers
    const metadata: AccessMetadata = {
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  req.headers.get('x-real-ip') ||
                  undefined,
      user_agent: req.headers.get('user-agent') || undefined,
      country: req.headers.get('cf-ipcountry') || // Cloudflare
               req.headers.get('x-vercel-ip-country') || // Vercel
               undefined,
      session_id: crypto.randomUUID()
    }

    // Log the access event
    const { error: eventError } = await supabase
      .from('access_events')
      .insert({
        recipient_id: recipient.id,
        event_type,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        country: metadata.country,
        session_id: metadata.session_id
      })

    if (eventError) {
      console.error('Error logging access event:', eventError)
      // Don't fail the request if logging fails
    } else {
      console.log(`Access logged: ${event_type} for document ${document.id}`)
    }

    // Check if NDA was already accepted
    const { data: ndaAcceptance, error: ndaError } = await supabase
      .from('nda_acceptances')
      .select('id, accepted_at')
      .eq('recipient_id', recipient.id)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single()

    const ndaAccepted = !ndaError && ndaAcceptance

    // Return link status and document metadata
    return new Response(
      JSON.stringify({
        valid: true,
        link_id: link.id,
        document: {
          id: document.id,
          title: document.title,
          original_filename: document.original_filename,
          eco_hash: document.eco_hash
        },
        recipient: {
          id: recipient.id,
          email: recipient.email
        },
        require_nda: link.require_nda,
        nda_accepted: ndaAccepted,
        nda_accepted_at: ndaAcceptance?.accepted_at || null,
        expires_at: link.expires_at,
        session_id: metadata.session_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in verify-access:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
