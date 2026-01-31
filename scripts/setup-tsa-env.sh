#!/bin/bash
# Script para configurar variables de entorno TSA
# Uso:
#   ./scripts/setup-tsa-env.sh           # Configura desarrollo local
#   ./scripts/setup-tsa-env.sh prod      # Configura producción (Supabase)

set -e

# Valores por defecto (puedes override con env vars)
TIMEOUT="${TSA_TIMEOUT_MS:-15000}"
URLS="${TSA_URLS:-https://freetsa.org/tsr}"

echo "======================================"
echo "TSA Environment Setup"
echo "======================================"
echo ""
echo "Configuración:"
echo "  TSA_TIMEOUT_MS=$TIMEOUT"
echo "  TSA_URLS=$URLS"
echo ""

# Producción (Supabase secrets)
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
  echo "🚀 Aplicando a PRODUCCIÓN (Supabase)..."
  echo ""
  
  # Verificar si supabase CLI está instalado
  if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI no está instalado"
    echo "   Instala con: npm install -g supabase"
    exit 1
  fi
  
  # Configurar secrets
  echo "Configurando secrets..."
  supabase secrets set TSA_TIMEOUT_MS="$TIMEOUT"
  supabase secrets set TSA_URLS="$URLS"
  
  echo ""
  echo "✅ Secrets configurados en producción"
  echo ""
  echo "⚠️  IMPORTANTE: Necesitas re-deployar las edge functions:"
  echo "   supabase functions deploy legal-timestamp"
  echo ""
  
  # Listar secrets
  echo "Secrets actuales:"
  supabase secrets list
  
# Desarrollo local (.env.local)
else
  echo "💻 Aplicando a DESARROLLO local..."
  echo ""
  
  ENV_FILE="supabase/.env.local"
  
  # Backup si existe
  if [ -f "$ENV_FILE" ]; then
    BACKUP="$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Creando backup: $BACKUP"
    cp "$ENV_FILE" "$BACKUP"
  fi
  
  # Crear archivo
  cat > "$ENV_FILE" << ENVEOF
# TSA Configuration
# Generado: $(date -Iseconds)

# Timeout para requests a TSA (en milisegundos)
# 15000 = 15 segundos (recomendado para TSAs rápidos)
# 30000 = 30 segundos (para TSAs lentos o con alta latencia)
TSA_TIMEOUT_MS=$TIMEOUT

# Lista de URLs de TSA (separadas por comas, sin espacios)
# El sistema intenta en orden hasta que una responda
# Formato: url1,url2,url3
TSA_URLS=$URLS

# Ejemplos con múltiples TSAs (descomenta y ajusta según necesites):
# TSA_URLS=https://timestamp.sectigo.com,https://freetsa.org/tsr,http://timestamp.digicert.com
# TSA_URLS=https://tsa-custom-1.com/tsr,https://tsa-custom-2.com/tsr,https://freetsa.org/tsr
ENVEOF
  
  echo "✅ Archivo creado: $ENV_FILE"
  echo ""
  echo "Para usar en desarrollo local:"
  echo "  supabase functions serve --env-file supabase/.env.local"
  echo ""
fi

echo "======================================"
echo "Configuración completada"
echo "======================================"
