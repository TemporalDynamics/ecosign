import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { requireInternalAuth } from "../_shared/internalAuth.ts";

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

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

  return jsonResponse(
    {
      success: false,
      error: "wake-authority is deprecated. Use runtime_tick / orchestrator internal pipeline."
    },
    410
  );
});
