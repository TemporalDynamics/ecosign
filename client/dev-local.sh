#!/bin/bash
# Helper script para desarrollo local
# Carga variables de .env y levanta Vite

set -a  # Export all variables
source .env
set +a

echo "🚀 Levantando servidor de desarrollo local..."
echo "📍 Supabase URL: $VITE_SUPABASE_URL"
echo ""

npm run dev
