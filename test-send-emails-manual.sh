#!/bin/bash
# Script para disparar manualmente send-pending-emails
# Esto te permitirá ver los logs en tiempo real

echo "🔍 Disparando send-pending-emails manualmente..."
echo ""

# Obtener el service role key
SERVICE_ROLE=$(supabase secrets list | grep SUPABASE_SERVICE_ROLE_KEY | awk '{print $3}')

if [ -z "$SERVICE_ROLE" ]; then
  echo "❌ No se pudo obtener SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Disparar la función
curl -X POST \
  "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails" \
  -H "Authorization: Bearer $SERVICE_ROLE" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo "✅ Función disparada. Revisa los logs en:"
echo "   https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions/send-pending-emails/logs"
