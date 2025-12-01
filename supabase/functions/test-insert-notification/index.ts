import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Insertando notificación de prueba para manuelsenorans3@gmail.com');

    const { data, error } = await supabase
      .from('workflow_notifications')
      .insert({
        recipient_email: 'manuelsenorans3@gmail.com',
        notification_type: 'system',
        subject: '✅ Test EcoSign - mail.ecosign.app',
        body_html: '<h1>¡Configuración Exitosa! ✅</h1><p>Este email viene del dominio verificado <strong>mail.ecosign.app</strong></p><p>Si recibes este email en tu inbox (no en spam), significa que todo está funcionando perfectamente.</p><p>✅ Polygon Anchoring: Funcionando<br>✅ Bitcoin Anchoring: Funcionando<br>✅ Sistema de Emails: Funcionando</p><hr><p style="color: #666; font-size: 12px;">EcoSign - Certificación Forense de Documentos<br>www.ecosign.app</p>',
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error al insertar:', error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Notificación creada:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificación de prueba creada exitosamente',
        notification: data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error general:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
