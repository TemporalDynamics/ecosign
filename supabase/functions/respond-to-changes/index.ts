import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface RespondToChangesRequest {
  workflowId: string
  signerId: string
  action: 'accept' | 'reject'
  // Si acepta, debe proveer nuevo documento
  newDocumentUrl?: string
  newDocumentHash?: string
  modificationNotes?: string
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })

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

    // Autenticar usuario
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization' }, 401)
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const body: RespondToChangesRequest = await req.json()
    const { workflowId, signerId, action, newDocumentUrl, newDocumentHash, modificationNotes } = body

    if (!workflowId || !signerId || !action) {
      return jsonResponse({ error: 'Missing required fields' }, 400)
    }

    if (action === 'accept' && (!newDocumentUrl || !newDocumentHash)) {
      return jsonResponse({
        error: 'When accepting changes, newDocumentUrl and newDocumentHash are required'
      }, 400)
    }

    // 1. Verificar que el usuario sea el owner del workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('signature_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return jsonResponse({ error: 'Workflow not found' }, 404)
    }

    if (workflow.owner_id !== user.id) {
      return jsonResponse({ error: 'Only the workflow owner can respond to change requests' }, 403)
    }

    if (workflow.status !== 'paused') {
      return jsonResponse({
        error: 'Workflow is not in paused state',
        currentStatus: workflow.status
      }, 400)
    }

    // 2. Obtener signer que solicitó cambios
    const { data: signer, error: signerError } = await supabase
      .from('workflow_signers')
      .select('*')
      .eq('id', signerId)
      .single()

    if (signerError || !signer) {
      return jsonResponse({ error: 'Signer not found' }, 404)
    }

    if (signer.status !== 'requested_changes') {
      return jsonResponse({
        error: 'This signer has not requested changes',
        currentStatus: signer.status
      }, 400)
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://app.verifysign.pro'

    if (action === 'reject') {
      // === RECHAZAR CAMBIOS ===

      // Actualizar signer
      await supabase
        .from('workflow_signers')
        .update({
          change_request_status: 'rejected',
          status: 'ready', // Vuelve a estar listo para firmar
          updated_at: new Date().toISOString()
        })
        .eq('id', signerId)

      // Reactivar workflow
      await supabase
        .from('signature_workflows')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)

      // Notificar al solicitante
      await supabase
        .from('workflow_notifications')
        .insert({
          workflow_id: workflowId,
          recipient_email: signer.email,
          recipient_type: 'signer',
          signer_id: signerId,
          notification_type: 'change_rejected',
          subject: 'Solicitud de Modificación Rechazada',
          body_html: `
            <h2>Solicitud Rechazada</h2>
            <p>El propietario del documento ha revisado tu solicitud de modificación y decidió mantener el documento actual.</p>
            ${modificationNotes ? `
              <h3>Notas del propietario:</h3>
              <p>${modificationNotes}</p>
            ` : ''}
            <p>El documento original sigue disponible para tu firma.</p>
            <p><a href="${appUrl}/sign/[TOKEN]">Ver y Firmar Documento</a></p>
          `,
          delivery_status: 'pending'
        })

      return jsonResponse({
        success: true,
        action: 'rejected',
        workflowStatus: 'active',
        message: 'Changes rejected. Signer notified. Workflow reactivated.'
      })

    } else {
      // === ACEPTAR CAMBIOS ===

      // Crear nueva versión del documento
      const { data: newVersion, error: versionError } = await supabase.rpc(
        'create_workflow_version',
        {
          p_workflow_id: workflowId,
          p_document_url: newDocumentUrl!,
          p_document_hash: newDocumentHash!,
          p_change_reason: `Modification requested by ${signer.name || signer.email}`,
          p_requested_by: signer.id,
          p_modification_notes: signer.change_request_data
        }
      )

      if (versionError) {
        console.error('Error creating new version:', versionError)
        return jsonResponse({ error: 'Failed to create new version' }, 500)
      }

      // Actualizar signer solicitante
      await supabase
        .from('workflow_signers')
        .update({
          change_request_status: 'accepted',
          status: 'pending', // Volverá a firmar con todos
          updated_at: new Date().toISOString()
        })
        .eq('id', signerId)

      // Obtener todos los firmantes previos que ya firmaron
      const { data: previousSigners } = await supabase
        .from('workflow_signers')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('status', 'signed')
        .lt('signing_order', signer.signing_order)

      // Notificar a firmantes previos
      if (previousSigners && previousSigners.length > 0) {
        for (const prevSigner of previousSigners) {
          await supabase
            .from('workflow_notifications')
            .insert({
              workflow_id: workflowId,
              recipient_email: prevSigner.email,
              recipient_type: 'signer',
              signer_id: prevSigner.id,
              notification_type: 'new_version_ready',
              subject: 'Nueva Versión de Documento Disponible',
              body_html: `
                <h2>Documento Modificado</h2>
                <p>El documento que firmaste ha sido modificado en base a una solicitud de cambios.</p>
                <p>Solicitante: <strong>${signer.name || signer.email}</strong></p>
                ${modificationNotes ? `
                  <h3>Notas de la modificación:</h3>
                  <p>${modificationNotes}</p>
                ` : ''}
                <p>Tu firma anterior quedó archivada como evidencia (Versión ${workflow.current_version}).</p>
                <p>En breve recibirás el documento modificado para firmar nuevamente.</p>
              `,
              delivery_status: 'pending'
            })
        }
      }

      // Notificar al solicitante
      await supabase
        .from('workflow_notifications')
        .insert({
          workflow_id: workflowId,
          recipient_email: signer.email,
          recipient_type: 'signer',
          signer_id: signerId,
          notification_type: 'change_accepted',
          subject: 'Modificación Aceptada',
          body_html: `
            <h2>Cambios Aceptados</h2>
            <p>El propietario ha aceptado tu solicitud de modificación.</p>
            ${modificationNotes ? `
              <h3>Notas:</h3>
              <p>${modificationNotes}</p>
            ` : ''}
            <p>El documento ha sido actualizado a la <strong>Versión ${workflow.current_version + 1}</strong>.</p>
            <p>Esperando que los firmantes previos completen sus firmas en la nueva versión.</p>
            <p>Recibirás una notificación cuando sea tu turno de firmar.</p>
          `,
          delivery_status: 'pending'
        })

      // Marcar primer firmante como 'ready'
      await supabase.rpc('advance_workflow', { p_workflow_id: workflowId })

      // Obtener primer firmante y notificar
      const { data: firstSigner } = await supabase
        .from('workflow_signers')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('status', 'ready')
        .order('signing_order', { ascending: true })
        .limit(1)
        .single()

      if (firstSigner) {
        await supabase
          .from('workflow_notifications')
          .insert({
            workflow_id: workflowId,
            recipient_email: firstSigner.email,
            recipient_type: 'signer',
            signer_id: firstSigner.id,
            notification_type: 'your_turn_to_sign',
            subject: `Firma Requerida: ${workflow.original_filename} (V${workflow.current_version + 1})`,
            body_html: `
              <h2>Nueva Versión Lista para Firma</h2>
              <p>El documento ha sido modificado y es tu turno de firmar.</p>
              <p><strong>Versión ${workflow.current_version + 1}</strong> (Documento modificado)</p>
              <p><a href="${appUrl}/sign/[TOKEN]">Ver y Firmar Documento</a></p>
            `,
            delivery_status: 'pending'
          })
      }

      return jsonResponse({
        success: true,
        action: 'accepted',
        newVersion: workflow.current_version + 1,
        workflowStatus: 'active',
        message: `Changes accepted. New version created (V${workflow.current_version + 1}). Workflow restarted.`
      })
    }

  } catch (error) {
    console.error('Error in respond-to-changes:', error)
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, 500)
  }
})
