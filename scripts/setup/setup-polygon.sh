#!/bin/bash

##
# Script de configuración de Polygon para EcoSign
# Configura las variables de entorno necesarias para el anclaje en blockchain
##

set -e

echo "🔷 Configuración de Polygon para EcoSign"
echo "========================================="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: Ejecuta este script desde la raíz del proyecto${NC}"
  exit 1
fi

# Función para preguntar con valor por defecto
ask_with_default() {
  local prompt="$1"
  local default="$2"
  local result

  if [ -n "$default" ]; then
    read -p "$prompt [$default]: " result
    echo "${result:-$default}"
  else
    read -p "$prompt: " result
    echo "$result"
  fi
}

echo -e "${YELLOW}📋 Necesitarás 3 valores para configurar Polygon:${NC}"
echo ""
echo "1. ALCHEMY_RPC_URL - URL del nodo RPC (de alchemy.com)"
echo "2. SPONSOR_PRIVATE_KEY - Private key de una wallet con POL"
echo "3. POLYGON_CONTRACT_ADDRESS - Dirección del contrato en Polygon"
echo ""

# Preguntar si quiere continuar
read -p "¿Deseas continuar? (s/n): " continue_setup
if [ "$continue_setup" != "s" ] && [ "$continue_setup" != "S" ]; then
  echo "Configuración cancelada"
  exit 0
fi

echo ""
echo "───────────────────────────────────────"
echo ""

# 1. ALCHEMY_RPC_URL
echo -e "${YELLOW}1. Alchemy RPC URL${NC}"
echo "   Obtén tu API key en: https://www.alchemy.com/"
echo "   Formato: https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY"
echo ""
ALCHEMY_RPC_URL=$(ask_with_default "ALCHEMY_RPC_URL" "")

if [ -z "$ALCHEMY_RPC_URL" ]; then
  echo -e "${RED}❌ ALCHEMY_RPC_URL es requerido${NC}"
  exit 1
fi

echo ""
echo "───────────────────────────────────────"
echo ""

# 2. SPONSOR_PRIVATE_KEY
echo -e "${YELLOW}2. Sponsor Private Key${NC}"
echo "   ${RED}⚠️  IMPORTANTE: Esta wallet debe tener POL para pagar gas${NC}"
echo "   Formato: 0x..."
echo ""
SPONSOR_PRIVATE_KEY=$(ask_with_default "SPONSOR_PRIVATE_KEY" "")

if [ -z "$SPONSOR_PRIVATE_KEY" ]; then
  echo -e "${RED}❌ SPONSOR_PRIVATE_KEY es requerido${NC}"
  exit 1
fi

# Validar que empiece con 0x
if [[ ! $SPONSOR_PRIVATE_KEY =~ ^0x ]]; then
  echo -e "${YELLOW}⚠️  La private key no empieza con 0x, agregándolo...${NC}"
  SPONSOR_PRIVATE_KEY="0x$SPONSOR_PRIVATE_KEY"
fi

echo ""
echo "───────────────────────────────────────"
echo ""

# 3. POLYGON_CONTRACT_ADDRESS
echo -e "${YELLOW}3. Polygon Contract Address${NC}"
echo "   Dirección del contrato de anclaje en Polygon"
echo "   Si no tienes uno, usa el contrato público de prueba"
echo ""
DEFAULT_CONTRACT="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
POLYGON_CONTRACT_ADDRESS=$(ask_with_default "POLYGON_CONTRACT_ADDRESS" "$DEFAULT_CONTRACT")

echo ""
echo "───────────────────────────────────────"
echo ""
echo -e "${GREEN}✅ Configuración lista${NC}"
echo ""
echo "Resumen:"
echo "  ALCHEMY_RPC_URL: $ALCHEMY_RPC_URL"
echo "  SPONSOR_PRIVATE_KEY: ${SPONSOR_PRIVATE_KEY:0:10}...${SPONSOR_PRIVATE_KEY: -4}"
echo "  POLYGON_CONTRACT_ADDRESS: $POLYGON_CONTRACT_ADDRESS"
echo ""

# Preguntar si quiere guardar
read -p "¿Guardar esta configuración en Supabase? (s/n): " save_config
if [ "$save_config" != "s" ] && [ "$save_config" != "S" ]; then
  echo ""
  echo "Configuración NO guardada."
  echo ""
  echo "Para guardar manualmente, ejecuta:"
  echo ""
  echo "  supabase secrets set ALCHEMY_RPC_URL=\"$ALCHEMY_RPC_URL\""
  echo "  supabase secrets set SPONSOR_PRIVATE_KEY=\"$SPONSOR_PRIVATE_KEY\""
  echo "  supabase secrets set POLYGON_CONTRACT_ADDRESS=\"$POLYGON_CONTRACT_ADDRESS\""
  echo ""
  exit 0
fi

echo ""
echo "🔄 Guardando secrets en Supabase..."
echo ""

# Guardar en Supabase
supabase secrets set ALCHEMY_RPC_URL="$ALCHEMY_RPC_URL"
supabase secrets set SPONSOR_PRIVATE_KEY="$SPONSOR_PRIVATE_KEY"
supabase secrets set POLYGON_CONTRACT_ADDRESS="$POLYGON_CONTRACT_ADDRESS"

echo ""
echo -e "${GREEN}✅ Variables de entorno configuradas en Supabase${NC}"
echo ""

# Listar secrets para verificar
echo "Verificando secrets guardados:"
supabase secrets list

echo ""
echo "────────────────────────────────────────────────────────"
echo ""
echo -e "${GREEN}🎉 ¡Configuración completa!${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. Asegúrate de que la wallet sponsor tenga al menos 0.5 POL"
echo "  2. Prueba el anclaje desde la aplicación"
echo "  3. Verifica las transacciones en https://polygonscan.com/"
echo ""
echo "Para ver tus secrets:"
echo "  supabase secrets list"
echo ""
