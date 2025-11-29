// Script de prueba para enviar un email usando Resend API.
// Uso local:
// RESEND_API_KEY=re_xxx node test-resend-email.js destinatario@correo.com
const [,, recipient] = process.argv;
if (!recipient) {
  console.error('Uso: RESEND_API_KEY=<tu_key> node test-resend-email.js destinatario@ejemplo.com');
  process.exit(1);
}
const API_KEY = process.env.RESEND_API_KEY;
if (!API_KEY) {
  console.error('❌ Debes exportar RESEND_API_KEY antes de ejecutar (ej: RESEND_API_KEY=re_xxx ...)');
  process.exit(1);
}
const RESEND_URL = 'https://api.resend.com/emails';

(async () => {
  try {
    const body = {
      from: process.env.DEFAULT_FROM || 'EcoSign <no-reply@email.ecosign.app>',
      to: [recipient],
      subject: 'Prueba de envío desde Resend',
      html: '<p>Hola — esto es una prueba de <b>Resend</b> para verificar la API y el dominio.</p>'
    };

    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    console.log('HTTP', res.status, res.statusText);
    try { console.log('Respuesta JSON:', JSON.parse(text)); } catch (e) { console.log('Respuesta:', text); }

    if (res.ok) {
      console.log('✅ Petición enviada correctamente. Revisa la bandeja del destinatario (inbox y spam).');
    } else {
      console.log('❌ Error en Resend. Copia la respuesta completa arriba y pégala aquí.');
    }
  } catch (err) {
    console.error('❌ Error ejecutando la petición:', err);
  }
})();
