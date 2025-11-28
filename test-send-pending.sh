#!/bin/bash

# Script para probar el envío de emails pendientes manualmente

echo "🧪 Probando función send-pending-emails..."
echo ""

# Obtener el project ref
PROJECT_REF="vvsxkudvbhdjpbygimzg"

echo "📡 Invocando función send-pending-emails..."
supabase functions invoke send-pending-emails \
  --project-ref $PROJECT_REF \
  --no-verify-jwt

echo ""
echo "✅ Función ejecutada. Revisá el output arriba para ver si hubo errores."
