import { serve } from 'https://deno.land/std@0.182.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Procesando emails pendientes...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener notificaciones pendientes (máximo 10 por ejecución)
    const { data: notifications, error: fetchError } = await supabase
      .from('workflow_notifications')
      .select('*')
      .eq('delivery_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!notifications || notifications.length === 0) {
      console.log('✅ No hay emails pendientes')
      return new Response(
        JSON.stringify({ message: 'No pending emails', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 Procesando ${notifications.length} notificaciones...`)

    let sentCount = 0
    let failedCount = 0

    for (const notification of notifications) {
      try {
        const emailPayload = {
          from: 'EcoSign <no-reply@email.ecosign.app>',
          to: notification.recipient_email,
          subject: notification.subject,
          html: notification.body_html,
        }

        const result = await sendEmail(emailPayload)

        if (result.success) {
          await supabase
            .from('workflow_notifications')
            .update({
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
              resend_email_id: result.id
            })
            .eq('id', notification.id)

          sentCount++
          console.log(`✅ Email enviado a ${notification.recipient_email}`)
        } else {
          await supabase
            .from('workflow_notifications')
            .update({
              delivery_status: 'failed',
              error_message: result.error
            })
            .eq('id', notification.id)

          failedCount++
          console.error(`❌ Error enviando a ${notification.recipient_email}:`, result.error)
        }
      } catch (error) {
        failedCount++
        console.error(`❌ Error procesando notificación ${notification.id}:`, error)

        await supabase
          .from('workflow_notifications')
          .update({
            delivery_status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', notification.id)
      }
    }

    console.log(`✅ Proceso completado: ${sentCount} enviados, ${failedCount} fallidos`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: notifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error en send-pending-emails:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
