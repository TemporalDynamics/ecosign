// supabase/functions/generate-link/index.ts
// Edge function to generate secure NDA links for document sharing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { sendEmail, buildSignerInvitationEmail } from '../_shared/email.ts'
import { withRateLimit } from '../_shared/ratelimit.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { parseJsonBody } from '../_shared/validation.ts'
import { GenerateLinkSchema } from '../_shared/schemas.ts'
import { appendEvent } from '../_shared/eventHelper.ts'

async function ensureDocumentRow(
  supabase: any,
  userId: string,
  documentEntityId: string,
  documentName: string,
  ecoHash: string,
): Promise<{ id: string; title: string | null; original_filename: string | null; eco_hash: string | null; status: string }> {
  const { data: byEntity } = await supabase
    .from('documents')
    .select('id, owner_id, title, original_filename, eco_hash, status')
    .eq('document_entity_id', documentEntityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (byEntity) {
    if ((byEntity as any).owner_id !== userId) {
      throw new Error('Not authorized to share this document')
    }
    return {
      id: String((byEntity as any).id),
      title: ((byEntity as any).title ?? null) as string | null,
      original_filename: ((byEntity as any).original_filename ?? null) as string | null,
      eco_hash: ((byEntity as any).eco_hash ?? null) as string | null,
      status: String((byEntity as any).status ?? 'active'),
    }
  }

  const insertPayload: Record<string, unknown> = {
    owner_id: userId,
    title: documentName,
    original_filename: documentName,
    eco_hash: ecoHash,
    status: 'active',
    document_entity_id: documentEntityId,
  }

  const { data: created, error: createError } = await supabase
    .from('documents')
    .insert(insertPayload)
    .select('id, title, original_filename, eco_hash, status')
    .single()

  if (createError || !created) {
    console.error('Error creating canonical document row:', createError)
    throw new Error('Failed to create document record')
  }

  return {
    id: String((created as any).id),
    title: ((created as any).title ?? null) as string | null,
    original_filename: ((created as any).original_filename ?? null) as string | null,
    eco_hash: ((created as any).eco_hash ?? null) as string | null,
    status: String((created as any).status ?? 'active'),
  }
}

serve(withRateLimit('generate', async (req) => {
  const { headers: corsHeaders, isAllowed } = getCorsHeaders(req.headers.get('origin') || undefined)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!isAllowed) {
    return new Response('CORS not allowed', { status: 403, headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for DB operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const parsed = await parseJsonBody(req, GenerateLinkSchema)
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({ success: false, error: parsed.error, details: parsed.details }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const {
      document_entity_id,
      recipient_email,
      expires_in_hours = 72, // Default 3 days
      require_nda = true,
      nda_text = null
    } = parsed.data

    const documentEntityId = document_entity_id

    const { data: entity, error: entityError } = await supabase
      .from('document_entities')
      .select('id, owner_id, source_name, source_hash, witness_hash, signed_hash')
      .eq('id', documentEntityId)
      .single()

    if (entityError || !entity) {
      throw new Error('Document not found')
    }

    if ((entity as any).owner_id !== user.id) {
      throw new Error('Not authorized to share this document')
    }

    const canonicalDocumentName = String((entity as any).source_name || 'Documento')
    const canonicalEcoHash = String(
      (entity as any).signed_hash ||
      (entity as any).witness_hash ||
      (entity as any).source_hash ||
      documentEntityId,
    )

    const doc = await ensureDocumentRow(
      supabase,
      user.id,
      documentEntityId,
      canonicalDocumentName,
      canonicalEcoHash,
    )

    // Generate secure random token (32 bytes = 64 hex chars)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Hash the token for storage (we never store plaintext)
    const tokenEncoder = new TextEncoder()
    const tokenData = tokenEncoder.encode(token)
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData)
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Generate recipient ID (16 bytes = 32 hex chars)
    const recipientIdBytes = crypto.getRandomValues(new Uint8Array(16))
    const recipientIdHex = Array.from(recipientIdBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Calculate expiration
    const expiresAt = expires_in_hours
      ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
      : null

    // Create recipient record
    const { data: recipient, error: recipientError } = await supabase
      .from('recipients')
      .insert({
        document_id: doc.id,
        document_entity_id: documentEntityId,
        email: recipient_email,
        recipient_id: recipientIdHex
      })
      .select()
      .single()

    if (recipientError) {
      console.error('Error creating recipient:', recipientError)
      throw new Error('Failed to create recipient record')
    }

    // Create link record with direct recipient reference
    const { data: link, error: linkError } = await supabase
      .from('links')
      .insert({
        document_id: doc.id,
        document_entity_id: documentEntityId,
        recipient_id: recipient.id, // Direct link to recipient for correct attribution
        token_hash: tokenHash,
        expires_at: expiresAt,
        require_nda,
        nda_text
      })
      .select()
      .single()

    if (linkError) {
      console.error('Error creating link:', linkError)
      // Cleanup recipient if link creation fails
      await supabase.from('recipients').delete().eq('id', recipient.id)
      throw new Error('Failed to create link record')
    }

    // Build the access URL (token is in the URL, not stored)
    const appUrl = Deno.env.get('APP_URL') || 'https://ecosign.app'
    const accessUrl = `${appUrl}/nda/${token}`

    // Log the link creation event
    console.log(`Link created: ${link.id} for entity ${documentEntityId} to ${recipient_email}`)

    // === PROBATORY EVENT: share.created ===
    // Register that this document was shared (goes to .eco)
    const eventResult = await appendEvent(
      supabase,
      documentEntityId,
      {
        kind: 'share.created',
        at: new Date().toISOString(),
        share: {
          link_id: link.id,
          recipient_email: recipient_email,
          method: 'link',
          otp_required: require_nda,
          expires_at: expiresAt,
        }
      },
      'generate-link'
    );

    if (!eventResult.success) {
      console.error('Failed to append share.created event:', eventResult.error);
    }

    // --- Send Email Invitation ---
    let emailSent = false;
    try {
      const senderName = user.user_metadata?.full_name || user.email; // Get sender name from user metadata or email
      const emailPayload = await buildSignerInvitationEmail({
        signerEmail: recipient_email,
        signerName: null,
        documentName: canonicalDocumentName,
        signLink: accessUrl,
        expiresAt: expiresAt || '', // Ensure expiresAt is a string
        senderName: senderName,
        siteUrl: appUrl
      });
      const emailResult = await sendEmail(emailPayload);
      emailSent = emailResult.success;
      if (!emailSent) {
        console.error('Failed to send email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }
    // --- End Send Email Invitation ---

    // Return the plaintext token URL (only time it's available)
    return new Response(
      JSON.stringify({
        success: true,
        link_id: link.id,
        recipient_id: recipient.id,
        access_url: accessUrl,
        expires_at: expiresAt,
        require_nda,
        document_title: canonicalDocumentName,
        recipient_email,
        email_sent: emailSent // Indicate if email was sent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in generate-link:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        success: false,
        error: message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: message === 'Unauthorized' ? 401 : 400
      }
    )
  }
}))
