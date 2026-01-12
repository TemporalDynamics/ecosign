#!/bin/bash

# ============================================
# Deploy Edge Functions to Supabase
# ============================================

set -e  # Exit on error

echo "🚀 VerifySign - Deploy Edge Functions"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI no está instalado${NC}"
    echo ""
    echo "Instalando Supabase CLI..."
    npm install -g supabase
    echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
    echo ""
fi

# Check if logged in
echo "🔐 Verificando autenticación..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás autenticado en Supabase${NC}"
    echo ""
    echo "Ejecuta: supabase login"
    exit 1
fi
echo -e "${GREEN}✅ Autenticado${NC}"
echo ""

# Project ref - Proyecto actual
PROJECT_REF="uiyojopjbhooxrmamaiw"

# Check if linked
echo "🔗 Verificando conexión al proyecto..."
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Proyecto no vinculado${NC}"
    echo ""
    echo "Vinculando al proyecto $PROJECT_REF..."
    supabase link --project-ref $PROJECT_REF
    echo -e "${GREEN}✅ Proyecto vinculado${NC}"
else
    echo -e "${GREEN}✅ Proyecto ya vinculado${NC}"
fi
echo ""

# Deploy functions
echo "📦 Desplegando Edge Functions..."
echo ""

FUNCTIONS=("anchor-bitcoin" "signnow" "process-bitcoin-anchors")

for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Desplegando $func...${NC}"

    if supabase functions deploy $func --project-ref $PROJECT_REF; then
        echo -e "${GREEN}✅ $func desplegado correctamente${NC}"
    else
        echo -e "${RED}❌ Error desplegando $func${NC}"
        exit 1
    fi
    echo ""
done

echo ""
echo -e "${GREEN}🎉 ¡Todas las funciones desplegadas exitosamente!${NC}"
echo ""
echo "📋 Próximos pasos:"
echo "  1. Configurar variables de entorno en Supabase Dashboard"
echo "  2. Aplicar migraciones de base de datos (ver DEPLOY_QUICKSTART.md)"
echo "  3. Probar las funciones desde la app"
echo ""
echo "Ver logs: https://supabase.com/dashboard/project/$PROJECT_REF/functions"
echo ""
