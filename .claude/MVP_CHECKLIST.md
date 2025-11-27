# 🎯 EcoSign MVP Privado - Checklist Completo

**Objetivo**: MVP infalible para 5-10 testers (family + early adopters)
**Fecha**: 2025-11-27
**Estrategia**: Flujo completo funcionando, SmartHash simplificado para esta fase

---

## 📋 CHECKLIST GENERAL

### ✅ COMPLETADO

#### 🗄️ Backend - Base de Datos
- [x] Tabla `signature_workflows` (workflows de firma)
- [x] Tabla `workflow_signers` (firmantes)
- [x] Tabla `workflow_signatures` (registros de firma)
- [x] Tabla `workflow_notifications` (cola de emails)
- [x] Tabla `ecox_audit_trail` (evidencia forense)
- [x] RLS policies configuradas
- [x] Índices optimizados

#### 🔧 Backend - Triggers SQL
- [x] `on_signer_created` - Envía link de firma al crear firmante
- [x] `on_signature_completed` - Notifica al owner y firmante
- [x] `on_workflow_completed` - Envía .ECO a todos
- [x] `notify_creator_on_signature` - Notifica con detalles al creador

#### 📧 Sistema de Emails
- [x] Edge Function `send-pending-emails` deployada
- [x] Templates HTML profesionales
- [x] Cola de emails con retry automático
- [x] Integración con Resend API
- [x] Variables de entorno configuradas (RESEND_API_KEY)

#### 🔍 Sistema ECOX (Audit Trail)
- [x] Tabla `ecox_audit_trail` con 11 tipos de eventos
- [x] Edge Function `log-ecox-event` deployada
- [x] Geolocalización automática por IP
- [x] Validación timezone vs IP
- [x] Detección de VPN/anomalías
- [x] Función `generate_ecox_certificate()`

#### 📚 Documentación
- [x] `GUEST_SIGNATURE_FLOW.md` - Flujo completo
- [x] `ECOX_IMPLEMENTATION_GUIDE.md` - Guía de integración
- [x] Ejemplos de código para frontend

---

## 🔴 PENDIENTE - CRÍTICO PARA MVP

### 1. 🎨 Frontend - Flujo de Firma

#### Página: `/sign/[token]` - Firmante Invitado

**Componentes necesarios:**

```
SignaturePage/
├─ 1. TokenValidator          // Valida el access_token_hash
├─ 2. NDAAcceptance           // Mostrar y aceptar NDA
├─ 3. AuthGate                // Login/Registro si no autenticado
├─ 4. MFAChallenge            // Desafío TOTP obligatorio
├─ 5. DocumentViewer          // Mostrar PDF descifrado
├─ 6. SignaturePad            // Canvas para firmar
└─ 7. CompletionScreen        // Confirmación + descarga .ECO
```

**Estado actual:** ❌ POR IMPLEMENTAR

**Tareas:**
- [ ] Crear componente `TokenValidator`
- [ ] Crear componente `NDAAcceptance`
- [ ] Integrar autenticación de Supabase
- [ ] Implementar MFA con `@supabase/auth-ui-react`
- [ ] Crear `DocumentViewer` con PDF.js
- [ ] Crear `SignaturePad` con canvas
- [ ] Integrar logs ECOX en cada paso
- [ ] Crear `CompletionScreen` con descarga .ECO

#### Página: `/dashboard` - Creator/Owner

**Componentes necesarios:**

```
Dashboard/
├─ WorkflowList              // Lista de workflows
├─ WorkflowDetail            // Detalle de un workflow
├─ SignersList               // Lista de firmantes del workflow
├─ AuditTrailTimeline        // Visualización de eventos ECOX
├─ CreateWorkflowWizard      // Crear nuevo workflow
└─ DownloadButtons           // Descargar PDF/ECO
```

**Estado actual:** ⚠️ PARCIAL (existe estructura básica)

**Tareas:**
- [ ] Completar `WorkflowList` con estados
- [ ] Crear `WorkflowDetail` con información completa
- [ ] Crear `SignersList` con progreso
- [ ] Crear `AuditTrailTimeline` (visualización de ECOX)
- [ ] Mejorar `CreateWorkflowWizard`
- [ ] Implementar descarga de .ECO

---

### 2. 🔐 Sistema de Autenticación

**Requerimientos MVP:**
- [x] Registro con email + password (Supabase Auth)
- [x] Login con email + password
- [ ] **MFA/TOTP obligatorio** para firmantes ⚠️ CRÍTICO
- [ ] Flujo de recuperación de contraseña
- [ ] Verificación de email

