import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface ChangeAnnotation {
  page: number
  highlights: Array<{
    x: number
    y: number
    width: number
    height: number
  }>
  comment: string
}

interface RequestChangesRequest {
  accessToken: string
  annotations: ChangeAnnotation[]  // Resaltados y comentarios
  generalNotes?: string
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

    const body: RequestChangesRequest = await req.json()
    const { accessToken, annotations, generalNotes } = body

    if (!accessToken || !annotations || annotations.length === 0) {
      return jsonResponse({
        error: 'Access token and at least one annotation are required'
      }, 400)
    }

    // 1. Buscar signer por token
    const tokenHash = await hashToken(accessToken)

    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select(`
        *,
        workflow:signature_workflows!inner(*)
      `)
      .eq('access_token_hash', tokenHash)
      .single()

    if (signerError || !signer) {
      return jsonResponse({ error: 'Invalid or expired access token' }, 404)
    }

    // 2. Validar que sea su turno
    if (signer.status !== 'ready') {
      return jsonResponse({
        error: 'Not your turn to review the document',
        currentStatus: signer.status
      }, 403)
    }

    const workflow = signer.workflow as any

    // 3. Actualizar signer con solicitud de cambios
    await supabase
      .from('workflow_signers')
      .update({
        status: 'requested_changes',
        change_request_data: {
          annotations,
          generalNotes,
          requestedAt: new Date().toISOString()
        },
        change_request_at: new Date().toISOString(),
        change_request_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    // 4. Pausar workflow
    await supabase
      .from('signature_workflows')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.workflow_id)

    // 5. Obtener email del owner
    const { data: owner } = await supabase.auth.admin.getUserById(workflow.owner_id)

    if (!owner) {
      throw new Error('Workflow owner not found')
    }

    // 6. Crear notificaciones

    // Notificar a Usuario A (owner)
    const changesHtml = annotations.map((ann, idx) => `
      <li>
        <strong>Página ${ann.page}</strong>: ${ann.comment}
        <br/><small>${ann.highlights.length} área(s) resaltada(s)</small>
      </li>
    `).join('')

    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: signer.workflow_id,
        recipient_email: owner.user.email!,
        recipient_type: 'owner',
        notification_type: 'change_requested',
        subject: `Solicitud de Modificación: ${signer.email}`,
        body_html: `
          <h2>Solicitud de Modificación</h2>
          <p><strong>${signer.name || signer.email}</strong> ha solicitado cambios en el documento.</p>

          <h3>Cambios Solicitados:</h3>
          <ul>
            ${changesHtml}
          </ul>

          ${generalNotes ? `
            <h3>Notas Generales:</h3>
            <p>${generalNotes}</p>
          ` : ''}

          <p>Por favor revisa los cambios y decide:</p>
          <ul>
            <li><strong>Aceptar</strong>: Realiza las modificaciones y reinicia el flujo</li>
            <li><strong>Rechazar</strong>: Mantén el documento actual y notifica al solicitante</li>
          </ul>

          <p><a href="${Deno.env.get('APP_URL')}/workflows/${signer.workflow_id}">Ver Solicitud en Dashboard</a></p>
        `,
        delivery_status: 'pending'
      })

    // Notificar al solicitante (confirmación de envío)
    await supabase
      .from('workflow_notifications')
      .insert({
        workflow_id: signer.workflow_id,
        recipient_email: signer.email,
        recipient_type: 'signer',
        signer_id: signer.id,
        notification_type: 'change_requested',
        subject: 'Solicitud de Modificación Enviada',
        body_html: `
          <h2>Solicitud Enviada</h2>
          <p>Tu solicitud de modificación ha sido enviada al propietario del documento.</p>

          <h3>Resumen de cambios solicitados:</h3>
          <ul>
            ${changesHtml}
          </ul>

          <p>Recibirás una notificación cuando el propietario responda a tu solicitud.</p>
          <p>El documento queda en pausa hasta que se resuelva tu solicitud.</p>
        `,
        delivery_status: 'pending'
      })

    // Notificar a firmantes previos (si los hay)
    const { data: previousSigners } = await supabase
      .from('workflow_signers')
      .select('email, name')
      .eq('workflow_id', signer.workflow_id)
      .eq('status', 'signed')
      .lt('signing_order', signer.signing_order)

    if (previousSigners && previousSigners.length > 0) {
      for (const prevSigner of previousSigners) {
        await supabase
          .from('workflow_notifications')
          .insert({
            workflow_id: signer.workflow_id,
            recipient_email: prevSigner.email,
            recipient_type: 'signer',
            notification_type: 'change_requested',
            subject: 'Modificación Solicitada en Documento Firmado',
            body_html: `
              <h2>Solicitud de Modificación</h2>
              <p>El documento que firmaste ha recibido una solicitud de modificación por parte de otro firmante.</p>
              <p>Firmante: <strong>${signer.name || signer.email}</strong></p>
              <p>El propietario revisará los cambios. Si se aceptan, recibirás el documento modificado para firmar nuevamente.</p>
              <p>Tu firma anterior (Versión ${workflow.current_version}) quedará archivada como evidencia.</p>
            `,
            delivery_status: 'pending'
          })
      }
    }

    return jsonResponse({
      success: true,
      workflowId: signer.workflow_id,
      status: 'paused',
      annotationsCount: annotations.length,
      message: 'Change request submitted successfully. Workflow paused. Owner will be notified.'
    })

  } catch (error) {
    console.error('Error in request-document-changes:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
