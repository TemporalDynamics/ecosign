// Función de diagnóstico para probar envío de emails
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { sendResendEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, from } = await req.json();

    const defaultFrom = Deno.env.get('DEFAULT_FROM') ?? 'EcoSign <no-reply@email.ecosign.app>';
    const emailFrom = from || defaultFrom;

    console.log('📧 Testing email send...');
    console.log('From:', emailFrom);
    console.log('To:', to);

    const result = await sendResendEmail({
      from: emailFrom,
      to: to || 'test@example.com',
      subject: 'Test Email from EcoSign',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email sent at ${new Date().toISOString()}</p>
        <p><strong>From:</strong> ${emailFrom}</p>
        <p><strong>To:</strong> ${to}</p>
      `
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify({
        success: result.ok,
        from: emailFrom,
        to,
        result,
        message: result.ok
          ? `Email sent successfully! ID: ${result.id}`
          : `Failed to send email: ${result.error || JSON.stringify(result.body)}`
      }),
      {
        status: result.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
