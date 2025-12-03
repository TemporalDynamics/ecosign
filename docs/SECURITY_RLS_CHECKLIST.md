# Seguridad y RLS - Checklist rápido

## Variables críticas (ya cubierto)
- Claves y API keys via Supabase Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, claves Polygon/Bitcoin, etc.
- `.env` gitignored (verificar).

## Edge Functions - Validaciones mínimas
- Hash: 64 hex (anchor-polygon, anchor-bitcoin ✅).
- Email: validar formato en funciones que lo requieran (pendiente en algunas).
- Tamaño de documentos: validar en upload endpoints (pendiente si se usa función específica).

## RLS - Revisión sugerida
- Tablas sensibles: `anchors`, `user_documents`, `workflow_notifications`, `audit_logs`.
- Confirmar que `auth.uid() = user_id` o equivalente en SELECT/INSERT/UPDATE; service_role con policy abierta.
- Revisar policies heredadas de migraciones para invitados/links anónimos.

## Auditoría
- Tabla `audit_logs` creada (migration 20251202120000_add_audit_logs.sql):
  - Campos: user_id, action, metadata, ip_address, user_agent, created_at.
  - RLS: usuario ve sus logs; service_role puede insertar/actualizar.
- Integrar: registrar eventos clave (firma, creación de anchor, descargas) usando service role en backend.

## Índices mínimos (anchoring / notificaciones)
- anchors: índices existentes sobre anchor_status, polygon_status, document_hash, user_id; agregado composite con anchor_type (migration previa).
- workflow_notifications: índices sobre delivery_status/created_at ya en migraciones previas.

## Cron jobs
- Verificar: process-polygon-anchors (1m), process-bitcoin-anchors (5m), send-pending-emails (1m).
```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
```

## Próximos pasos sugeridos
- Añadir validación de email (regex simple) en funciones que consumen `userEmail`.
- Añadir límites de tamaño para uploads (según storage rules).
- Loggear en `audit_logs` acciones críticas desde service_role (firma, anclaje, descarga).
