#!/bin/bash
# Script para probar el flujo completo de Bitcoin Anchoring en EcoSign

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Test de Bitcoin Anchoring ===${NC}\n"

# 1. Obtener la URL del proyecto Supabase
SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}Error: No se pudo obtener SUPABASE_URL. ¿Está el proyecto iniciado?${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Supabase URL: $SUPABASE_URL${NC}"

# 2. Obtener anon key para las pruebas
ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
if [ -z "$ANON_KEY" ]; then
  echo -e "${RED}Error: No se pudo obtener ANON_KEY${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Anon Key obtenida${NC}\n"

# 3. Generar un hash de prueba (SHA-256 de un string aleatorio)
TEST_HASH=$(echo "test-document-$(date +%s)" | sha256sum | awk '{print $1}')
echo -e "${YELLOW}Hash de prueba generado:${NC} $TEST_HASH\n"

# 4. Llamar a anchor-bitcoin
echo -e "${YELLOW}Paso 1: Crear anchor en Bitcoin (estado: queued)...${NC}"
ANCHOR_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"documentHash\":\"$TEST_HASH\",\"userEmail\":\"test@ecosign.app\",\"metadata\":{\"source\":\"test-script\"}}" \
  "$SUPABASE_URL/functions/v1/anchor-bitcoin")

echo -e "${GREEN}Respuesta de anchor-bitcoin:${NC}"
echo "$ANCHOR_RESPONSE" | jq '.' 2>/dev/null || echo "$ANCHOR_RESPONSE"
echo ""

# Verificar si hubo error
if echo "$ANCHOR_RESPONSE" | grep -q '"error"'; then
  echo -e "${RED}Error al crear el anchor${NC}"
  exit 1
fi

# Extraer anchor_id
ANCHOR_ID=$(echo "$ANCHOR_RESPONSE" | jq -r '.anchor_id // empty' 2>/dev/null)
if [ -z "$ANCHOR_ID" ]; then
  echo -e "${RED}No se pudo obtener anchor_id de la respuesta${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Anchor creado con ID: $ANCHOR_ID${NC}\n"

# 5. Esperar un momento
echo -e "${YELLOW}Esperando 3 segundos antes de procesar...${NC}"
sleep 3

# 6. Llamar manualmente a process-bitcoin-anchors para procesar la cola
echo -e "${YELLOW}Paso 2: Procesar anchors pendientes (queued → pending)...${NC}"
PROCESS_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/functions/v1/process-bitcoin-anchors")

echo -e "${GREEN}Respuesta de process-bitcoin-anchors:${NC}"
echo "$PROCESS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROCESS_RESPONSE"
echo ""

# 7. Verificar el estado final del anchor
echo -e "${YELLOW}Paso 3: Verificar estado del anchor en la base de datos...${NC}"

# Usar el servicio de Supabase para consultar
SERVICE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')

ANCHOR_STATUS=$(curl -s -X GET \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "$SUPABASE_URL/rest/v1/anchors?id=eq.$ANCHOR_ID&select=*" | jq '.[0]' 2>/dev/null)

if [ -z "$ANCHOR_STATUS" ] || [ "$ANCHOR_STATUS" = "null" ]; then
  echo -e "${RED}No se pudo obtener el estado del anchor${NC}"
  exit 1
fi

echo -e "${GREEN}Estado del anchor:${NC}"
echo "$ANCHOR_STATUS" | jq '.'
echo ""

# Extraer valores importantes
CURRENT_STATUS=$(echo "$ANCHOR_STATUS" | jq -r '.anchor_status')
OTS_PROOF=$(echo "$ANCHOR_STATUS" | jq -r '.ots_proof // empty')

echo -e "${GREEN}=== Resumen del Test ===${NC}"
echo -e "Anchor ID:        $ANCHOR_ID"
echo -e "Hash:             $TEST_HASH"
echo -e "Estado actual:    $CURRENT_STATUS"
echo -e "OTS Proof:        ${OTS_PROOF:0:50}..."
echo ""

# Verificación de estados esperados
if [ "$CURRENT_STATUS" = "pending" ] || [ "$CURRENT_STATUS" = "confirmed" ]; then
  echo -e "${GREEN}✓ Test EXITOSO: El anchor pasó de 'queued' a '$CURRENT_STATUS'${NC}"
  echo -e "${YELLOW}Nota: OpenTimestamps puede tardar ~1 hora en confirmar en Bitcoin blockchain${NC}"
elif [ "$CURRENT_STATUS" = "queued" ]; then
  echo -e "${YELLOW}⚠ El anchor sigue en 'queued'. Posibles razones:${NC}"
  echo -e "  - El servicio OpenTimestamps no respondió"
  echo -e "  - Hay un error en la configuración de BITCOIN_OTS_CALENDAR"
  echo -e "  - La función process-bitcoin-anchors tuvo un error"
else
  echo -e "${RED}✗ Estado inesperado: $CURRENT_STATUS${NC}"
fi

echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "1. El cron ejecutará process-bitcoin-anchors cada 5 minutos automáticamente"
echo -e "2. Cuando OpenTimestamps confirme en Bitcoin (1-6 horas), el estado cambiará a 'confirmed'"
echo -e "3. Puedes verificar manualmente con:"
echo -e "   ${GREEN}supabase functions invoke process-bitcoin-anchors${NC}"
echo ""
echo -e "${YELLOW}Para ver los logs de las funciones:${NC}"
echo -e "   ${GREEN}supabase functions logs anchor-bitcoin${NC}"
echo -e "   ${GREEN}supabase functions logs process-bitcoin-anchors${NC}"
