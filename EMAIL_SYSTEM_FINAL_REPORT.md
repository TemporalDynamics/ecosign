# 📧 Sistema de Emails EcoSign - Reporte Final

**Fecha**: 2025-11-28
**Estado**: ✅ **COMPLETADO Y FUNCIONANDO**
**Proyecto**: uiyojopjbhooxrmamaiw

---

## ✅ Resumen Ejecutivo

El sistema de notificaciones por email con Resend está **100% funcional** y listo para producción.

### Pruebas Realizadas
- ✅ Test directo API Resend: **EXITOSO** (HTTP 200, email recibido)
- ✅ Test flujo completo BD → Function → Email: **EXITOSO**
- ✅ Email llegó a destinatario (Gmail Promociones)
- ✅ Estados actualizados correctamente en BD

---

## 🏗️ Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE EMAILS                          │
└─────────────────────────────────────────────────────────────┘

1. CREATE NOTIFICATION
   │
   ├─ Edge Function (ej: create-signer-link)
   │   └─> INSERT workflow_notifications
   │       delivery_status = 'pending'
   │       retry_count = 0
   │
2. PROCESS PENDING
   │
   ├─ Supabase pg_cron (cada 5 min)
   │   └─> Invoke send-pending-emails
   │
3. SEND VIA RESEND
   │
   ├─ send-pending-emails Function
   │   ├─> SELECT * WHERE delivery_status='pending'
   │   ├─> sendResendEmail() para cada fila
   │   └─> UPDATE delivery_status
   │       ├─ 'sent' si OK (guardar resend_email_id)
   │       ├─ 'pending' si falla y retry_count < 3
   │       └─ 'failed' si retry_count >= 3
   │
4. DELIVERY
   │
   └─ Resend → Gmail/Outlook/etc
       └─> Email en bandeja (o Promociones)
```

---

## 📊 Cambios Implementados

### 1. Migraciones de Base de Datos

| Migración | Descripción | Estado |
|-----------|-------------|--------|
| `20251128000001_ensure_uuid_extension.sql` | Asegurar extensiones UUID | ✅ Aplicada |
| `20251128000002_add_retry_count.sql` | Agregar columna retry_count | ✅ Aplicada |
| `20251128000003_alter_notification_type_constraint.sql` | Permitir tipos: signature_request, signature_reminder, system, other | ✅ Aplicada |
| `20251128000004_cleanup_and_optimize_notifications.sql` | Índices de performance + documentación | ✅ Aplicada |

### 2. Índices de Performance

```sql
-- Acelera SELECT de pending emails (usado por cron)
CREATE INDEX idx_notifications_status_created
  ON workflow_notifications (delivery_status, created_at);

-- Búsqueda rápida por email
CREATE INDEX idx_notifications_recipient_email
  ON workflow_notifications (recipient_email);

-- Auditoría por workflow
CREATE INDEX idx_notifications_workflow_id
  ON workflow_notifications (workflow_id);
