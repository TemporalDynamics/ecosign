-- Insertar email de prueba para manuelsenorans3@gmail.com
INSERT INTO workflow_notifications (
  recipient_email,
  notification_type,
  subject,
  body_html,
  delivery_status
) VALUES (
  'manuelsenorans3@gmail.com',
  'test',
  '✅ Test EcoSign - mail.ecosign.app',
  '<h1>¡Configuración Exitosa! ✅</h1>
<p>Este email viene del dominio verificado <strong>mail.ecosign.app</strong></p>
<p>Si recibes este email en tu inbox (no en spam), significa que todo está funcionando perfectamente.</p>
<p>
  ✅ Polygon Anchoring: Funcionando<br>
  ✅ Bitcoin Anchoring: Funcionando<br>
  ✅ Sistema de Emails: Funcionando
</p>
<hr>
<p style="color: #666; font-size: 12px;">
  EcoSign - Certificación Forense de Documentos<br>
  www.ecosign.app
</p>',
  'pending'
);

-- Verificar que se creó
SELECT
  id,
  recipient_email,
  subject,
  delivery_status,
  created_at
FROM workflow_notifications
WHERE recipient_email = 'manuelsenorans3@gmail.com'
ORDER BY created_at DESC
LIMIT 1;
