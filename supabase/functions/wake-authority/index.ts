import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { requireInternalAuth } from "../_shared/internalAuth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1`;

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function callFunction(name: string, body: Record<string, unknown>) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { error?: string }).error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data as Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204 });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = requireInternalAuth(req, { allowCronSecret: true });
  if (!auth.ok) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const source = typeof body?.source === "string" ? body.source : "wake-authority";

    const executorResult = await callFunction("fase1-executor", { source });
    const orchestratorResult = await callFunction("orchestrator", {
      action: "poll_jobs",
      source,
    });

    return jsonResponse({
      success: true,
      executor: executorResult,
      orchestrator: orchestratorResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
