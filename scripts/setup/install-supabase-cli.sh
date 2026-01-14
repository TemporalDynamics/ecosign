#!/bin/bash

# ============================================
# Install Supabase CLI on Linux
# ============================================

set -e

echo "🔧 Instalando Supabase CLI para Linux..."
echo ""

# Detect architecture
ARCH=$(uname -m)
echo "Arquitectura detectada: $ARCH"

# Determine the correct binary
if [ "$ARCH" = "x86_64" ]; then
    BINARY_NAME="supabase_linux_amd64.tar.gz"
elif [ "$ARCH" = "aarch64" ]; then
    BINARY_NAME="supabase_linux_arm64.tar.gz"
else
    echo "❌ Arquitectura no soportada: $ARCH"
    exit 1
fi

# Download latest version
echo ""
echo "📥 Descargando Supabase CLI..."
LATEST_VERSION=$(curl -s https://api.github.com/repos/supabase/cli/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
echo "Versión: $LATEST_VERSION"

DOWNLOAD_URL="https://github.com/supabase/cli/releases/download/${LATEST_VERSION}/${BINARY_NAME}"
echo "URL: $DOWNLOAD_URL"

cd /tmp
curl -L -o supabase.tar.gz "$DOWNLOAD_URL"

# Extract
echo ""
echo "📦 Extrayendo..."
tar -xzf supabase.tar.gz

# Install
echo ""
echo "📂 Instalando en /usr/local/bin/..."
sudo mv supabase /usr/local/bin/supabase
sudo chmod +x /usr/local/bin/supabase

# Clean up
rm supabase.tar.gz

# Verify
echo ""
echo "✅ Verificando instalación..."
supabase --version

echo ""
echo "🎉 ¡Supabase CLI instalado correctamente!"
echo ""
echo "Próximos pasos:"
echo "  1. supabase login"
echo "  2. supabase link --project-ref uiyojopjbhooxrmamaiw"
echo "  3. ./scripts/deploy-functions.sh"
echo ""
