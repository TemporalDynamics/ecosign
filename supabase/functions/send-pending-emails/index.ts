// send-pending-emails robust version (TypeScript)
// Reemplazar en supabase/functions/send-pending-emails
//
// EMAIL DISPATCH CANON (v1)
// - A single workflow may emit at most ONE email per throttle window.
// - Priority emails (your_turn_to_sign) preempt all others.
// - Provider rate limits are absorbed by semantic throttling/cooldowns.
// - Edge functions should enqueue notifications; this dispatcher is the one that sends.
import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { createClient } from "https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js";
import { buildFounderWelcomeEmail, sendResendEmail } from "../_shared/email.ts";

const requireCronSecret = (req: Request) => {
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || provided !== cronSecret) {
    return new Response("Forbidden", { status: 403 });
  }
  return null;
};

serve(async (req: Request) => {
  if (Deno.env.get("FASE") !== "1") {
    return new Response("disabled", { status: 204 });
  }
  const authError = requireCronSecret(req);
  if (authError) return authError;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const MAX_RETRIES = 10;
  const BATCH_LIMIT = 5;
  const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
  // Canon: prevent burst per workflow (1 immediate email per signature).
  const WORKFLOW_THROTTLE_MS = 30 * 1000;

  const NOTIFICATION_PRIORITY: Record<string, number> = {
    your_turn_to_sign: 0,
    workflow_completed: 5,
    signature_completed: 10,
    creator_detailed_notification: 20,
  };

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  console.log("🟢 send-pending-emails: start");

  const nowIso = () => new Date().toISOString();
  const parseCooldownUntil = (raw: unknown): string | null => {
    if (!raw) return null;
    const text = String(raw);
    try {
      const parsed = JSON.parse(text);
      const until = parsed?.rate_limited_until;
      if (typeof until === "string" && until.length > 0) return until;
    } catch {
      // ignore
    }
    return null;
  };

  const isInCooldown = (untilIso: string | null) => {
    if (!untilIso) return false;
    const until = new Date(untilIso).getTime();
    return Number.isFinite(until) && Date.now() < until;
  };

  const rateLimitPayload = (details: Record<string, unknown>) =>
    JSON.stringify({
      kind: "rate_limited",
      status: 429,
      rate_limited_until: new Date(Date.now() + RATE_LIMIT_COOLDOWN_MS)
        .toISOString(),
      at: nowIso(),
      ...details,
    });
  try {
    const { data: rows, error } = await supabase
      .from("system_emails")
      .select("*")
      .eq("delivery_status", "pending")
      .lt("attempts", MAX_RETRIES)
      .limit(BATCH_LIMIT)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error seleccionando pending:", error);
      return new Response("Error consulta", { status: 500 });
    }

    if (!rows || rows.length === 0) {
      console.info("✅ No hay emails pendientes en system_emails");
    } else {
      for (const r of rows) {
        try {
          const cooldownUntil = parseCooldownUntil((r as any).error_message);
          if (isInCooldown(cooldownUntil)) {
            console.info("⏳ system_emails cooldown active, skipping", {
              id: r.id,
              until: cooldownUntil,
            });
            continue;
          }

          const from = Deno.env.get("DEFAULT_FROM") ??
            "EcoSign <no-reply@email.ecosign.app>";
          const to = r.recipient_email;
          let subject = r.subject || "Notificación EcoSign";
          let html = r.body_html || "<p>Notificación</p>";

          // Special handling for welcome_founder emails - generate HTML dynamically
          if (r.email_type === "welcome_founder") {
            const siteUrl = Deno.env.get("SITE_URL") || "https://ecosign.app";
            const meta = (r as any)?.metadata || {};
            const userName = meta.user_name || to.split("@")[0];
            const founderNumber = meta.founder_number ?? meta.founderNumber ??
              null;

            const welcomeEmail = await buildFounderWelcomeEmail({
              userEmail: to,
              userName,
              founderNumber,
              dashboardUrl: `${siteUrl}/dashboard`,
              docsUrl: `${siteUrl}/docs`,
              supportUrl: `${siteUrl}/support`,
            });

            subject = welcomeEmail.subject;
            html = welcomeEmail.html;
          }

          const result = await sendResendEmail({ from, to, subject, html });

          if (result.ok) {
            const upd = await supabase
              .from("system_emails")
              .update({
                delivery_status: "sent",
                sent_at: new Date().toISOString(),
                error_message: null,
              })
              .eq("id", r.id);

            if (upd.error) {
              console.error("Error actualizando a sent:", upd.error);
            } else {console.info(
                `Email enviado fila ${r.id} resend_id ${result.id}`,
              );}
          } else {
            if (result.statusCode === 429) {
              const payload = rateLimitPayload({
                source: "system_emails",
                error: result.error,
              });

              // Apply the same cooldown to the whole batch so we don't hammer Resend.
              const batchIds = rows.map((row: any) => row.id).filter(Boolean);
              await supabase
                .from("system_emails")
                .update({
                  delivery_status: "pending",
                  error_message: payload,
                })
                .in("id", batchIds);

              console.warn(
                "🛑 Resend 429 rate limit hit (system_emails). Backing off.",
              );
              return new Response("Rate limited", { status: 200 });
            }

            const retry = (r.attempts ?? 0) + 1;
            const new_status = retry >= MAX_RETRIES ? "failed" : "pending";
            const upd = await supabase
              .from("system_emails")
              .update({
                delivery_status: new_status,
                error_message: JSON.stringify(
                  result.error ?? result.body ?? "Unknown error",
                ),
                attempts: retry,
              })
              .eq("id", r.id);

            console.error(
              `Error enviando email fila ${r.id}:`,
              result.error ?? result.body,
            );
            if (upd.error) {
              console.error("Error actualizando fila error:", upd.error);
            }
          }
        } catch (innerErr) {
          console.error("Excepción procesando fila:", innerErr);
        }
      }
    }

    const { data: workflowRows, error: workflowError } = await supabase
      .from("workflow_notifications")
      .select("*")
      .eq("delivery_status", "pending")
      .lt("retry_count", MAX_RETRIES)
      .limit(BATCH_LIMIT)
      .order("created_at", { ascending: true });

    if (workflowError) {
      console.error(
        "Error seleccionando workflow_notifications pending:",
        workflowError,
      );
    } else if (!workflowRows || workflowRows.length === 0) {
      console.info("✅ No hay emails pendientes en workflow_notifications");
    } else {
      // Only attempt ONE email per workflow per run (avoid bursts).
      // Priority: your_turn_to_sign first, then the rest.
      const priority = (type: string | null | undefined) => {
        if (!type) return 100;
        return NOTIFICATION_PRIORITY[type] ?? 50;
      };

      const candidatesByWorkflow = new Map<string, any>();
      for (const row of workflowRows) {
        const wfId = (row as any).workflow_id;
        if (!wfId) continue;
        const existing = candidatesByWorkflow.get(wfId);
        if (!existing) {
          candidatesByWorkflow.set(wfId, row);
          continue;
        }
        const a = existing;
        const b = row;
        const pa = priority((a as any).notification_type);
        const pb = priority((b as any).notification_type);
        if (pb < pa) {
          candidatesByWorkflow.set(wfId, row);
          continue;
        }
        if (pb === pa) {
          const ca = new Date((a as any).created_at ?? 0).getTime();
          const cb = new Date((b as any).created_at ?? 0).getTime();
          if (cb < ca) candidatesByWorkflow.set(wfId, row);
        }
      }

      const candidates = Array.from(candidatesByWorkflow.values()).sort((a: any, b: any) => {
        const pa = priority(a.notification_type);
        const pb = priority(b.notification_type);
        if (pa !== pb) return pa - pb;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const isWorkflowThrottled = async (workflowId: string) => {
        const { data: lastSent, error: lastSentError } = await supabase
          .from("workflow_notifications")
          .select("sent_at")
          .eq("workflow_id", workflowId)
          .eq("delivery_status", "sent")
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSentError) return false;
        const sentAt = (lastSent as any)?.sent_at;
        if (!sentAt) return false;
        const ageMs = Date.now() - new Date(sentAt).getTime();
        return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < WORKFLOW_THROTTLE_MS;
      };

      for (const r of candidates) {
        try {
          const cooldownUntil = parseCooldownUntil((r as any).error_message);
          if (isInCooldown(cooldownUntil)) {
            console.info(
              "⏳ workflow_notifications cooldown active, skipping",
              { id: r.id, until: cooldownUntil },
            );
            continue;
          }

          // Per-workflow throttle to avoid 429 bursts.
          if ((r as any).workflow_id && await isWorkflowThrottled((r as any).workflow_id)) {
            console.info("⏳ workflow throttled, skipping", {
              workflow_id: (r as any).workflow_id,
              notification_id: r.id,
            });
            continue;
          }

          if (r.notification_type === "your_turn_to_sign" && r.signer_id) {
            const { data: signerStatus, error: signerStatusError } =
              await supabase
                .from("workflow_signers")
                .select("status")
                .eq("id", r.signer_id)
                .single();

            if (signerStatusError) {
              console.warn(
                "No se pudo validar estado del signer, se omite envío",
                signerStatusError,
              );
              continue;
            }

            if (signerStatus?.status !== "ready_to_sign") {
              console.info("Email omitido: signer no está listo para firmar", {
                signer_id: r.signer_id,
                status: signerStatus?.status,
                notification_id: r.id,
              });
              continue;
            }
          }

          const from = Deno.env.get("DEFAULT_FROM") ??
            "EcoSign <no-reply@email.ecosign.app>";
          const to = r.recipient_email;
          const subject = r.subject || "Notificación EcoSign";
          const html = r.body_html || "<p>Notificación</p>";

          const result = await sendResendEmail({ from, to, subject, html });

          if (result.ok) {
            const upd = await supabase
              .from("workflow_notifications")
              .update({
                delivery_status: "sent",
                sent_at: new Date().toISOString(),
                error_message: null,
                resend_email_id: result.id ?? null,
              })
              .eq("id", r.id);

            if (upd.error) {
              console.error(
                "Error actualizando workflow_notifications a sent:",
                upd.error,
              );
            } else {console.info(
                `Workflow email enviado fila ${r.id} resend_id ${result.id}`,
              );}
          } else {
            if (result.statusCode === 429) {
              const payload = rateLimitPayload({
                source: "workflow_notifications",
                error: result.error,
              });

              // Apply cooldown only to this workflow (avoid poisoning other workflows).
              const batchIds = workflowRows
                .filter((row: any) => row.workflow_id === (r as any).workflow_id)
                .map((row: any) => row.id)
                .filter(Boolean);
              await supabase
                .from("workflow_notifications")
                .update({
                  delivery_status: "pending",
                  error_message: payload,
                })
                .in("id", batchIds);

              console.warn(
                "🛑 Resend 429 rate limit hit (workflow_notifications). Backing off.",
              );
              return new Response("Rate limited", { status: 200 });
            }

            const retry = (r.retry_count ?? 0) + 1;
            const new_status = retry >= MAX_RETRIES ? "failed" : "pending";
            const upd = await supabase
              .from("workflow_notifications")
              .update({
                delivery_status: new_status,
                error_message: JSON.stringify(
                  result.error ?? result.body ?? "Unknown error",
                ),
                retry_count: retry,
              })
              .eq("id", r.id);

            console.error(
              `Error enviando workflow email fila ${r.id}:`,
              result.error ?? result.body,
            );
            if (upd.error) {
              console.error(
                "Error actualizando workflow_notifications error:",
                upd.error,
              );
            }
          }
        } catch (innerErr) {
          console.error(
            "Excepción procesando workflow_notifications:",
            innerErr,
          );
        }
      }
    }

    console.log("🟢 send-pending-emails: finished");
    return new Response("Processed", { status: 200 });
  } catch (err) {
    console.error("Fatal en send-pending-emails:", err);
    return new Response("Error", { status: 500 });
  }
});
