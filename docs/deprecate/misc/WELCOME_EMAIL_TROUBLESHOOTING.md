# Welcome Email System - Troubleshooting Log (2025-12-19)

## Problemas encontrados durante testing

### 1. Error: Column "metadata" does not exist
**Error**: `column "metadata" of relation "workflow_notifications" does not exist`

**Causa**: La función `process_welcome_email_queue()` intentaba insertar en columna `metadata` que no existe en `workflow_notifications`.

**Solución**: Modificar función para NO usar `metadata`:
```sql
CREATE OR REPLACE FUNCTION public.process_welcome_email_queue() ...
-- Remover jsonb_build_object con metadata del INSERT
```

### 2. Error: workflow_id NOT NULL constraint
**Error**: `null value in column "workflow_id" of relation "workflow_notifications" violates not-null constraint`

**Causa**: La tabla `workflow_notifications` tiene `workflow_id NOT NULL`, pero emails de sistema (welcome_founder) no están asociados a un workflow.

**Solución**: Hacer columna nullable:
```sql
ALTER TABLE public.workflow_notifications
ALTER COLUMN workflow_id DROP NOT NULL;
```

### 3. Trigger no se dispara para usuarios ya confirmados
**Problema**: Usuarios con `email_confirmed_at` ya confirmado no disparan el trigger.

**Causa**: Trigger solo se dispara en transición NULL → timestamp (primera confirmación).

**Solución**: Para testing, insertar manualmente en `welcome_email_queue`:
```sql
INSERT INTO public.welcome_email_queue (user_id, user_email, user_name, status)
SELECT id, email, 'Name', 'pending'
FROM auth.users WHERE email = 'test@example.com';

SELECT public.process_welcome_email_queue();
```

## Migraciones necesarias

Crear migración para arreglar schema en producción:

```sql
-- Archivo: supabase/migrations/20251219150000_fix_welcome_email_system.sql

-- 1. Hacer workflow_id nullable (emails de sistema no tienen workflow)
ALTER TABLE public.workflow_notifications
ALTER COLUMN workflow_id DROP NOT NULL;

-- 2. Actualizar función process_welcome_email_queue (sin metadata)
CREATE OR REPLACE FUNCTION public.process_welcome_email_queue()
RETURNS void AS $$
DECLARE
  queue_record RECORD;
BEGIN
  FOR queue_record IN
    SELECT * FROM public.welcome_email_queue
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC LIMIT 10
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE public.welcome_email_queue
      SET attempts = attempts + 1
      WHERE id = queue_record.id;

      INSERT INTO public.workflow_notifications (
        recipient_email, notification_type, subject, body_html, delivery_status
      )
      SELECT queue_record.user_email, 'welcome_founder', 'Bienvenido a EcoSign', '', 'pending'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.workflow_notifications
        WHERE recipient_email = queue_record.user_email AND notification_type = 'welcome_founder'
      );

      UPDATE public.welcome_email_queue
      SET status = 'sent', sent_at = NOW()
      WHERE id = queue_record.id;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.welcome_email_queue
      SET status = 'failed', error_message = SQLERRM
      WHERE id = queue_record.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Estado final
- ✅ workflow_id nullable
- ✅ Función corregida sin metadata
- ⏳ Esperando confirmación de email enviado

## Testing
Usuario de prueba: manus1986@gmail.com
