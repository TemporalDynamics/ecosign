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
