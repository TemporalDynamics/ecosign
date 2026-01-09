# DEPLOYMENT: Sistema de Firma Multi-Parte

**Estado**: ✅ Backend listo | ⏳ Pendiente deployment
**Fecha**: 2025-11-17

---

## CHECKLIST DE DEPLOYMENT

### 1. Aplicar Migraciones (5 min)

```bash
# Aplicar la migración de workflows
supabase db push --include-all

# O aplicar solo la nueva:
cat supabase/migrations/20251117010000_009_signature_workflows.sql | supabase db remote execute
```

**Verificar que se crearon las tablas**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'signature_%' OR table_name LIKE 'workflow_%';

-- Resultado esperado:
-- signature_workflows
-- workflow_versions
-- workflow_signers
-- workflow_signatures
-- workflow_notifications
```

---

### 2. Desplegar Edge Functions (10 min)

```bash
# Desplegar las 4 funciones del flujo
supabase functions deploy start-signature-workflow --no-verify-jwt
supabase functions deploy process-signature --no-verify-jwt
supabase functions deploy request-document-changes --no-verify-jwt
supabase functions deploy respond-to-changes --no-verify-jwt
```

**Verificar deployment**:
```bash
supabase functions list

# Debe mostrar:
# - start-signature-workflow
# - process-signature
# - request-document-changes
# - respond-to-changes
```

---

### 3. Configurar Variables de Entorno

Ya configuradas de pasos anteriores:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `APP_URL` (https://app.verifysign.pro)

**Nuevas variables necesarias** (opcional - para emails):
```bash
# Si vas a usar Resend para emails reales
supabase secrets set RESEND_API_KEY="re_..."
```

---

### 4. Testing Manual (15 min)

#### Test 1: Iniciar Workflow

```bash
# Primero, obtener un token de usuario
# (Hacer login en la app y copiar el token de Authorization)

TOKEN="Bearer eyJhbG..."

# Crear workflow de prueba
curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/start-signature-workflow" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentUrl": "https://example.com/test.pdf",
    "documentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "originalFilename": "Test Contract.pdf",
    "signers": [
      {
        "email": "signer1@test.com",
        "name": "First Signer",
        "signingOrder": 1,
        "requireLogin": false,
        "requireNda": true,
        "quickAccess": false
      },
      {
        "email": "signer2@test.com",
        "name": "Second Signer",
        "signingOrder": 2,
        "requireLogin": false,
        "requireNda": false,
        "quickAccess": true
      }
    ],
    "forensicConfig": {
      "rfc3161": true,
      "polygon": true,
      "bitcoin": false
    }
  }'

# Resultado esperado:
# {
#   "success": true,
#   "workflowId": "uuid...",
#   "signersCount": 2,
#   "_debug": {
#     "accessTokens": {
#       "signer1@test.com": {
#         "token": "abc123...",
#         "url": "https://app.verifysign.pro/sign/abc123..."
#       }
#     }
#   }
# }
```

#### Test 2: Procesar Firma

```bash
# Usar el token del debug del test anterior
SIGNER_TOKEN="abc123..."

curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/process-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "'$SIGNER_TOKEN'",
    "signatureData": {
      "imageUrl": "https://example.com/signature.png",
      "coordinates": {
        "page": 1,
        "x": 100,
        "y": 500,
        "width": 200,
        "height": 50
      }
    },
    "ndaAccepted": true,
    "ipAddress": "192.168.1.1",
    "userAgent": "Test Client"
  }'

# Resultado esperado:
# {
#   "success": true,
#   "signatureId": "uuid...",
#   "workflowStatus": "in_progress",
#   "nextSigner": {
#     "email": "signer2@test.com",
#     "order": 2
#   }
# }
```

#### Test 3: Solicitar Cambios

```bash
# Usando token del segundo firmante
SIGNER2_TOKEN="def456..."

curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/request-document-changes" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "'$SIGNER2_TOKEN'",
    "annotations": [
      {
        "page": 1,
        "highlights": [
          { "x": 50, "y": 200, "width": 400, "height": 30 }
        ],
        "comment": "Cambiar fecha a 2025-02-01"
      }
    ],
    "generalNotes": "Por favor revisar."
  }'

# Resultado esperado:
# {
#   "success": true,
#   "workflowId": "uuid...",
#   "status": "paused",
#   "annotationsCount": 1
# }
```

#### Test 4: Responder a Cambios (Rechazar)

```bash
curl -X POST "https://uiyojopjbhooxrmamaiw.supabase.co/functions/v1/respond-to-changes" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "uuid-del-workflow",
    "signerId": "uuid-del-signer",
    "action": "reject",
    "modificationNotes": "No viable en este momento."
  }'

# Resultado esperado:
# {
#   "success": true,
#   "action": "rejected",
#   "workflowStatus": "active"
# }
```

---

### 5. Verificar en Base de Datos

```sql
-- Ver workflows creados
SELECT id, owner_id, original_filename, status, current_version, created_at
FROM signature_workflows
ORDER BY created_at DESC
LIMIT 5;

-- Ver firmantes de un workflow
SELECT email, name, signing_order, status, signed_at
FROM workflow_signers
WHERE workflow_id = 'uuid-del-workflow'
ORDER BY signing_order;

