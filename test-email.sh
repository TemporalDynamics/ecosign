#!/bin/bash
# Test de envío de email - EcoSign
# Reemplaza TU_EMAIL con tu email real antes de ejecutar

EMAIL_DESTINO="tu-email@gmail.com"  # ← CAMBIA ESTO

echo "🧪 Creando notificación de prueba..."
echo "📧 Email destino: $EMAIL_DESTINO"
echo ""

curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/rest/v1/workflow_notifications" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"recipient_email\": \"$EMAIL_DESTINO\",
    \"notification_type\": \"test\",
    \"subject\": \"✅ Test EcoSign - mail.ecosign.app\",
    \"body_html\": \"<h1>¡Configuración Exitosa! ✅</h1><p>Este email viene del dominio verificado <strong>mail.ecosign.app</strong></p><p>Si lo recibes en tu inbox (no en spam), significa que todo está funcionando perfectamente.</p><hr><p style='color: #666; font-size: 12px;'>EcoSign - Certificación Forense de Documentos</p>\",
    \"delivery_status\": \"pending\"
  }"

echo ""
echo ""
echo "✅ Notificación creada!"
echo ""
echo "⏰ Ahora hay 2 opciones:"
echo "1. Esperar 1 minuto (el cron enviará automáticamente)"
echo "2. Ejecutar manualmente el worker ahora:"
echo ""
echo "   curl -X POST https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/send-pending-emails"
echo ""
