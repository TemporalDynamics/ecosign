// send-pending-emails robust version (TypeScript)
// Reemplazar en supabase/functions/send-pending-emails
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.92.0?target=deno';
import { sendResendEmail, buildFounderWelcomeEmail } from '../_shared/email.ts';

const requireCronSecret = (req: Request) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!cronSecret || provided !== cronSecret) {
    return new Response('Forbidden', { status: 403 });
  }
  return null;
};

serve(async (req: Request) => {
  if (Deno.env.get('FASE') !== '1') {
    return new Response('disabled', { status: 204 });
  }
  const authError = requireCronSecret(req);
  if (authError) return authError;

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const MAX_RETRIES = 10;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  console.log('🟢 send-pending-emails: start');
  try {
    const { data: rows, error } = await supabase
      .from('system_emails')
      .select('*')
      .eq('delivery_status', 'pending')
      .lt('attempts', MAX_RETRIES)
      .limit(50)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error seleccionando pending:', error);
      return new Response('Error consulta', { status: 500 });
    }

    if (!rows || rows.length === 0) {
      console.info('✅ No hay emails pendientes en system_emails');
    } else {
      for (const r of rows) {
        try {
          const from = Deno.env.get('DEFAULT_FROM') ?? 'EcoSign <no-reply@email.ecosign.app>';
          const to = r.recipient_email;
          let subject = r.subject || 'Notificación EcoSign';
          let html = r.body_html || '<p>Notificación</p>';

          // Special handling for welcome_founder emails - generate HTML dynamically
          if (r.email_type === 'welcome_founder') {
            const siteUrl = Deno.env.get('SITE_URL') || 'https://ecosign.app';
            const meta = (r as any)?.metadata || {};
            const userName = meta.user_name || to.split('@')[0];
            const founderNumber = meta.founder_number ?? meta.founderNumber ?? null;

            const welcomeEmail = await buildFounderWelcomeEmail({
              userEmail: to,
              userName,
              founderNumber,
              dashboardUrl: `${siteUrl}/dashboard`,
              docsUrl: `${siteUrl}/docs`,
              supportUrl: `${siteUrl}/support`
            });

            subject = welcomeEmail.subject;
            html = welcomeEmail.html;
          }

          const result = await sendResendEmail({ from, to, subject, html });

          if (result.ok) {
            const upd = await supabase
              .from('system_emails')
              .update({
                delivery_status: 'sent',
                sent_at: new Date().toISOString(),
                error_message: null,
              })
              .eq('id', r.id);

            if (upd.error) console.error('Error actualizando a sent:', upd.error);
            else console.info(`Email enviado fila ${r.id} resend_id ${result.id}`);
          } else {
            const retry = (r.attempts ?? 0) + 1;
            const new_status = retry >= MAX_RETRIES ? 'failed' : 'pending';
            const upd = await supabase
              .from('system_emails')
              .update({
                delivery_status: new_status,
                error_message: JSON.stringify(result.error ?? result.body ?? 'Unknown error'),
                attempts: retry,
              })
              .eq('id', r.id);

            console.error(`Error enviando email fila ${r.id}:`, result.error ?? result.body);
            if (upd.error) console.error('Error actualizando fila error:', upd.error);
          }
        } catch (innerErr) {
          console.error('Excepción procesando fila:', innerErr);
        }
      }
    }

    const { data: workflowRows, error: workflowError } = await supabase
      .from('workflow_notifications')
      .select('*')
      .eq('delivery_status', 'pending')
      .lt('retry_count', MAX_RETRIES)
      .limit(50)
      .order('created_at', { ascending: true });

    if (workflowError) {
      console.error('Error seleccionando workflow_notifications pending:', workflowError);
    } else if (!workflowRows || workflowRows.length === 0) {
      console.info('✅ No hay emails pendientes en workflow_notifications');
    } else {
      for (const r of workflowRows) {
        try {
          const from = Deno.env.get('DEFAULT_FROM') ?? 'EcoSign <no-reply@email.ecosign.app>';
          const to = r.recipient_email;
          const subject = r.subject || 'Notificación EcoSign';
          const html = r.body_html || '<p>Notificación</p>';

          const result = await sendResendEmail({ from, to, subject, html });

          if (result.ok) {
            const upd = await supabase
              .from('workflow_notifications')
              .update({
                delivery_status: 'sent',
                sent_at: new Date().toISOString(),
                error_message: null,
                resend_email_id: result.id ?? null
              })
              .eq('id', r.id);

            if (upd.error) console.error('Error actualizando workflow_notifications a sent:', upd.error);
            else console.info(`Workflow email enviado fila ${r.id} resend_id ${result.id}`);
          } else {
            const retry = (r.retry_count ?? 0) + 1;
            const new_status = retry >= MAX_RETRIES ? 'failed' : 'pending';
            const upd = await supabase
              .from('workflow_notifications')
              .update({
                delivery_status: new_status,
                error_message: JSON.stringify(result.error ?? result.body ?? 'Unknown error'),
                retry_count: retry
              })
              .eq('id', r.id);

            console.error(`Error enviando workflow email fila ${r.id}:`, result.error ?? result.body);
            if (upd.error) console.error('Error actualizando workflow_notifications error:', upd.error);
          }
        } catch (innerErr) {
          console.error('Excepción procesando workflow_notifications:', innerErr);
        }
      }
    }

    console.log('🟢 send-pending-emails: finished');
    return new Response('Processed', { status: 200 });
  } catch (err) {
    console.error('Fatal en send-pending-emails:', err);
    return new Response('Error', { status: 500 });
  }
});