**Tareas pendientes:**
- [ ] Habilitar MFA en Supabase Auth settings
- [ ] Crear componente `MFASetup` para enrollment
- [ ] Crear componente `MFAChallenge` para verificación
- [ ] Forzar MFA antes de ver documento
- [ ] Documentar flujo de MFA en guía

---

### 3. 📄 Gestión de Documentos

#### Upload y Almacenamiento

**Requerimientos:**
- [ ] Upload de PDF al crear workflow
- [ ] Almacenar en Supabase Storage (bucket: `documents`)
- [ ] Encriptación opcional (para MVP puede ser sin encriptar)
- [ ] Generar hash del documento (SHA-256 simple)
- [ ] Guardar hash en `signature_workflows.document_hash`

**Bucket de Supabase Storage:**
```sql
-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Policies para acceso
CREATE POLICY "Owners can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Signers can read their documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
```

**Tareas:**
- [ ] Crear bucket `documents` en Supabase
- [ ] Configurar RLS policies
- [ ] Implementar componente `DocumentUploader`
- [ ] Generar hash SHA-256 del PDF
- [ ] Guardar referencia en DB

#### Descarga y Visualización

**Requerimientos:**
- [ ] Firmantes pueden ver el PDF antes de firmar
- [ ] PDF se muestra en el navegador (PDF.js)
- [ ] Descarga de PDF firmado
- [ ] Descarga de certificado .ECO

**Tareas:**
- [ ] Integrar PDF.js en `DocumentViewer`
- [ ] Implementar botón de descarga de PDF
- [ ] Implementar descarga de .ECO (usando `generate_ecox_certificate`)

---

### 4. ✍️ Proceso de Firma

#### Aplicación de Firma

**Requerimientos MVP:**
- [ ] Canvas para dibujar firma
- [ ] Captura de coordenadas (x, y, page)
- [ ] Guardar imagen de firma (PNG base64)
- [ ] Aplicar firma al PDF (pdf-lib)
- [ ] Actualizar estado del signer a 'signed'

**Componente `SignaturePad`:**
```typescript
// Funcionalidades necesarias:
- Canvas de dibujo
- Botón "Limpiar"
- Botón "Confirmar"
- Preview de la firma
- Guardar como base64
```

**Tareas:**
- [ ] Crear componente `SignaturePad` con canvas
- [ ] Implementar aplicación de firma al PDF con pdf-lib
- [ ] Guardar firma en `workflow_signers.signature_data`
- [ ] Actualizar estado a 'signed'
- [ ] Trigger automático envía emails

#### Hash Final del Documento

**Para MVP - Versión Simplificada:**
```typescript
// SHA-256 simple del PDF final (con firmas)
const hash = await crypto.subtle.digest('SHA-256', pdfBuffer)
const hashHex = Array.from(new Uint8Array(hash))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')

// Guardar en signature_workflows.document_hash
```

**Tareas:**
- [ ] Calcular hash SHA-256 del PDF final
- [ ] Guardar en `signature_workflows.document_hash`
- [ ] Mostrar hash en el dashboard (primeros 16 caracteres)

---

### 5. 🔍 Verificador de Documentos

#### Página: `/verify` - Verificación Pública

**Requerimientos:**
- [ ] Upload de PDF local
- [ ] Calcular hash del PDF en el navegador
- [ ] Buscar en DB si el hash existe
- [ ] Mostrar resultado: ✅ VERDE (verificado) o ❌ ROJO (no verificado)
- [ ] Mostrar detalles: firmantes, fechas, ubicaciones

**Componente `DocumentVerifier`:**
```typescript
// Flujo:
1. Usuario sube PDF
2. Calcular SHA-256 en browser
3. Llamar a Edge Function: verify-document-hash
4. Buscar hash en signature_workflows
5. Si existe: mostrar detalles + VERDE
6. Si no existe: mostrar ROJO
```

**Edge Function necesaria:**
```typescript
// supabase/functions/verify-document-hash/index.ts
// - Recibe hash
// - Busca en signature_workflows
// - Devuelve: workflow info + signers + audit trail
```

**Tareas:**
- [ ] Crear página `/verify`
- [ ] Crear componente `DocumentVerifier`
- [ ] Crear Edge Function `verify-document-hash`
- [ ] Mostrar resultado verde/rojo
- [ ] Mostrar detalles del workflow verificado

---

### 6. 📧 Sistema de Emails - Activación

