import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

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

    // Hash del token para buscar en DB
    const tokenHash = await hashToken(accessToken)

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
    if (signer.status !== 'ready') {
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
      signer: {
        email: signer.email,
        name: signer.name,
        signedAt: new Date().toISOString()
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
        id: workflow.id,
        signingOrder: signer.signing_order
      }
    }

    // TODO: Integrar con basicCertificationWeb para generar .ECO/.ECOX real
    // Por ahora, simulamos la certificación

    let rfc3161Token = null
    let polygonTxHash = null
    let bitcoinAnchorId = null

    // RFC 3161 Timestamp
    if (forensicConfig.rfc3161) {
      try {
        const { data: tsaData, error: tsaError } = await supabase.functions.invoke('legal-timestamp', {
          body: { hash_hex: signatureHash }
        })
        if (!tsaError && tsaData?.success) {
          rfc3161Token = tsaData.token
        }
      } catch (err) {
        console.warn('RFC 3161 failed:', err)
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

    // 8. Avanzar workflow (marcar siguiente firmante como 'ready')
    await supabase.rpc('advance_workflow', { p_workflow_id: signer.workflow_id })

    // 9. Obtener siguiente firmante
    const { data: nextSigner } = await supabase
      .from('workflow_signers')
      .select('*')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'ready')
      .single()

    // 10. Crear notificaciones
    const appUrl = Deno.env.get('APP_URL') || 'https://app.verifysign.pro'

    // Notificar a Usuario A
    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: signer.workflow_id,
        recipient_email: workflow.owner_id, // Cambiar a email del owner
        recipient_type: 'owner',
        notification_type: 'signature_completed',
        subject: `Firma Completada: ${signer.email}`,
        body_html: `
          <h2>Firma Completada</h2>
          <p>${signer.name || signer.email} ha firmado el documento.</p>
          ${nextSigner ? `<p>Email enviado a: <strong>${nextSigner.email}</strong></p>` : '<p>Todas las firmas completadas.</p>'}
        `,
        delivery_status: 'pending'
      })

    // Notificar al firmante actual (envío de certificado)
    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: signer.workflow_id,
        recipient_email: signer.email,
        recipient_type: 'signer',
        signer_id: signer.id,
        notification_type: 'signature_completed',
        subject: 'Tu Firma y Certificado ECO',
        body_html: `
          <h2>Firma Completada</h2>
          <p>Has firmado exitosamente el documento.</p>
          <p><strong>Certificación Forense Activada:</strong></p>
          <ul>
            ${rfc3161Token ? '<li>✅ RFC 3161 Timestamp Legal</li>' : ''}
            ${polygonTxHash ? `<li>✅ Polygon Blockchain (TX: ${polygonTxHash.substring(0, 10)}...)</li>` : ''}
            ${bitcoinAnchorId ? '<li>✅ Bitcoin Anchoring (en proceso)</li>' : ''}
          </ul>
          <p>Tu certificado ECO estará disponible en breve.</p>
        `,
        delivery_status: 'pending'
      })

    // Notificar al siguiente firmante (si existe)
    if (nextSigner) {
      // Obtener token del siguiente firmante
      const { data: nextSignerFull } = await supabase
        .from('workflow_signers')
        .select('*')
        .eq('id', nextSigner.id)
        .single()

      // Generar URL de firma (necesitamos el token plaintext - esto requiere almacenarlo temporalmente)
      // Por ahora, asumimos que tenemos una forma de recuperar el token
      const nextSignerUrl = `${appUrl}/sign/[TOKEN]` // TODO: Resolver esto

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
    }

    // 11. Si no hay más firmantes, notificar a todos
    if (!nextSigner) {
      await supabase
        .from('workflow_notifications')
        .insert({
          workflow_id: signer.workflow_id,
          recipient_email: workflow.owner_id,
          recipient_type: 'owner',
          notification_type: 'workflow_completed',
          subject: 'Flujo de Firmas Completado',
          body_html: `
            <h2>Todas las firmas completadas</h2>
            <p>El documento ha sido firmado por todos los participantes.</p>
            <p>El certificado final con todas las firmas está disponible en tu dashboard.</p>
          `,
          delivery_status: 'pending'
        })
    }

    return jsonResponse({
      success: true,
      signatureId: signatureRecord.id,
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
