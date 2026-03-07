/**
 * send-invariant-alert — P5.1 external alerting for invariant violations.
 *
 * Queries unacknowledged invariant_violations entries within the configured
 * time window and POSTs a summary to ALERT_WEBHOOK_URL (Slack-compatible
 * incoming webhook format).
 *
 * Environment variables:
 *   ALERT_WEBHOOK_URL      — Slack/Teams/generic webhook URL. If empty, request
 *                            is skipped gracefully (returns status=skipped).
 *   ALERT_WINDOW_MINUTES   — How far back to look for violations (default: 60).
 *   ALERT_MIN_SEVERITY     — Minimum severity to alert on: info|warning|error|critical
 *                            (default: critical).
 */

import { createClient } from 'https://esm.sh/v135/@supabase/supabase-js@2.39.0/dist/module/index.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALERT_WEBHOOK_URL = Deno.env.get('ALERT_WEBHOOK_URL') ?? '';
const ALERT_WINDOW_MINUTES = Number(Deno.env.get('ALERT_WINDOW_MINUTES') ?? '60');
const ALERT_MIN_SEVERITY = Deno.env.get('ALERT_MIN_SEVERITY') ?? 'critical';
// ALERT_JOB_TOKEN: if set, every request must present it via x-cron-secret header.
// Follows the cronInternal pattern used by other scheduled functions in this repo.
const ALERT_JOB_TOKEN = Deno.env.get('ALERT_JOB_TOKEN') ?? '';

const SEVERITY_RANK: Record<string, number> = { info: 0, warning: 1, error: 2, critical: 3 };

Deno.serve(async (req) => {
  // Auth: require x-cron-secret header when ALERT_JOB_TOKEN is configured
  if (ALERT_JOB_TOKEN) {
    const cronSecret = req.headers.get('x-cron-secret') ?? '';
    if (cronSecret !== ALERT_JOB_TOKEN) {
      return new Response(
        JSON.stringify({ status: 'unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Graceful no-op when webhook is not configured
  if (!ALERT_WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ status: 'skipped', reason: 'ALERT_WEBHOOK_URL not configured' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const since = new Date(Date.now() - ALERT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const minRank = SEVERITY_RANK[ALERT_MIN_SEVERITY] ?? 3;

  // Build severity filter: include all severities at or above the minimum level
  const severityFilter = Object.entries(SEVERITY_RANK)
    .filter(([, rank]) => rank >= minRank)
    .map(([sev]) => sev);

  const { data: violations, error } = await supabase
    .from('invariant_violations')
    .select('id, code, severity, source, message, occurrences, last_seen_at')
    .is('acknowledged_at', null)
    .gte('last_seen_at', since)
    .in('severity', severityFilter)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.error('[send-invariant-alert] DB error:', error.message);
    return new Response(
      JSON.stringify({ status: 'error', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!violations || violations.length === 0) {
    return new Response(
      JSON.stringify({ status: 'ok', sent: false, reason: 'no unacknowledged violations in window' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const lines = violations.map((v: any) =>
    `[${v.severity.toUpperCase()}] ${v.code} (${v.source})\n  ${v.message}\n  occurrences=${v.occurrences} last_seen=${v.last_seen_at}`
  ).join('\n\n');

  const payload = {
    text:
      `*EcoSign invariant alert* — ${violations.length} unacknowledged violation(s) in the last ${ALERT_WINDOW_MINUTES}m` +
      `\n\`\`\`\n${lines}\n\`\`\``,
    violations,
  };

  let alertStatus = 'sent';
  let alertError: string | null = null;

  try {
    const res = await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alertError = `webhook returned ${res.status}`;
      alertStatus = 'webhook_error';
    }
  } catch (e: any) {
    alertError = e.message;
    alertStatus = 'fetch_error';
  }

  return new Response(
    JSON.stringify({
      status: alertStatus,
      sent: alertStatus === 'sent',
      count: violations.length,
      error: alertError,
    }),
    {
      status: alertStatus === 'sent' ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    },
  );
});