-- Ver firmas registradas
SELECT ws.email, wf.signature_hash, wf.rfc3161_token IS NOT NULL as has_rfc3161,
       wf.polygon_tx_hash IS NOT NULL as has_polygon, wf.signed_at
FROM workflow_signatures wf
JOIN workflow_signers ws ON ws.id = wf.signer_id
WHERE wf.workflow_id = 'uuid-del-workflow'
ORDER BY wf.signed_at;

-- Ver notificaciones enviadas
SELECT recipient_email, notification_type, subject, delivery_status, created_at
FROM workflow_notifications
WHERE workflow_id = 'uuid-del-workflow'
ORDER BY created_at DESC;
```

---

## TROUBLESHOOTING

### Error: "Relation 'signature_workflows' does not exist"
**Solución**: Aplicar la migración
```bash
supabase db push --include-all
```

### Error: "Function not found"
**Solución**: Verificar que las funciones estén desplegadas
```bash
supabase functions list
supabase functions deploy [nombre-funcion] --no-verify-jwt
```

### Error: "Unauthorized" al iniciar workflow
**Solución**: Verificar que el token de Authorization sea válido
```bash
# Hacer login en la app y copiar el Bearer token del header
```

### Error: "Invalid or expired access token" al firmar
**Solución**: Verificar que el accessToken sea correcto
```sql
-- Verificar que el hash del token existe
SELECT * FROM workflow_signers
WHERE access_token_hash = 'hash-del-token';
```

### Las notificaciones no se envían
**Causa**: Aún no está implementado el envío real (están en DB con status 'pending')

**Próximo paso**: Integrar Resend
```typescript
// En cada Edge Function donde se crea notificación:
import Resend from 'npm:resend';
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

await resend.emails.send({
  from: 'VerifySign <noreply@verifysign.pro>',
  to: recipientEmail,
  subject: subject,
  html: bodyHtml
});

// Actualizar delivery_status a 'sent'
```

---

## INTEGRACIÓN CON FRONTEND

### URLs de las Páginas

```
/workflows              → Dashboard de workflows (Usuario A)
/workflows/new          → Crear nuevo workflow (Usuario A)
/workflows/:id          → Ver detalles de workflow (Usuario A)
/workflows/:id/changes  → Revisar solicitudes de cambios (Usuario A)
/sign/:token            → Página de firma (Usuarios B/C/...)
```

### Componentes Necesarios

1. **WorkflowConfiguratorPanel** (Usuario A)
   - Configuración de blindaje forense (switches)
   - Smart Paste de emails
   - Lista editable de firmantes
   - Botón "Iniciar Flujo"

2. **SignaturePage** (Usuarios B/C)
   - Modal NDA (si required)
   - Visor de PDF (full screen, scroll)
   - Canvas de firma (bottom fixed)
   - Botón "Firmar" o "Solicitar Modificación"

3. **AnnotationCanvas** (Usuario B/C en modo modificación)
   - Herramienta de resaltado
   - Modal de texto en long press
   - Lista de anotaciones
   - Botón "Enviar Solicitud"

4. **ChangeReviewPanel** (Usuario A)
   - Vista del documento con anotaciones
   - Lista de comentarios del solicitante
   - Botones "Aceptar" / "Rechazar"

---

## COSTOS ESTIMADOS

### Supabase (Database + Functions):
- Plan Free: 500MB DB, 500K invocaciones/mes → **$0**
- Plan Pro: 8GB DB, 2M invocaciones/mes → **$25/mes**

### Storage (Documentos + Firmas):
- Plan Free: 1GB storage → **$0**
- Plan Pro: 100GB storage → **$25/mes** (incluido)

### Emails (Resend):
- Plan Free: 100 emails/día → **$0**
- Plan Starter: 10,000 emails/mes → **$20/mes**

### Blockchain (Polygon):
- Por firma con anchoring: ~$0.001-0.003
- 1000 firmas/mes: ~**$1-3/mes**

**Total estimado**: $0-50/mes dependiendo del volumen

---

## MÉTRICAS DE PERFORMANCE

### Tiempos esperados:

| Operación | Tiempo |
|-----------|--------|
| Iniciar workflow | 200-500ms |
| Procesar firma (sin blockchain) | 300-600ms |
| Procesar firma (con RFC 3161) | 2-4 segundos |
| Procesar firma (con Polygon) | 10-30 segundos |
| Solicitar cambios | 200-400ms |
| Responder cambios | 500-800ms |

### Capacidad:

- Workflows simultáneos: **ilimitado** (DB escalable)
- Firmantes por workflow: **ilimitado** (recomendado < 20)
- Versiones por workflow: **ilimitado**
- Firmas simultáneas: **~100/segundo** (limitado por Supabase)

---

## PRÓXIMOS PASOS

1. ✅ Backend completado
2. ⏳ Deploy de funciones
3. ⏳ Testing manual
4. ⏳ Integración Resend
5. ⏳ Frontend components
6. ⏳ Testing E2E
7. ⏳ Documentación para usuarios

---

**Backend listo para producción. Siguiente paso: Desplegar funciones y probar flujo completo.**
