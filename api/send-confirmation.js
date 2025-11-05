// netlify/functions/send-confirmation.js

// This is a template for email confirmation using Resend
// In production, you would install the Resend library and use your API key

exports.handler = async (event, context) => {
  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);

    // Validar datos requeridos
    if (!data.name || !data.email || !data.id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ error: 'Name, email and ID are required' })
      };
    }

    // Aquí iría la lógica para enviar el email usando Resend o similar
    // Por ahora, solo simulamos el envío
    console.log('Email confirmation would be sent to:', data.email, 'for NDA ID:', data.id);

    // En un sistema real:
    /*
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'NDA System <nda@yourdomain.com>',
      to: data.email,
      subject: 'Confirmación de NDA — Paradigma LTC',
      html: `<html>...</html>`
    });
    */

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        message: 'Confirmation email sent successfully'
      })
    };

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};