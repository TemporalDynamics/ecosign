import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'
import { appendTsaEventFromEdge } from '../_shared/tsaHelper.ts'
import { appendEvent } from '../_shared/eventHelper.ts'
import { appendEvent as appendCanonicalEvent } from '../_shared/canonicalEventHelper.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': (Deno.env.get('ALLOWED_ORIGIN') || Deno.env.get('SITE_URL') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const CERTIFICATE_SCHEMA_VERSION = '1.0'

interface ProcessSignatureRequest {
  accessToken: string           // Token del firmante
  signatureData: {
    imageUrl: string            // URL de la imagen de firma en Storage
    coordinates: {
      page: number
      x: number
      y: number
      width: number
      height: number
    }
  }
  ndaAccepted?: boolean          // Checkbox legal (requerido si signer.require_nda=true)
  ndaFingerprint?: any           // Browser fingerprint para no-repudiación
  ipAddress?: string
  userAgent?: string
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

async function triggerEmailDelivery(supabase: ReturnType<typeof createClient>) {
  try {
    await supabase.functions.invoke('send-pending-emails')
  } catch (error) {
    console.warn('send-pending-emails invoke failed', error)
  }
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: ProcessSignatureRequest = await req.json()
    const { accessToken, signatureData, ndaAccepted, ndaFingerprint, ipAddress, userAgent } = body

    if (!accessToken || !signatureData) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    // Hash del token para buscar en DB (si ya viene en hash, úsalo directo)
    const tokenHash = /^[a-f0-9]{64}$/i.test(accessToken)
      ? accessToken
      : await hashToken(accessToken)

    // 1. Buscar signer por token
    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select(`
        *,
        workflow:signature_workflows(*)
      `)
      .eq('access_token_hash', tokenHash)
      .single()

    if (signerError || !signer) {
      return jsonResponse({ error: 'Invalid or expired access token' }, 404)
    }

    // 2. Validar que sea su turno
    if (signer.status !== 'ready_to_sign') {
      return jsonResponse({
        error: 'Not your turn to sign yet',
        currentStatus: signer.status
      }, 403)
    }

    // 3. Validar NDA si es requerido
    if (signer.require_nda && !ndaAccepted) {
      return jsonResponse({
        error: 'NDA acceptance is required before signing'
      }, 400)
    }

    // 4. Obtener versión actual del workflow
    const { data: currentVersion, error: versionError } = await supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'active')
      .single()

    if (versionError || !currentVersion) {
      return jsonResponse({ error: 'Document version not found' }, 500)
    }

    // 5. Generar certificación forense (Triple Anchoring)
    const workflow = signer.workflow as any
    const forensicConfig = workflow.forensic_config || {}
    const signedAt = new Date().toISOString()

    // === Identity Level Determination (IDENTITY_ASSURANCE_RULES.md) ===
    function determineIdentityLevel(signer: any, context: any): string {
      // L1: Email magic link (workflow_signers requiere email válido)
      if (signer.email) return 'L1'

      // L0: Acknowledgement sin verificación
      return 'L0'

      // TODO (Q2):
      // - L2: OTP SMS (cuando se implemente)
      // - L3: Passkey WebAuthn (cuando se implemente)
      // - L4: Biometric + KYC (futuro)
      // - L5: QES/PSC certificate (futuro)
    }

    function buildIdentitySignals(signer: any, context: any): string[] {
      const signals: string[] = []

      if (signer.email) signals.push('email_provided')
      if (signer.email) signals.push('email_verified') // workflow_signers implica verificación
      if (context.ndaAccepted) signals.push('nda_accepted')
      if (context.ipAddress || context.userAgent) signals.push('device_fingerprint_recorded')

      return signals
    }

    const identityLevel = determineIdentityLevel(signer, { ndaAccepted, ipAddress, userAgent })
    const identityAssurance = {
      level: identityLevel,
      provider: 'ecosign',
      method: identityLevel === 'L1' ? 'email_magic_link' : null,
      timestamp: signedAt,
      signals: buildIdentitySignals(signer, { ndaAccepted, ipAddress, userAgent })
    }
    let timeAssurance = {
      source: forensicConfig.rfc3161 ? 'RFC3161' : 'server_clock',
      confidence: forensicConfig.rfc3161 ? 'high' : 'informational'
    }

    const ua = userAgent || ''
    const deviceType = /Mobi|Android/i.test(ua) ? 'mobile' : 'desktop'
    const osFamily = /Windows/i.test(ua)
      ? 'windows'
      : /Mac/i.test(ua)
        ? 'macos'
        : /Linux/i.test(ua)
          ? 'linux'
          : /iPhone|iPad|iPod/i.test(ua)
            ? 'ios'
            : /Android/i.test(ua)
              ? 'android'
              : 'unknown'

    const environment = {
      device_type: deviceType,
      os_family: osFamily,
      network_type: 'unknown'
    }

    const systemCapabilities = {
      biometric_verification: false,
      in_person_verification: false
    }

    const limitations = [
      'identity_not_biometrically_verified',
      'no_in_person_validation'
    ]

    const eventLineage = {
      event_id: crypto.randomUUID(),
      previous_event_id: null,
      cause: 'signature_completed'
    }

    // Hash de la firma
    const signatureHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
          JSON.stringify(signatureData)
        ))
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('')

    // Crear eco_data básico
    const ecoData = {
      certificate_schema_version: CERTIFICATE_SCHEMA_VERSION,
      signer: {
        email: signer.email,
        name: signer.name,
        signedAt
      },
      document: {
        hash: currentVersion.document_hash,
        version: currentVersion.version_number
      },
      signature: {
        hash: signatureHash,
        coordinates: signatureData.coordinates
      },
      workflow: {
        document_entity_id: workflow.document_entity_id || null,
        signingOrder: signer.signing_order
      },
      identity_assurance: identityAssurance,
      intent: {
        intent_confirmed: true,
        intent_method: 'explicit_acceptance'
      },
      time_assurance: timeAssurance,
      environment,
      system_capabilities: systemCapabilities,
      limitations,
      policy_snapshot_id: 'policy_2025_11',
      event_lineage: eventLineage
    }

    // Certificación forensic: TSA (RFC 3161), Polygon, y Bitcoin (OpenTimestamps)
    // El sistema genera certificados .ECO/.ECOX reales con todas las garantías criptográficas

    let rfc3161Token = null
    let polygonTxHash = null
    let bitcoinAnchorId = null

    // RFC 3161 Timestamp (always over witness hash)
    if (forensicConfig.rfc3161) {
      try {
        const { data: tsaData, error: tsaError } = await supabase.functions.invoke('legal-timestamp', {
          body: { hash_hex: currentVersion.document_hash }
        })
        if (!tsaError && tsaData?.success) {
          rfc3161Token = tsaData.token
          timeAssurance = {
            source: 'RFC3161',
            confidence: 'high'
          }
          if (workflow.document_entity_id) {
            const tsaAppend = await appendTsaEventFromEdge(supabase, workflow.document_entity_id, {
              token_b64: tsaData.token,
              witness_hash: currentVersion.document_hash
            })
            if (!tsaAppend.success) {
              console.warn('TSA event append failed:', tsaAppend.error)
            }
          }
        } else {
          timeAssurance = {
            source: 'server_clock',
            confidence: 'informational'
          }
        }
      } catch (err) {
        console.warn('RFC 3161 failed:', err)
        timeAssurance = {
          source: 'server_clock',
          confidence: 'informational'
        }
      }
    }

    // Polygon Anchoring
    if (forensicConfig.polygon) {
      try {
        const { data: polygonData, error: polygonError } = await supabase.functions.invoke('anchor-polygon', {
          body: {
            documentHash: signatureHash,
            documentId: workflow.id,
            userEmail: signer.email
          }
        })
        if (!polygonError && polygonData?.success) {
          polygonTxHash = polygonData.txHash
        }
      } catch (err) {
        console.warn('Polygon anchoring failed:', err)
      }
    }

    // Bitcoin Anchoring
    if (forensicConfig.bitcoin) {
      try {
        const { data: bitcoinData, error: bitcoinError } = await supabase.functions.invoke('anchor-bitcoin', {
          body: {
            documentHash: signatureHash,
            documentId: workflow.id,
            userEmail: signer.email
          }
        })
        if (!bitcoinError && bitcoinData?.anchorId) {
          bitcoinAnchorId = bitcoinData.anchorId
        }
      } catch (err) {
        console.warn('Bitcoin anchoring failed:', err)
      }
    }

    // 6. Registrar firma en workflow_signatures (con NDA tracking)
    const { data: signatureRecord, error: signatureError } = await supabase
      .from('workflow_signatures')
      .insert({
        workflow_id: signer.workflow_id,
        version_id: currentVersion.id,
        signer_id: signer.id,
        signature_image_url: signatureData.imageUrl,
        signature_coordinates: signatureData.coordinates,
        signature_hash: signatureHash,
        certification_data: ecoData,
        rfc3161_token: rfc3161Token,
        polygon_tx_hash: polygonTxHash,
        bitcoin_anchor_id: bitcoinAnchorId,
        ip_address: ipAddress,
        user_agent: userAgent,
        // NDA tracking (checkbox legal, no documento separado)
        nda_accepted: ndaAccepted || false,
        nda_accepted_at: ndaAccepted ? new Date().toISOString() : null,
        nda_ip_address: ndaAccepted ? ipAddress : null,
        nda_fingerprint: ndaAccepted ? ndaFingerprint : null
      })
      .select()
      .single()

    if (signatureError) {
      console.error('Error saving signature:', signatureError)
      return jsonResponse({ error: 'Failed to save signature' }, 500)
    }

    // === PROBATORY EVENT: signature ===
    // Register that this document was signed (goes to .eco)
    if (workflow.document_entity_id) {
      const eventResult = await appendEvent(
        supabase,
        workflow.document_entity_id,
        {
          kind: 'signature',
          at: signedAt,
          signer: {
            email: signer.email,
            name: signer.name,
            order: signer.signing_order,
          },
          identity_assurance: identityAssurance,
          signature: {
            hash: signatureHash,
            coordinates: signatureData.coordinates,
          },
          workflow: {
            document_entity_id: workflow.document_entity_id || null,
            version: currentVersion.version_number,
          },
          forensic: {
            tsa: !!rfc3161Token,
            polygon: !!polygonTxHash,
            bitcoin: !!bitcoinAnchorId,
          }
        },
        'process-signature'
      );

      if (!eventResult.success) {
        console.error('Failed to append signature event:', eventResult.error);
        // Don't fail the request, but log it
      }
    } else {
      console.warn(`workflow.document_entity_id not found, signature event not recorded`);
    }

    // 7. Actualizar estado del signer
    await supabase
      .from('workflow_signers')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data: signatureData,
        signature_hash: signatureHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    await appendCanonicalEvent(
      supabase,
      {
        event_type: 'signer.signed',
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        payload: {
          email: signer.email,
          signing_order: signer.signing_order
        },
        actor_id: workflow.owner_id ?? null
      },
      'process-signature'
    )

    // 8. Avanzar workflow (marcar siguiente firmante como 'ready')
    await supabase.rpc('advance_workflow', { p_workflow_id: signer.workflow_id })

    // 9. Obtener siguiente firmante
    const { data: nextSigner } = await supabase
      .from('workflow_signers')
      .select('*')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'ready_to_sign')
      .single()

    if (nextSigner) {
      await appendCanonicalEvent(
        supabase,
        {
          event_type: 'signer.ready_to_sign',
          workflow_id: signer.workflow_id,
          signer_id: nextSigner.id,
          payload: {
            email: nextSigner.email,
            signing_order: nextSigner.signing_order
          }
        },
        'process-signature'
      )
    } else {
      await appendCanonicalEvent(
        supabase,
        {
          event_type: 'workflow.completed',
          workflow_id: signer.workflow_id,
          payload: { completed_at: new Date().toISOString() },
          actor_id: workflow.owner_id ?? null
        },
        'process-signature'
      )
    }

    // 10. Crear notificaciones
    const appUrl = Deno.env.get('APP_URL') || 'https://app.ecosign.app'

    // Obtener email del owner
    const { data: owner } = await supabase
      .from('auth.users')
      .select('email')
      .eq('id', workflow.owner_id)
      .single()

    const ownerEmail = owner?.email

    const ownerSubject = `${signer.name || signer.email} firmó ${workflow.original_filename || 'tu documento'}`
    const signerSubject = 'Tu copia firmada ya está lista'

    if (ownerEmail) {
      await supabase
        .from('workflow_notifications')
        .insert({
          workflow_id: signer.workflow_id,
          recipient_email: ownerEmail,
          recipient_type: 'owner',
          notification_type: 'owner_document_signed',
          subject: ownerSubject,
          body_html: `
            <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 12px;">${signer.name || signer.email} firmó tu documento</h2>
            <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
              ${signer.name || signer.email} firmó <strong>${workflow.original_filename}</strong>.
            </p>
            <p style="font-family:Arial,sans-serif;margin:16px 0;">
              <a href="${appUrl}/workflows/${signer.workflow_id}" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver documento firmado</a>
            </p>
            <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:16px 0 0;">EcoSign. Transparencia que acompaña.</p>
          `,
          delivery_status: 'pending'
        })
    }

    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: signer.workflow_id,
        recipient_email: signer.email,
        recipient_type: 'signer',
        signer_id: signer.id,
        notification_type: 'signer_copy_ready',
        subject: signerSubject,
        body_html: `
          <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 12px;">Tu firma fue aplicada correctamente</h2>
          <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
            El documento <strong>${workflow.original_filename}</strong> ya está certificado.
          </p>
          <p style="font-family:Arial,sans-serif;margin:12px 0 8px;">
            <a href="${appUrl}/sign/${tokenHash}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Descargar PDF firmado</a>
          </p>
          <p style="font-family:Arial,sans-serif;margin:8px 0 16px;">
            <a href="${appUrl}/sign/${tokenHash}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Descargar archivo ECO</a>
          </p>
          <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:12px 0 0;">Firmaste con la misma evidencia que recibe el remitente.</p>
          <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:4px 0 12px;">Tu firma te pertenece. Tu evidencia también.</p>
          <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:12px 0 0;">EcoSign. Transparencia que acompaña.</p>
        `,
        delivery_status: 'pending'
      })

    // Notificar al siguiente firmante (si existe y delivery_mode es 'email')
    // Si delivery_mode='link', el creador comparte el link manualmente
    const workflowDeliveryMode = workflow.delivery_mode || 'email'

    if (nextSigner && workflowDeliveryMode === 'email') {
      // Obtener token del siguiente firmante
      const { data: nextSignerFull } = await supabase
        .from('workflow_signers')
        .select('*')
        .eq('id', nextSigner.id)
        .single()

      // Generar URL de firma usando access_token_hash almacenado (usamos el hash como token público)
      const nextSignerUrl = nextSignerFull?.access_token_hash
        ? `${appUrl}/sign/${nextSignerFull.access_token_hash}`
        : `${appUrl}/sign/${nextSigner.id}`

      await supabase
        .from('workflow_notifications')
        .insert({
          workflow_id: signer.workflow_id,
          recipient_email: nextSigner.email,
          recipient_type: 'signer',
          signer_id: nextSigner.id,
          notification_type: 'your_turn_to_sign',
          subject: `Firma requerida: ${workflow.original_filename}`,
          body_html: `
            <h2>Firma Requerida</h2>
            <p>Hola ${nextSigner.name || nextSigner.email},</p>
            <p>Es tu turno de firmar el documento: <strong>${workflow.original_filename}</strong></p>
            <p>Firmantes anteriores: ${signer.signing_order}/${workflow.signers_count || 'varios'}</p>
            <p>Este documento cuenta con certificación forense completa.</p>
            <p><a href="${nextSignerUrl}">Ver y Firmar Documento</a></p>
          `,
          delivery_status: 'pending'
        })
    } else if (nextSigner && workflowDeliveryMode === 'link') {
      console.log('[DELIVERY_MODE=link] Skipping signer notification - creator must share link manually', {
        workflowId: signer.workflow_id,
        nextSignerEmail: nextSigner.email,
        nextSignerOrder: nextSigner.signing_order
      })
    }

    // 11. Si no hay más firmantes, notificar a todos
    if (!nextSigner) {
      if (ownerEmail) {
        await supabase
          .from('workflow_notifications')
          .insert({
            workflow_id: signer.workflow_id,
            recipient_email: ownerEmail,
            recipient_type: 'owner',
            notification_type: 'workflow_completed',
            subject: 'Todas las firmas completadas',
            body_html: `
              <h2 style="font-family:Arial,sans-serif;color:#0f172a;margin:0 0 12px;">Documento completado</h2>
              <p style="font-family:Arial,sans-serif;color:#334155;margin:0 0 12px;">
                El documento ha sido firmado por todos los participantes.
              </p>
              <p style="font-family:Arial,sans-serif;margin:16px 0;">
              <a href="${appUrl}/workflows/${signer.workflow_id}" style="display:inline-block;padding:14px 22px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver certificado</a>
            </p>
            <p style="font-family:Arial,sans-serif;color:#0f172a;font-weight:600;margin:16px 0 0;">EcoSign. Transparencia que acompaña.</p>
          `,
          delivery_status: 'pending'
        })
      }
    }

    await triggerEmailDelivery(supabase)

    return jsonResponse({
      success: true,
      workflowStatus: nextSigner ? 'in_progress' : 'completed',
      nextSigner: nextSigner ? {
        email: nextSigner.email,
        order: nextSigner.signing_order
      } : null,
      forensicProof: {
        rfc3161: !!rfc3161Token,
        polygon: !!polygonTxHash,
        bitcoin: !!bitcoinAnchorId
      },
      message: nextSigner
        ? `Signature recorded. Next signer: ${nextSigner.email}`
        : 'Signature recorded. Workflow completed!'
    })

  } catch (error) {
    console.error('Error in process-signature:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
