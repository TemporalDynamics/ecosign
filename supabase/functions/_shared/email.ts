import { renderTemplateFromFile } from './template-renderer.ts';

const DEFAULT_FROM =
  Deno.env.get('DEFAULT_FROM') ||
  Deno.env.get('RESEND_FROM') ||
  'EcoSign <notificaciones@ecosign.app>';
const DEFAULT_SITE_URL = Deno.env.get('SITE_URL') || 'https://ecosign.app';

function normalizeSiteUrl(siteUrl?: string | null) {
  const raw = siteUrl || DEFAULT_SITE_URL;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function deriveSiteUrlFromLink(link?: string | null) {
  if (!link) return null;
  try {
    return new URL(link).origin;
  } catch {
    return null;
  }
}

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

export async function buildSignerInvitationEmail({
  signerEmail,
  signerName,
  documentName,
  signLink,
  expiresAt,
  senderName,
  siteUrl,
}: {
  signerEmail: string;
  signerName?: string | null;
  documentName: string;
  signLink: string;
  expiresAt?: string | null;
  senderName?: string;
  siteUrl?: string | null;
}) {
  const until = expiresAt ? new Date(expiresAt).toLocaleString('es-AR') : 'sin fecha de expiracion';
  const sender = senderName || 'EcoSign';
  const resolvedSiteUrl = normalizeSiteUrl(siteUrl ?? deriveSiteUrlFromLink(signLink));
  const displayName = signerName || signerEmail;

  return {
    from: DEFAULT_FROM,
    to: signerEmail,
    subject: `Tenes un documento para firmar: ${documentName}`,
    html: await renderTemplateFromFile({
      templateName: 'firmante-invitacion.html',
      siteUrl: resolvedSiteUrl,
      variables: {
        display_name: displayName,
        document_name: documentName,
        sign_url: signLink,
        expiration_date: until,
        sender_name: sender,
      },
    }),
  };
}

export async function buildSignerOtpEmail({
  signerEmail,
  signerName,
  workflowTitle,
  otpCode,
  siteUrl,
}: {
  signerEmail: string;
  signerName?: string | null;
  workflowTitle: string;
  otpCode: string;
  siteUrl?: string | null;
}) {
  const name = signerName || 'Hola';
  const resolvedSiteUrl = normalizeSiteUrl(siteUrl);
  return {
    from: DEFAULT_FROM,
    to: signerEmail,
    subject: 'Tu codigo de acceso seguro a EcoSign',
    html: await renderTemplateFromFile({
      templateName: 'firmante-otp.html',
      siteUrl: resolvedSiteUrl,
      variables: {
        display_name: name,
        otp_code: otpCode,
        workflow_title: workflowTitle,
      },
    }),
  };
}

export async function buildDocumentSignedEmail({
  ownerEmail,
  documentName,
  signerName,
  signerEmail,
  signedAt,
  documentId,
  siteUrl,
}: {
  ownerEmail: string;
  documentName: string;
  signerName?: string | null;
  signerEmail: string;
  signedAt: string;
  documentId: string;
  siteUrl?: string | null;
}) {
  const when = new Date(signedAt).toLocaleString('es-AR');
  const resolvedSiteUrl = normalizeSiteUrl(siteUrl);
  return {
    from: DEFAULT_FROM,
    to: ownerEmail,
    subject: `Documento firmado: ${documentName}`,
    html: await renderTemplateFromFile({
      templateName: 'documento-firmado-resumen.html',
      siteUrl: resolvedSiteUrl,
      variables: {
        signer_name: signerName || signerEmail,
        signer_email: signerEmail,
        document_name: documentName,
        signed_at: when,
        document_id: documentId,
      },
    }),
  };
}

export async function buildSignerPackageEmail({
  signerEmail,
  signerName,
  documentName,
  downloadUrl,
  ecoUrl,
  siteUrl,
}: {
  signerEmail: string;
  signerName?: string | null;
  documentName: string;
  downloadUrl: string;
  ecoUrl?: string | null;
  siteUrl?: string | null;
}) {
  const name = signerName || 'Hola';
  const resolvedSiteUrl = normalizeSiteUrl(siteUrl ?? deriveSiteUrlFromLink(downloadUrl));
  return {
    from: DEFAULT_FROM,
    to: signerEmail,
    subject: `Tu copia firmada: ${documentName}`,
    html: await renderTemplateFromFile({
      templateName: 'firmante-confirmacion.html',
      siteUrl: resolvedSiteUrl,
      variables: {
        display_name: name,
        document_name: documentName,
        pdf_url: downloadUrl,
        ecox_url: ecoUrl ?? '',
      },
    }),
  };
}

export async function buildDocumentCertifiedEmail({
  ownerEmail,
  ownerName,
  documentName,
  certifiedAt,
  documentId,
  hasForensicHardening,
  hasLegalTimestamp,
  hasPolygonAnchor,
  siteUrl,
}: {
  ownerEmail: string;
  ownerName?: string | null;
  documentName: string;
  certifiedAt: string;
  documentId: string;
  hasForensicHardening: boolean;
  hasLegalTimestamp: boolean;
  hasPolygonAnchor: boolean;
  siteUrl?: string | null;
}) {
  const name = ownerName || 'Hola';
  const resolvedSiteUrl = normalizeSiteUrl(siteUrl);
  return {
    from: DEFAULT_FROM,
    to: ownerEmail,
    subject: `Certificado disponible: ${documentName}`,
    html: await renderTemplateFromFile({
      templateName: 'documento-certificado-resumen.html',
      siteUrl: resolvedSiteUrl,
      variables: {
        owner_name: name,
        document_name: documentName,
        certified_at: new Date(certifiedAt).toLocaleString('es-AR'),
        document_id: documentId,
        hardening: hasForensicHardening ? 'Si' : 'No',
        legal_timestamp: hasLegalTimestamp ? 'Si' : 'No',
        polygon_anchor: hasPolygonAnchor ? 'Si' : 'No',
      },
    }),
  };
}

export async function buildFounderWelcomeEmail({
  userEmail,
  userName,
  dashboardUrl = 'https://ecosign.app/dashboard',
  docsUrl = 'https://ecosign.app/docs',
  supportUrl = 'https://ecosign.app/support',
  founderNumber
}: {
  userEmail: string;
  userName?: string | null;
  dashboardUrl?: string;
  docsUrl?: string;
  supportUrl?: string;
  founderNumber?: string | number | null;
}) {
  const name = userName || userEmail.split('@')[0];
  const baseUrl = dashboardUrl.replace(/\/dashboard\/?$/, '');
  const siteUrl = normalizeSiteUrl(baseUrl);

  return {
    from: DEFAULT_FROM,
    to: userEmail,
    subject: 'Tu cuenta ya esta activa',
    html: await renderTemplateFromFile({
      templateName: 'founder-welcome.html',
      siteUrl,
      variables: {
        userName: name,
        dashboardUrl,
        docsUrl,
        supportUrl,
      },
    }),
  };
}
