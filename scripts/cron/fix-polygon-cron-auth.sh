#!/bin/bash
# =====================================================================
# FIX: Polygon Anchoring Cron Job Authentication
# =====================================================================
# Fecha: 2026-01-11
# Problema: Cron job falla con "app.settings.service_role_key" no existe
# Solución: Recrear cron con service_role_key hardcodeado
# =====================================================================

set -e

PROJECT_REF="uiyojopjbhooxrmamaiw"

echo "🔧 Fixing process-polygon-anchors cron job authentication..."
echo ""

# Obtener service_role_key usando Supabase CLI
echo "📋 Step 1: Getting service_role_key from Supabase..."
SERVICE_ROLE_KEY=$(supabase status --project-ref $PROJECT_REF | grep "service_role key" | awk '{print $NF}')

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ ERROR: Could not get service_role_key"
  echo "Please get it manually from: Dashboard → Settings → API → service_role"
  exit 1
fi

echo "✅ Got service_role_key: ${SERVICE_ROLE_KEY:0:20}..."
echo ""

# Generar SQL para recrear el cron job
echo "📝 Step 2: Generating SQL to recreate cron job..."

cat > /tmp/fix-polygon-cron.sql <<EOF
-- Eliminar cron job actual (el que falla)
SELECT cron.unschedule('process-polygon-anchors');

-- Recrear con service_role_key correcto
SELECT cron.schedule(
  'process-polygon-anchors',
  '*/1 * * * *',
  \$\$
    SELECT net.http_post(
      url := 'https://${PROJECT_REF}.supabase.co/functions/v1/process-polygon-anchors',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ${SERVICE_ROLE_KEY}'
      )
    );
  \$\$
);

-- Verificar que quedó activo
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'process-polygon-anchors';
EOF

echo "✅ SQL generated at: /tmp/fix-polygon-cron.sql"
echo ""

echo "📤 Step 3: SQL to execute in Supabase Dashboard:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat /tmp/fix-polygon-cron.sql
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next steps:"
echo "1. Copy the SQL above"
echo "2. Go to: Dashboard → SQL Editor"
echo "3. Paste and execute"
echo "4. Should return: process-polygon-anchors | */1 * * * * | true"
echo ""
echo "✅ After that, wait 2 minutes and verify:"
echo ""
echo "SELECT jobid, status, return_message, start_time"
echo "FROM cron.job_run_details"
echo "WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-polygon-anchors')"
echo "ORDER BY runid DESC"
echo "LIMIT 5;"
echo ""
echo "Expected: status = 'succeeded' ✅"
