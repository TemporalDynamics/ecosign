const DEFAULT_FROM = Deno.env.get('RESEND_FROM') || 'EcoSign <notificaciones@ecosign.app>';

// Robust helper for sending email via Resend
// Do NOT hardcode API keys here. Use RESEND_API_KEY env var.
export async function sendResendEmail({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; id?: string | null; statusCode?: number; body?: any; error?: string }> {
  const API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY no configurada' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!res.ok) {
      return { ok: false, statusCode: res.status, body, error: `Resend error ${res.status}` };
    }
    return { ok: true, id: body?.id ?? body?.message_id ?? null, body };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// Thin wrapper used across edge functions (returns success instead of ok)
export async function sendEmail(payload: { from?: string; to: string | string[]; subject: string; html: string }) {
  const res = await sendResendEmail({
    from: payload.from || DEFAULT_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
  return {
    success: res.ok,
    id: res.id,
    error: res.error,
    statusCode: res.statusCode,
  };
}

export function buildSignerInvitationEmail({
  signerEmail,
  documentName,
  signLink,
  expiresAt,
  senderName,
}: {
  signerEmail: string;
  documentName: string;
  signLink: string;
  expiresAt?: string | null;
  senderName?: string;
}) {
  const until = expiresAt ? new Date(expiresAt).toLocaleString('es-AR') : 'sin fecha de expiración';
  const sender = senderName || 'EcoSign';

  return {
    from: DEFAULT_FROM,
    to: signerEmail,
    subject: `Tienes un documento para revisar: ${documentName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f7f8fa;color:#0f172a;">
        <h2 style="margin:0 0 12px;font-size:20px;">Hola,</h2>
        <p style="margin:0 0 12px;">${sender} te envió un documento para revisar y firmar en EcoSign.</p>
        <p style="margin:0 0 12px;"><strong>${documentName}</strong></p>
        <a href="${signLink}" style="display:inline-block;margin:16px 0;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Abrir documento</a>
        <p style="margin:12px 0 0;font-size:12px;color:#475569;">El enlace vence: ${until}</p>
      </div>
    `,
  };
}

export function buildSignerOtpEmail({
  signerEmail,
  signerName,
  workflowTitle,
  otpCode,
}: {
  signerEmail: string;
  signerName?: string | null;
  workflowTitle: string;
  otpCode: string;
}) {
  const name = signerName || 'hola';
  return {
    from: DEFAULT_FROM,
    to: signerEmail,
    subject: 'Tu código de acceso seguro a EcoSign',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f7f8fa;color:#0f172a;">
        <p style="margin:0 0 8px;">${name}, usa este código para acceder al documento:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0 16px;color:#0ea5e9;">${otpCode}</div>
        <p style="margin:0 0 8px;">Documento: <strong>${workflowTitle}</strong></p>
        <p style="margin:0;font-size:12px;color:#475569;">El código expira en 10 minutos y es válido solo para esta revisión.</p>
      </div>
    `,
  };
}

export function buildDocumentSignedEmail({
  ownerEmail,
  documentName,
  signerName,
  signerEmail,
  signedAt,
  documentId,
}: {
  ownerEmail: string;
  documentName: string;
  signerName?: string | null;
  signerEmail: string;
  signedAt: string;
  documentId: string;
}) {
  const when = new Date(signedAt).toLocaleString('es-AR');
  return {
    from: DEFAULT_FROM,
    to: ownerEmail,
    subject: `Documento firmado: ${documentName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f7f8fa;color:#0f172a;">
        <h2 style="margin:0 0 12px;">Documento firmado</h2>
        <p style="margin:0 0 8px;">${signerName || signerEmail} completó la firma del documento <strong>${documentName}</strong>.</p>
        <p style="margin:0 0 8px;">Fecha: ${when}</p>
        <p style="margin:0;font-size:12px;color:#475569;">ID interno: ${documentId}</p>
      </div>
    `,
  };
}

export function buildSignerPackageEmail({
  signerEmail,
  signerName,
  documentName,
  downloadUrl,
  ecoUrl,
}: {
  signerEmail: string;
  signerName?: string | null;
  documentName: string;
  downloadUrl: string;
  ecoUrl?: string | null;
}) {
  const name = signerName || 'Hola';
  return {
    from: DEFAULT_FROM,
    to: signerEmail,
    subject: `Tu copia firmada: ${documentName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f7f8fa;color:#0f172a;">
        <p style="margin:0 0 8px;">${name}, aquí tienes tu copia final.</p>
        <p style="margin:0 0 12px;"><strong>${documentName}</strong></p>
        <a href="${downloadUrl}" style="display:inline-block;margin:12px 8px 12px 0;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Descargar PDF</a>
        ${ecoUrl ? `<a href="${ecoUrl}" style="display:inline-block;margin:12px 0;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Descargar ECO</a>` : ''}
        <p style="margin:12px 0 0;font-size:12px;color:#475569;">Incluye sellos forenses para no-repudio.</p>
      </div>
    `,
  };
}

export function buildDocumentCertifiedEmail({
  ownerEmail,
  ownerName,
  documentName,
  certifiedAt,
  documentId,
  hasForensicHardening,
  hasLegalTimestamp,
  hasPolygonAnchor
}: {
  ownerEmail: string;
  ownerName?: string | null;
  documentName: string;
  certifiedAt: string;
  documentId: string;
  hasForensicHardening: boolean;
  hasLegalTimestamp: boolean;
  hasPolygonAnchor: boolean;
}) {
  const name = ownerName || 'Hola';
  return {
    from: DEFAULT_FROM,
    to: ownerEmail,
    subject: `Certificado disponible: ${documentName}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f7f8fa;color:#0f172a;">
        <p style="margin:0 0 8px;">${name}, tu documento fue certificado.</p>
        <p style="margin:0 0 8px;"><strong>${documentName}</strong></p>
        <p style="margin:0 0 8px;">Fecha: ${new Date(certifiedAt).toLocaleString('es-AR')}</p>
        <ul style="margin:8px 0 12px;padding-left:16px;color:#0f172a;">
          <li>Hardening: ${hasForensicHardening ? 'Sí' : 'No'}</li>
          <li>Timestamp legal: ${hasLegalTimestamp ? 'Sí' : 'No'}</li>
          <li>Anchor Polygon: ${hasPolygonAnchor ? 'Sí' : 'No'}</li>
        </ul>
        <p style="margin:0;font-size:12px;color:#475569;">ID interno: ${documentId}</p>
      </div>
    `,
  };
}

export function buildFounderWelcomeEmail({
  userEmail,
  userName,
  dashboardUrl = 'https://ecosign.app/dashboard',
  docsUrl = 'https://ecosign.app/docs',
  supportUrl = 'https://ecosign.app/support'
}: {
  userEmail: string;
  userName?: string | null;
  dashboardUrl?: string;
  docsUrl?: string;
  supportUrl?: string;
}) {
  const name = userName || userEmail.split('@')[0];

  return {
    from: DEFAULT_FROM,
    to: userEmail,
    subject: 'Bienvenido a EcoSign',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      background-color: #ffffff;
      color: #0f172a;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      padding: 48px 32px 32px;
      border-bottom: 1px solid #e5e7eb;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #000000;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
    }
    .header p {
      font-size: 16px;
      color: #64748b;
      line-height: 1.5;
    }
    .badge-container {
      padding: 24px 32px;
      background-color: #fafafa;
      border-bottom: 1px solid #e5e7eb;
    }
    .founder-badge {
      display: inline-block;
      border: 2px solid #000000;
      color: #000000;
      padding: 8px 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .badge-subtitle {
      margin-top: 12px;
      font-size: 13px;
      color: #64748b;
    }
    .content {
      padding: 40px 32px;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 20px;
    }
    .content p {
      font-size: 15px;
      color: #475569;
      margin-bottom: 16px;
      line-height: 1.7;
    }
    .content strong {
      color: #0f172a;
      font-weight: 600;
    }
    .benefits {
      background-color: #fafafa;
      border-left: 2px solid #000000;
      padding: 24px;
      margin: 32px 0;
    }
    .benefits h3 {
      font-size: 15px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
    }
    .benefits ul {
      list-style: none;
      padding: 0;
    }
    .benefits li {
      padding: 6px 0;
      padding-left: 20px;
      position: relative;
      font-size: 14px;
      color: #475569;
      line-height: 1.6;
    }
    .benefits li:before {
      content: "—";
      position: absolute;
      left: 0;
      color: #000000;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background-color: #000000;
      color: #ffffff;
      padding: 14px 32px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      margin: 32px 0;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #1f2937;
    }
    .security-note {
      background-color: #fafafa;
      border: 1px solid #e5e7eb;
      padding: 20px;
      margin: 32px 0;
    }
    .security-note h4 {
      font-size: 14px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 8px;
    }
    .security-note p {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }
    .footer {
      background-color: #fafafa;
      padding: 32px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      font-size: 13px;
      color: #64748b;
      margin: 8px 0;
    }
    .footer a {
      color: #0f172a;
      text-decoration: none;
      font-weight: 500;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 32px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>Bienvenido a EcoSign</h1>
      <p>Tu sistema de certificación forense de documentos</p>
    </div>

    <!-- Founder Badge -->
    <div class="badge-container">
      <div class="founder-badge">FOUNDER</div>
      <p class="badge-subtitle">
        Como usuario fundador, sos parte de la construcción de EcoSign
      </p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2>Hola ${name},</h2>

      <p>
        Acabás de dar el primer paso hacia un sistema que te permite <strong>proteger tus documentos con certeza legal y técnica</strong>.
      </p>

      <p>
        EcoSign combina criptografía, timestamps legales RFC 3161 y anclaje blockchain para garantizar que tus documentos sean verificables, inmutables y válidos como evidencia.
      </p>

      <div class="divider"></div>

      <!-- Benefits -->
      <div class="benefits">
        <h3>Qué podés hacer ahora</h3>
        <ul>
          <li>Certificar documentos con firma criptográfica y timestamp legal</li>
          <li>Anclar en blockchain (Polygon y Bitcoin) para inmutabilidad</li>
          <li>Enviar documentos a firmar con SignNow (eIDAS, ESIGN, UETA)</li>
          <li>Verificar certificados .ECO offline con criptografía pública</li>
          <li>Descargar evidencia forense aceptable en tribunales</li>
        </ul>
      </div>

      <!-- Security Note -->
      <div class="security-note">
        <h4>Arquitectura Zero-Knowledge</h4>
        <p>
          Tus documentos nunca se almacenan en nuestros servidores. Solo generamos hashes criptográficos y certificados de integridad. Vos controlás completamente tus archivos.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" class="cta-button">Ir al Dashboard</a>
      </div>

      <p style="text-align: center; color: #64748b; font-size: 13px;">
        ¿Tenés dudas? Respondé este email o visitá nuestra <a href="${docsUrl}" style="color: #0f172a;">documentación</a>.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="font-weight: 600; color: #000000; margin-bottom: 12px;">
        EcoSign
      </p>
      <p>
        <a href="${dashboardUrl}">Dashboard</a> •
        <a href="${docsUrl}">Documentación</a> •
        <a href="${supportUrl}">Soporte</a>
      </p>
      <p style="margin-top: 16px; font-size: 12px;">
        Este email fue enviado a ${userEmail} porque creaste una cuenta en EcoSign.
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
        © 2025 EcoSign
      </p>
    </div>
  </div>
</body>
</html>
    `,
  };
}