#### Configuración de Cron Job

**Requerimiento:**
- [ ] Cron job cada 5 minutos para procesar cola de emails

**Configuración en Supabase Dashboard:**
```
Nombre: process-pending-emails
Schedule: */5 * * * * (cada 5 minutos)
Function: send-pending-emails
```

**Tareas:**
- [ ] Ir a Supabase Dashboard
- [ ] Edge Functions → Cron Jobs
- [ ] Crear cron job con schedule `*/5 * * * *`
- [ ] Verificar que ejecuta correctamente
- [ ] Probar con un email de prueba

#### Templates de Email

**Templates necesarios:**
- [x] `your_turn_to_sign` - Link de firma
- [x] `signature_completed` - Confirmación
- [x] `workflow_completed` - Documento completado
- [x] `creator_detailed_notification` - Notificación al creador

**Estado:** ✅ COMPLETO (HTML templates en triggers)

---

### 7. 🎨 UI/UX Esencial

#### Componentes Globales

**Necesarios para MVP:**
- [ ] `LoadingSpinner` - Estados de carga
- [ ] `ErrorBoundary` - Manejo de errores
- [ ] `Toast` - Notificaciones (ya existe con react-hot-toast)
- [ ] `Modal` - Diálogos
- [ ] `ProgressBar` - Progreso del workflow

**Tareas:**
- [ ] Crear componentes globales
- [ ] Implementar manejo de errores
- [ ] Mejorar feedback visual

#### Estados del Workflow

**Visualización necesaria:**
```
draft → active → completed
  │       │          │
  └───────┴──────────┴─ Mostrar progreso visual
```

**Tareas:**
- [ ] Crear componente `WorkflowStatus`
- [ ] Badges de colores por estado
- [ ] Progress bar con % de firmantes completados

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Semana 1: Flujo de Firma Core
1. [ ] Componente `SignaturePage` con routing
2. [ ] `NDAAcceptance` + `AuthGate`
3. [ ] `DocumentViewer` con PDF.js
4. [ ] `SignaturePad` básico
5. [ ] Integración ECOX logging

### Semana 2: Dashboard y Gestión
1. [ ] `WorkflowList` completo
2. [ ] `CreateWorkflowWizard` mejorado
3. [ ] Upload de documentos
4. [ ] Descarga de .ECO

### Semana 3: MFA y Seguridad
1. [ ] MFA enrollment
2. [ ] MFA challenge obligatorio
3. [ ] Flujo de recuperación

### Semana 4: Verificador y Pulido
1. [ ] Página `/verify`
2. [ ] Edge Function `verify-document-hash`
3. [ ] Testing end-to-end
4. [ ] Activar cron job de emails

---

## ✅ CRITERIOS DE ÉXITO MVP

### Flujo Feliz Completo:
1. ✅ Owner crea workflow
2. ✅ Owner agrega firmantes
3. ✅ Firmante recibe email automático
4. ✅ Firmante acepta NDA
5. ✅ Firmante completa MFA
6. ✅ Firmante ve documento
7. ✅ Firmante aplica firma
8. ✅ Owner recibe notificación
9. ✅ Todos reciben email final con .ECO
10. ✅ Verificador valida el documento

### Dashboard Funcional:
- ✅ Lista de workflows con estados
- ✅ Detalle de cada workflow
- ✅ Audit trail visualizado
- ✅ Descarga de PDF y .ECO

### Verificador Funcional:
- ✅ Upload de PDF
- ✅ Hash calculado en browser
- ✅ Resultado VERDE/ROJO
- ✅ Detalles del workflow

---

## 🎯 DIFERENCIADORES CLAVE (Para mostrar)

1. **Zero-Knowledge**: Solo hashes en servidor, PDFs locales
2. **Triple Blindaje**: TSA RFC3161 + Polygon + Bitcoin (opcional)
3. **Audit Trail Completo**: Geolocalización + Timezone + VPN detection
4. **Certificado .ECOX**: Contenedor de evidencia descargable
5. **Verificador Público**: Cualquiera puede verificar autenticidad

---

## 📊 MÉTRICAS DE ÉXITO

- [ ] 5-10 workflows completados exitosamente
- [ ] 0 errores críticos en flujo feliz
- [ ] 100% de emails enviados correctamente
- [ ] Tiempo promedio de firma < 5 minutos
- [ ] Verificador valida correctamente 100% de documentos

---

**Última actualización:** 2025-11-27
**Estado general:** 40% completado (Backend completo, Frontend pendiente)
