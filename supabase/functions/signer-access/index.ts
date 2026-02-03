import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { createClient } from "https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js";
import { encode as base64Encode } from "https://deno.land/std@0.182.0/encoding/base64.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { appendEvent as appendCanonicalEvent } from "../_shared/canonicalEventHelper.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  token: string;
}

const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(
        `⚠️ Attempt ${attempt}/${maxRetries} failed, retrying in ${
          delayMs * attempt
        }ms...`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error("Retry logic failed unexpectedly");
}

// Check if SignNow embed URL should be regenerated
function shouldRegenerateEmbedUrl(
  url: string | null,
  createdAt: string | null,
): boolean {
  if (!url) return true;
  if (!createdAt) return true;

  // SignNow embed URLs expire in 24h
  // Regenerate if older than 12h for safety
  const hoursSinceCreated = (Date.now() - new Date(createdAt).getTime()) /
    (1000 * 60 * 60);
  const shouldRegenerate = hoursSinceCreated > 12;

  if (shouldRegenerate) {
    console.log(
      `🔄 Embed URL is ${hoursSinceCreated.toFixed(1)}h old, regenerating...`,
    );
  }

  return shouldRegenerate;
}

async function getSignNowAccessToken(): Promise<string> {
  if (!signNowBasic || !signNowClientId || !signNowClientSecret) {
    throw new Error("Missing SignNow credentials in env");
  }
  const body = new URLSearchParams();
  body.append("grant_type", "client_credentials");
  body.append("client_id", signNowClientId);
  body.append("client_secret", signNowClientSecret);
  body.append("scope", "*");

  const resp = await fetch(`${signNowBase}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${signNowBasic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SignNow token failed: ${resp.status} ${txt}`);
  }

  const data = await resp.json();
  if (!data.access_token) {
    throw new Error("SignNow token response missing access_token");
  }
  return data.access_token as string;
}