```

**Beneficio**: Consultas rápidas incluso con 100,000+ filas

### 3. Edge Function: send-pending-emails

**Archivo**: `supabase/functions/send-pending-emails/index.ts`

**Características**:
- ✅ Procesa hasta 50 emails por ejecución
- ✅ Retry automático (máx 3 intentos)
- ✅ Logging detallado
- ✅ Manejo robusto de errores
- ✅ Actualización atómica de estados

**Lógica de Retry**:
```typescript
retry_count = 0 → Intento 1 → Si falla: retry_count = 1, status = 'pending'
retry_count = 1 → Intento 2 → Si falla: retry_count = 2, status = 'pending'
retry_count = 2 → Intento 3 → Si falla: retry_count = 3, status = 'failed'
```

### 4. Helper de Email

**Archivo**: `supabase/functions/_shared/email.ts`

```typescript
export async function sendResendEmail({
  from,
  to,
  subject,
  html,
}): Promise<{
  ok: boolean;
  id?: string | null;
  statusCode?: number;
  body?: any;
  error?: string;
}>
```

**Ventajas**:
- ✅ Respuesta estructurada con toda la info de error
- ✅ Validación de RESEND_API_KEY
- ✅ Parsing robusto de respuestas JSON

---

## 🔐 Variables de Entorno Configuradas

| Variable | Ubicación | Estado |
|----------|-----------|--------|
| `RESEND_API_KEY` | Supabase Secrets | ✅ Configurada |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secrets | ✅ Configurada |
| `SUPABASE_URL` | Supabase Secrets | ✅ Configurada |
| `DEFAULT_FROM` | Supabase Secrets | ⚠️ Opcional (usa default) |

**Default FROM**: `EcoSign <no-reply@email.ecosign.app>`

---

## 🤖 Automatización: Supabase pg_cron

### Configuración Actual

**Método elegido**: **Supabase pg_cron** (recomendado)

**Ventajas**:
- ✅ Todo dentro de Supabase (sin servicios externos)
- ✅ No expone claves en GitHub Actions
- ✅ Ejecución confiable cada 5 minutos
- ✅ Logs integrados
- ✅ Sin costos adicionales

### Acción Pendiente: Limpiar Cron Jobs

**Estado actual**: Hay 2 cron jobs (uno duplicado)

**Acción requerida**:
1. Ejecutar en SQL Editor:
   ```sql
   SELECT jobid, jobname, schedule, active
   FROM cron.job
   ORDER BY jobname;
   ```

2. Eliminar el job que no funciona (`send-pending-mails`):
   ```sql
   SELECT cron.unschedule('send-pending-mails');
   ```

3. Dejar solo: `send_emails_pending_job` o crear uno limpio llamado `send-pending-emails`

**Documentación completa**: Ver `CRON_JOBS_MANAGEMENT.md`

---

## 📈 Tabla workflow_notifications

### Estructura Final

```sql
CREATE TABLE workflow_notifications (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  signer_id UUID,
  notification_type TEXT NOT NULL, -- signature_request | signature_reminder | system | other
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  resend_email_id TEXT
);
```

### Estados Válidos

| Estado | Significado | Próximo Paso |
|--------|-------------|--------------|
| `pending` | Email en cola | Será procesado por cron |
| `sent` | Email enviado exitosamente | Ninguno (final) |
| `failed` | Falló después de 3 intentos | Revisar error_message |

### Idempotencia Garantizada

- ✅ Una fila = Un solo envío de email
- ✅ No hay lógica que cambie `sent` → `pending`
- ✅ Funciones solo INSERT (no UPDATE de estados)
- ✅ Solo `send-pending-emails` actualiza delivery_status

---

## 🧪 Pruebas Realizadas y Resultados

### Test 1: API Resend Directo
```bash
$ RESEND_API_KEY=re_xxx node test-resend-email.js manus1986@gmail.com
HTTP 200 OK
Respuesta JSON: { id: '50ad5326-86d4-4fe0-9660-8bb733baea1b' }
✅ Petición enviada correctamente.
```

**Resultado**: ✅ Email recibido en Gmail (carpeta Promociones)

### Test 2: Flujo Completo BD → Function → Email

1. **Insertar fila de prueba**:
   ```sql
   INSERT INTO workflow_notifications (
     id, workflow_id, recipient_email, recipient_type,
     notification_type, subject, body_html, delivery_status
   ) VALUES (
     gen_random_uuid(), gen_random_uuid(),
     'manus1986@gmail.com', 'signer',
     'signature_request', 'Prueba manual de envío',
     '<p>Esto es una prueba manual</p>', 'pending'
   );
   ```

2. **Invocar función**:
   - Via Supabase Dashboard → Functions → send-pending-emails → Invoke

3. **Verificar resultado**:
   ```sql
   SELECT delivery_status, sent_at, resend_email_id, error_message
   FROM workflow_notifications
   WHERE recipient_email = 'manus1986@gmail.com';
   ```

**Resultado**:
- ✅ `delivery_status = 'sent'`
- ✅ `sent_at` rellenado con timestamp
- ✅ `resend_email_id` contiene UUID de Resend
- ✅ Email recibido en Gmail

---

## 📚 Documentación Creada

| Documento | Descripción |
|-----------|-------------|
| `CRON_JOBS_MANAGEMENT.md` | Guía completa de manejo de pg_cron |
| `KEY_ROTATION_PLAN.md` | Plan de rotación de claves pre-MVP |
| `EMAIL_SYSTEM_FINAL_REPORT.md` | Este documento |

### Scripts Auxiliares

| Script | Uso |
|--------|-----|
| `test-resend-email.js` | Probar Resend API directamente |
| `test-send-pending.sh` | Invocar send-pending-emails via CLI |
| `check-pending-emails.sql` | Consultar estado de notificaciones |
| `check-cron-jobs.sql` | Ver cron jobs configurados |
| `cleanup-cron-jobs.sql` | Limpiar cron jobs duplicados |

---

## ⚠️ Notas Importantes

### Email en Carpeta "Promociones"

Es **normal** que Gmail clasifique emails transaccionales como promocionales inicialmente.

**Soluciones para mejorar deliverability**:

1. **Configurar SPF/DKIM/DMARC** (ya debería estar en email.ecosign.app)
   - Verificar en Resend Dashboard → Domains

2. **Warming del dominio**
   - Enviar volumen gradual (empezar con 50-100/día)
   - Ir aumentando a lo largo de 2-4 semanas

3. **Engagement**
   - Pedir a usuarios que marquen como "No es spam"
   - Incluir opción "Agregar a contactos"

4. **Contenido**
   - Evitar palabras spam ("gratis", "urgente", etc.)
   - Balance texto/HTML adecuado
   - Links a dominios verificados

### Limpieza de Cron Jobs

**ACCIÓN REQUERIDA**:
- [ ] Ejecutar `check-cron-jobs.sql` para ver jobs existentes
- [ ] Eliminar `send-pending-mails` si existe
- [ ] Dejar solo un job activo
- [ ] Documentar cuál quedó activo

### Rotación de Claves Pre-MVP

**ACCIÓN REQUERIDA ANTES DEL LANZAMIENTO**:
- [ ] Rotar todas las API keys (Resend, Supabase, blockchain, etc.)
- [ ] Verificar que no haya secretos en commits
- [ ] Seguir plan en `KEY_ROTATION_PLAN.md`

---

## ✅ Checklist de Tareas Completadas

- [x] Migraciones de BD aplicadas (UUID, retry_count, constraint)
- [x] Índices de performance creados
- [x] Función send-pending-emails desplegada
- [x] Helper de email (_shared/email.ts) actualizado
- [x] Variables de entorno configuradas
- [x] Test API Resend: EXITOSO
- [x] Test flujo completo: EXITOSO
- [x] Email recibido correctamente
- [x] Documentación creada (3 documentos)
- [x] Commits realizados (2 commits)
- [x] Verificación de idempotencia
- [x] Plan de rotación de claves

---

## 📋 Tareas Pendientes (Opcionales)

### Inmediatas
- [ ] Limpiar cron jobs duplicados (ver CRON_JOBS_MANAGEMENT.md)
- [ ] Configurar variable `DEFAULT_FROM` si se quiere personalizar

### Pre-MVP
- [ ] Rotar todas las API keys (seguir KEY_ROTATION_PLAN.md)
- [ ] Configurar alertas de monitoreo en Resend
- [ ] Warming del dominio (envío gradual)

### Mejoras Futuras (No urgentes)
- [ ] Implementar webhooks de Resend para tracking (delivered, bounced, opened)
- [ ] Dashboard de métricas de emails
- [ ] Sistema de templates de emails
- [ ] Rate limiting más granular
- [ ] A/B testing de subject lines

---

## 🎯 Conclusión

El sistema de emails está **100% funcional y listo para producción**.

### Próximos Pasos Recomendados

1. **Limpiar cron jobs** (5 minutos)
   - Ejecutar comandos en CRON_JOBS_MANAGEMENT.md

2. **Probar con usuarios reales** (1-2 días)
   - Crear workflows reales
   - Monitorear llegada de emails
   - Ajustar templates si es necesario

3. **Antes del MVP público** (1 semana antes)
   - Ejecutar plan de rotación de claves
   - Verificar dominio en Resend
   - Configurar monitoreo

---

**Sistema desarrollado con**:
🤖 [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>

**Última actualización**: 2025-11-28
**Versión**: 1.0 (Producción Ready)
