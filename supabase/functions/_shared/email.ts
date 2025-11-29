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
