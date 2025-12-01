#!/bin/bash
# Script de diagnóstico completo para el flujo de emails

echo "=========================================="
echo "🔍 DIAGNÓSTICO DEL FLUJO DE EMAILS"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Paso 1: Verificando que send-pending-emails esté desplegada...${NC}"
supabase functions list | grep send-pending-emails
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ send-pending-emails está desplegada${NC}"
else
  echo -e "${RED}❌ send-pending-emails NO está desplegada${NC}"
  echo "Ejecuta: supabase functions deploy send-pending-emails"
fi
echo ""

echo -e "${YELLOW}Paso 2: Verificando RESEND_API_KEY...${NC}"
supabase secrets list | grep RESEND_API_KEY
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ RESEND_API_KEY está configurada${NC}"
else
  echo -e "${RED}❌ RESEND_API_KEY NO está configurada${NC}"
fi
echo ""

echo -e "${YELLOW}Paso 3: Creando script SQL de diagnóstico...${NC}"
cat > /tmp/check-notifications.sql << 'EOSQL'
-- Ver últimas notificaciones creadas
SELECT
  id,
  workflow_id,
  recipient_email,
  notification_type,
  delivery_status,
  error_message,
  retry_count,
  created_at,
  sent_at
FROM workflow_notifications
ORDER BY created_at DESC
LIMIT 10;

-- Contar por estado
SELECT
  delivery_status,
  COUNT(*) as count
FROM workflow_notifications
GROUP BY delivery_status;

-- Ver notificaciones pendientes hace más de 5 minutos
SELECT
  id,
  recipient_email,
  notification_type,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM workflow_notifications
WHERE delivery_status = 'pending'
  AND created_at < NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
EOSQL

echo -e "${GREEN}✅ Script SQL creado en /tmp/check-notifications.sql${NC}"
echo "Cópialo y pégalo en Supabase SQL Editor"
echo ""

echo -e "${YELLOW}Paso 4: Test de envío manual con test-email...${NC}"
echo "Ejecuta este comando reemplazando TU_EMAIL:"
echo ""
echo -e "${GREEN}curl -X POST \\"
echo "  'https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/test-email' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"to\": \"TU_EMAIL@gmail.com\", \"from\": \"EcoSign <no-reply@email.ecosign.app>\"}'${NC}"
echo ""

echo -e "${YELLOW}Paso 5: Disparar send-pending-emails manualmente...${NC}"
echo "Ejecuta: ./test-send-emails-manual.sh"
echo ""

echo "=========================================="
echo "📋 CHECKLIST DE DIAGNÓSTICO"
echo "=========================================="
echo ""
echo "1. ¿Usa multifirmas en la app y agrega emails?"
echo "2. ¿Se cierra el modal sin errores?"
echo "3. Ejecuta el SQL de arriba y verifica:"
echo "   - ¿Hay filas en workflow_notifications con delivery_status='pending'?"
echo "   - ¿Hay error_message en alguna fila?"
echo "4. Si hay pending hace más de 5 min, ejecuta:"
echo "   ./test-send-emails-manual.sh"
echo "5. Revisa logs de send-pending-emails en:"
echo "   https://supabase.com/dashboard/project/uiyojopjbhooxrmamaiw/functions/send-pending-emails/logs"
echo ""
echo "=========================================="
