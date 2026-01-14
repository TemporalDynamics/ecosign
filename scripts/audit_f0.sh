#!/usr/bin/env bash
set -e

echo "=== Audit F0.1–F0.4 ==="

pass() { echo "[PASS] $1"; }
fail() { echo "[FAIL] $1"; exit 1; }

# F0.1 – Varianza
grep -q "WORKFLOW_STATUSES" supabase/functions/_shared/types.ts \
  && pass "F0.1 Varianza (types)" || fail "F0.1 Varianza"

# F0.2 – Incertidumbre
grep -q "workflow_notifications_step_check" supabase/migrations/*step* \
  && pass "F0.2 Incertidumbre (step + CHECK)" || fail "F0.2 Incertidumbre"

# F0.3 – Riesgo legal
grep -R "append_event_to_workflow_events" supabase \
  && pass "F0.3 Riesgo legal (events)" || fail "F0.3 Riesgo legal"

# F0.4 – Riesgo técnico
test -f supabase/functions/_shared/cryptoHelper.ts \
  && pass "F0.4 Crypto helper" || fail "F0.4 Crypto helper"

# F0.x – Costo cognitivo
test -f docs/contratos/NOTIFICATION_POLICY.md \
  && pass "F0.x Contratos" || fail "F0.x Contratos"

echo "=== AUDIT OK ==="
