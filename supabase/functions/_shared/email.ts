/**
 * Email Service - Resend Integration
 *
 * Centraliza el envío de emails usando Resend API.
 * Configuración: Requiere RESEND_API_KEY en las variables de entorno.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

interface EmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string;
}

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Envía un email usando Resend API
 */
export async function sendEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.error('❌ RESEND_API_KEY no configurado');
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    console.log(`📧 Enviando email a: ${payload.to}`);

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error de Resend:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to send email'
      };
    }

    const data = await response.json();
    console.log(`✅ Email enviado exitosamente. ID: ${data.id}`);

    return {
      success: true,
      id: data.id
    };

  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Template: Invitación para firmar documento
 */
export function buildSignerInvitationEmail(params: {
  signerEmail: string;
  documentName: string;
  signLink: string;
  expiresAt: string;
  senderName?: string;
}): EmailPayload {
  const { signerEmail, documentName, signLink, expiresAt, senderName } = params;

  const expiryDate = new Date(expiresAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento para firmar</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                VerifySign
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                Tenés un documento para firmar
              </h2>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                ${senderName ? `<strong>${senderName}</strong> te envió` : 'Te enviaron'} el documento <strong>"${documentName}"</strong> para que lo revises y firmes.
              </p>

              <div style="background-color: #f3f4f6; border-left: 4px solid #111827; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>📄 Documento:</strong> ${documentName}
                </p>
                <p style="margin: 8px 0 0; color: #374151; font-size: 14px;">
                  <strong>⏰ Válido hasta:</strong> ${expiryDate}
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${signLink}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Revisar y firmar documento
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Al hacer clic en el botón, serás redirigido a una página segura donde podrás:
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.7;">
                <li>Revisar el documento completo</li>
                <li>Identificarte con tu información</li>
                <li>Aplicar tu firma digital</li>
              </ul>

              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
                <a href="${signLink}" style="color: #3b82f6; text-decoration: underline; word-break: break-all;">${signLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Este email fue enviado desde <strong>VerifySign</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Certificación y firma digital con blockchain
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return {
    from: 'VerifySign <no-reply@verifysign.app>',
    to: signerEmail,
    subject: `📄 Documento para firmar: ${documentName}`,
    html,
    reply_to: senderName ? undefined : 'soporte@verifysign.app'
  };
}

/**
 * Template: Confirmación de documento firmado
 */
export function buildDocumentSignedEmail(params: {
  ownerEmail: string;
  documentName: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  documentId: string;
}): EmailPayload {
  const { ownerEmail, documentName, signerName, signerEmail, signedAt, documentId } = params;

  const signedDate = new Date(signedAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const dashboardUrl = `${Deno.env.get('FRONTEND_URL') || 'https://verifysign.app'}/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento firmado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                VerifySign
              </h1>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background-color: #10b981; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                ✅ Documento firmado exitosamente
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                Tu documento fue firmado
              </h2>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                <strong>${signerName}</strong> (${signerEmail}) completó la firma del documento <strong>"${documentName}"</strong>.
              </p>

              <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>📄 Documento:</strong> ${documentName}
                </p>
                <p style="margin: 8px 0 0; color: #374151; font-size: 14px;">
                  <strong>✍️ Firmado por:</strong> ${signerName}
                </p>
                <p style="margin: 8px 0 0; color: #374151; font-size: 14px;">
                  <strong>📧 Email:</strong> ${signerEmail}
                </p>
                <p style="margin: 8px 0 0; color: #374151; font-size: 14px;">
                  <strong>🕐 Fecha y hora:</strong> ${signedDate}
                </p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Ver en mi Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Desde tu dashboard podés:
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.7;">
                <li>Descargar el archivo .ECO con todas las firmas</li>
                <li>Ver la cadena de custodia completa (ChainLog)</li>
                <li>Verificar el anclaje en Polygon blockchain</li>
                <li>Compartir el certificado de firma</li>
              </ul>

              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
                  <strong>🔒 Seguridad:</strong> La firma fue registrada con sello de tiempo legal y anclada en blockchain para garantizar su inmutabilidad.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Este email fue enviado desde <strong>VerifySign</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Certificación y firma digital con blockchain
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return {
    from: 'VerifySign <no-reply@verifysign.app>',
    to: ownerEmail,
    subject: `✅ Documento firmado: ${documentName}`,
    html
  };
}

/**
 * Template: Documento certificado listo
 */
export function buildDocumentCertifiedEmail(params: {
  ownerEmail: string;
  ownerName?: string;
  documentName: string;
  certifiedAt: string;
  documentId: string;
  hasForensicHardening: boolean;
  hasLegalTimestamp: boolean;
  hasPolygonAnchor: boolean;
}): EmailPayload {
  const {
    ownerEmail,
    ownerName,
    documentName,
    certifiedAt,
    documentId,
    hasForensicHardening,
    hasLegalTimestamp,
    hasPolygonAnchor
  } = params;

  const certDate = new Date(certifiedAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const dashboardUrl = `${Deno.env.get('FRONTEND_URL') || 'https://verifysign.app'}/dashboard`;

  const forensicBadges = [];
  if (hasLegalTimestamp) {
    forensicBadges.push('<span style="display: inline-block; background-color: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-right: 8px; margin-bottom: 8px;">✅ RFC 3161 Timestamp</span>');
  }
  if (hasPolygonAnchor) {
    forensicBadges.push('<span style="display: inline-block; background-color: #8b5cf6; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-right: 8px; margin-bottom: 8px;">🔗 Polygon Blockchain</span>');
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento certificado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                VerifySign
              </h1>
            </td>
          </tr>

          <!-- Success Banner -->
          <tr>
            <td style="background-color: #06b6d4; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 500;">
                🎉 Tu documento fue certificado exitosamente
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                ${ownerName ? `Hola ${ownerName}` : 'Hola'}, tu documento está listo
              </h2>

              <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                El documento <strong>"${documentName}"</strong> fue certificado digitalmente y está disponible en tu dashboard.
              </p>

              <div style="background-color: #f3f4f6; border-left: 4px solid #06b6d4; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  <strong>📄 Documento:</strong> ${documentName}
                </p>
                <p style="margin: 8px 0 0; color: #374151; font-size: 14px;">
                  <strong>🕐 Certificado el:</strong> ${certDate}
                </p>
                ${hasForensicHardening ? `
                <p style="margin: 12px 0 8px; color: #374151; font-size: 14px;">
                  <strong>🛡️ Blindaje Forense:</strong>
                </p>
                <div style="margin-top: 8px;">
                  ${forensicBadges.join('\n                  ')}
                </div>
                ` : ''}
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #06b6d4; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
                      Ver en mi Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Desde tu dashboard podés:
              </p>
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.7;">
                <li>Descargar el PDF firmado con hoja de auditoría</li>
                <li>Descargar el certificado .ECO con todas las firmas</li>
                <li>Ver la cadena de custodia completa (ChainLog)</li>
                <li>Generar links de firma para otras personas</li>
                <li>Verificar la autenticidad del documento</li>
              </ul>

              ${hasForensicHardening ? `
              <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; color: #065f46; font-size: 13px; line-height: 1.5;">
                  <strong>🔒 Máxima Seguridad:</strong> Tu documento está protegido con ${hasLegalTimestamp ? 'timestamp legal RFC 3161' : 'timestamp digital'}${hasPolygonAnchor ? ' y anclaje en Polygon blockchain' : ''}, garantizando su autenticidad e inmutabilidad.
                </p>
              </div>
              ` : ''}

              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; line-height: 1.5;">
                  <strong>💡 Tip:</strong> Guardá una copia del archivo .ECO junto con el PDF. El .ECO contiene toda la información forense necesaria para verificar la autenticidad del documento en cualquier momento.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                Este email fue enviado desde <strong>VerifySign</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Certificación y firma digital con blockchain
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return {
    from: 'VerifySign <no-reply@verifysign.app>',
    to: ownerEmail,
    subject: `🎉 Tu documento "${documentName}" fue certificado`,
    html
  };
}