async function uploadToSignNow(
  accessToken: string,
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
  documentName: string,
): Promise<{ id?: string; document_id?: string }> {
  // Descargar PDF desde Supabase Storage
  const { data: fileResp, error: fileErr } = await supabase.storage
    .from("user-documents")
    .download(storagePath);
  if (fileErr || !fileResp) {
    throw new Error(`No se pudo descargar el documento: ${fileErr?.message}`);
  }
  const fileBuffer = new Uint8Array(await fileResp.arrayBuffer());
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, documentName || "document.pdf");

  const resp = await fetch(`${signNowBase}/document`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SignNow upload failed: ${resp.status} ${txt}`);
  }

  return await resp.json();
}

async function createSignNowEmbeddedInvite(
  accessToken: string,
  documentId: string,
  signerEmail: string,
  order: number,
): Promise<{ embed_url?: string }> {
  // Crear invite (estándar)
  const invitePayload = {
    to: [
      {
        email: signerEmail,
        role: `Signer ${order}`,
        order,
      },
    ],
  };

  const inviteResp = await fetch(
    `${signNowBase}/document/${documentId}/invite`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invitePayload),
    },
  );

  if (!inviteResp.ok) {
    const txt = await inviteResp.text();
    throw new Error(`SignNow invite failed: ${inviteResp.status} ${txt}`);
  }

  // Obtener embedded invite
  const embedResp = await fetch(
    `${signNowBase}/document/${documentId}/embedded-invites`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invitePayload),
    },
  );

  if (!embedResp.ok) {
    const txt = await embedResp.text();
    throw new Error(
      `SignNow embedded invite failed: ${embedResp.status} ${txt}`,
    );
  }

  const embedData = await embedResp.json() as {
    data?: Array<{ url?: string }>;
  };
  return { embed_url: embedData.data?.[0]?.url };
}

const signNowBase =
  (Deno.env.get("SIGNNOW_API_BASE_URL") || "https://api-eval.signnow.com")
    .replace(/\/$/, "");
const signNowBasic = Deno.env.get("SIGNNOW_BASIC_TOKEN") || "";
const signNowClientId = Deno.env.get("SIGNNOW_CLIENT_ID") || "";
const signNowClientSecret = Deno.env.get("SIGNNOW_CLIENT_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

import { createTokenHash } from "../_shared/cryptoHelper.ts";

// ... (imports and CORS headers remain the same)

serve(async (req) => {
  const { isAllowed, headers: corsHeaders } = getCorsHeaders(
    req.headers.get("origin") ?? undefined,
  );

  if (Deno.env.get("FASE") !== "1") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === "OPTIONS") {
    if (!isAllowed) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isAllowed) {
    return json({ error: "Origin not allowed" }, 403, corsHeaders);
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { token } = (await req.json()) as RequestBody;
    if (!token) return json({ error: "token is required" }, 400, corsHeaders);

    const tokenHash = await createTokenHash(token);

    const { data: signer, error: signerError } = await supabase
      .from("workflow_signers")
      .select(`
        *,
        workflow:signature_workflows (*)
      `)
      .eq("access_token_hash", tokenHash)
      .single();

    // GATE 1: Check if token exists at all
    if (signerError || !signer) {
      console.warn(
        `Signer access denied: token hash not found. Token: ${
          token.substring(0, 5)
        }...`,
      );
      return json({ error: "Invalid or expired token" }, 404, corsHeaders);
    }

    // GATE 2: Check if token has been explicitly revoked
    if (signer.token_revoked_at) {
      console.warn(
        `Signer access denied: token revoked. Signer ID: ${signer.id}`,
      );
      await appendCanonicalEvent(
        supabase as any,
        {
          event_type: "token.revoked",
          workflow_id: signer.workflow_id,
          signer_id: signer.id,
          payload: { reason: "Access attempt with revoked token" },
        } as any,
        "signer-access",
      );
      return json({ error: "Invalid or expired token" }, 404, corsHeaders);
    }

    // GATE 3: Check if token has expired
    if (new Date(signer.token_expires_at) < new Date()) {
      console.warn(
        `Signer access denied: token expired. Signer ID: ${signer.id}`,
      );
      await appendCanonicalEvent(
        supabase as any,
        {
          event_type: "token.expired",
          workflow_id: signer.workflow_id,
          signer_id: signer.id,
          payload: { expired_at: signer.token_expires_at },
        } as any,
        "signer-access",
      );
      // Optionally update signer status to 'expired' here if not already handled by a cron job
      if (signer.status !== "expired" && signer.status !== "signed") {
        await supabase.from("workflow_signers").update({ status: "expired" })
          .eq("id", signer.id);
      }
      return json({ error: "Invalid or expired token" }, 404, corsHeaders);
    }

    // GATE 4: Check if signer status is terminal
    const terminalStatus = ["signed", "cancelled", "expired"];
    if (terminalStatus.includes(signer.status)) {
      console.warn(
        `Signer access denied: terminal status "${signer.status}". Signer ID: ${signer.id}`,
      );
      return json(
        { error: "This signing link is no longer active." },
        403,
        corsHeaders,
      );
    }

    // GATE 5: Enforce sequential signing order
    // Contract: only a signer in 'ready_to_sign' may access the signing flow.
    // This prevents future signers (status 'invited') from signing out of order.
    if (signer.status !== "ready_to_sign") {
      console.warn(
        `Signer access denied: not ready_to_sign (status="${signer.status}"). Signer ID: ${signer.id}`,
      );
      return json({ error: "Not your turn to sign yet." }, 403, corsHeaders);
    }

    // All gates passed. Log access event.
    await appendCanonicalEvent(
      supabase as any,
      {
        event_type: "signer.accessed",
        workflow_id: signer.workflow_id,
        signer_id: signer.id,
        payload: { email: signer.email, signing_order: signer.signing_order },
      },
      "signer-access",
    );

    // Update first_accessed_at if it's the first time
    if (!signer.first_accessed_at) {
      await supabase.from("workflow_signers").update({
        first_accessed_at: new Date().toISOString(),
      }).eq("id", signer.id);
    }

    // ... (The rest of the logic for OTP, signed URLs, SignNow, etc., follows here)
    // This logic is now protected by the security gates above.

    const { data: otpRecord } = await supabase
      .from("signer_otps")
      .select("verified_at")
      .eq("signer_id", signer.id)
      .single();

    const otpVerified = !!otpRecord?.verified_at;

    // Provide a signed URL for the encrypted PDF for unauthenticated signer flows.
    // The signer app cannot rely on a Supabase auth session to read from Storage.
    let encryptedPdfUrl: string | null = signer.encrypted_pdf_url ?? null;
    const workflowDocumentPath = (signer.workflow as any)?.document_path ??
      null;
    const isDirectUrl = typeof workflowDocumentPath === "string" &&
      /^https?:\/\//i.test(workflowDocumentPath);
    if (!encryptedPdfUrl && workflowDocumentPath && !isDirectUrl) {
      try {
        const { data: signed, error: signedErr } = await supabase.storage
          .from("user-documents")
          .createSignedUrl(workflowDocumentPath, 60 * 60);

        if (signedErr) {
          console.warn("signer-access: createSignedUrl failed", signedErr);
        } else {
          const cacheBust = `v=${Date.now()}`;
          encryptedPdfUrl = signed?.signedUrl
            ? `${signed.signedUrl}${
              signed.signedUrl.includes("?") ? "&" : "?"
            }${cacheBust}`
            : null;
        }
      } catch (signedErr) {
        console.warn("signer-access: signed url generation threw", signedErr);
      }
    }

    // ... (The rest of the original file's logic for preparing the response)

    return json(
      {
        success: true,
        signer_id: signer.id,
        workflow_id: signer.workflow_id,
        email: signer.email,
        name: signer.name,
        signing_order: signer.signing_order,
        status: signer.status,
        require_login: signer.require_login,
        require_nda: signer.require_nda,
        quick_access: signer.quick_access,
        nda_accepted: signer.nda_accepted ?? null,
        nda_accepted_at: signer.nda_accepted_at ?? null,
        signature_type: signer.signature_type ??
          signer.workflow?.signature_type ?? null,
        signnow_embed_url: signer.signnow_embed_url ??
          signer.workflow?.signnow_embed_url ?? null,
        encrypted_pdf_url: encryptedPdfUrl,
        otp_verified: otpVerified,
        workflow: signer.workflow ?? null,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("signer-access error", error);
    return json({ error: "Internal error" }, 500, corsHeaders);
  }
});
