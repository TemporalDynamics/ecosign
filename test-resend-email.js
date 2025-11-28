/**
 * Script de prueba para verificar envío de emails con Resend
 *
 * Uso:
 * RESEND_API_KEY=re_xxxxx node test-resend-email.js test@example.com
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

async function testEmail(recipientEmail) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('❌ ERROR: RESEND_API_KEY no configurado');
    console.log('Uso: RESEND_API_KEY=re_xxxxx node test-resend-email.js test@example.com');
    process.exit(1);
  }

  if (!recipientEmail) {
    console.error('❌ ERROR: Email destinatario no proporcionado');
    console.log('Uso: RESEND_API_KEY=re_xxxxx node test-resend-email.js test@example.com');
    process.exit(1);
  }

  console.log('🧪 Iniciando prueba de envío de email...');
  console.log('📧 Destinatario:', recipientEmail);
  console.log('🔑 API Key:', resendApiKey.substring(0, 10) + '...');
  console.log('');

  const emailPayload = {
    from: 'EcoSign <no-reply@email.ecosign.app>',
    to: recipientEmail,
    subject: '🧪 Prueba de configuración de email - EcoSign',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prueba de Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #111827; margin-bottom: 20px;">✅ Prueba de Email Exitosa</h1>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
      Este es un email de prueba para verificar que la configuración de Resend está funcionando correctamente.
    </p>
    <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 16px; margin-top: 20px;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">
        <strong>✅ Configuración correcta:</strong><br>
        • Dominio: email.ecosign.app<br>
        • From: no-reply@email.ecosign.app<br>
        • Proveedor: Resend
      </p>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
      Si recibiste este email, significa que el servicio de email de EcoSign está funcionando correctamente.
    </p>
  </div>
</body>
</html>
    `
  };

  console.log('📤 Enviando email...');
  console.log('Payload:', JSON.stringify({
    from: emailPayload.from,
    to: emailPayload.to,
    subject: emailPayload.subject
  }, null, 2));
  console.log('');

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const responseData = await response.json();

    console.log('📥 Respuesta de Resend:');
    console.log('Status:', response.status, response.statusText);
    console.log('Body:', JSON.stringify(responseData, null, 2));
    console.log('');

    if (!response.ok) {
      console.error('❌ ERROR: Resend rechazó el email');
      console.error('Detalles:', responseData);
      process.exit(1);
    }

    console.log('✅ EMAIL ENVIADO EXITOSAMENTE');
    console.log('Email ID:', responseData.id);
    console.log('');
    console.log('🔍 Verificá tu bandeja de entrada (y spam) en:', recipientEmail);
    console.log('');
    console.log('📊 Podés ver el estado del email en el dashboard de Resend:');
    console.log('   https://resend.com/emails/' + responseData.id);

  } catch (error) {
    console.error('❌ ERROR AL ENVIAR EMAIL:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar prueba
const recipientEmail = process.argv[2];
testEmail(recipientEmail);
