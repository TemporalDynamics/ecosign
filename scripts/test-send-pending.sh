#!/bin/bash
# Invoca la función send-pending-emails en Supabase vía CLI.
# Uso:
#   PROJECT_REF=tu_project_ref ./test-send-pending.sh
PROJECT_REF="${PROJECT_REF:-}"
if [ -z "$PROJECT_REF" ]; then
  echo "❗ Debes exportar PROJECT_REF antes de ejecutar. Ejemplo:"
  echo "   PROJECT_REF=vvsxkudvbhdjpbygimzg ./test-send-pending.sh"
  exit 1
fi

echo "🔎 Invocando send-pending-emails en proyecto: $PROJECT_REF"
supabase functions invoke send-pending-emails --project-ref "$PROJECT_REF" --no-verify-jwt
RC=$?
echo "Código de salida del comando: $RC"
if [ $RC -ne 0 ]; then
  echo "❌ La invocación con la CLI falló. Intenta desde la UI de Supabase y copia los logs."
fi
