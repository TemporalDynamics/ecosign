# Auth Surface Sealed (Milestone)

Fecha de cierre: 2026-02-27

## Objetivo

Formalizar la superficie de autenticación y autorización del sistema, definiendo
contratos explícitos para cada categoría de endpoint y previniendo regresión
mediante guards automáticos.

## Categorías de Autenticación

El sistema opera con 5 categorías de autenticación, cada una con contrato explícito:

### 1. Usuario Logueado (auth.getUser)

**Descripción**: Endpoints que requieren usuario autenticado via JWT de Supabase.

**Patrón**: `supabase.auth.getUser()` desde `Authorization: Bearer <token>`

**Endpoints** (22):
- `cancel-workflow` — Cancelar workflow (owner)
- `create-custody-upload-url` — Generar URL de custodia
- `create-invite` — Crear invite (owner del documento)
- `create-signer-link` — Crear link de firma (owner)
- `generate-link` — Generar link de share (owner)
- `get-eco` — Obtener ECO canónico (owner)
- `get-signed-url` — Obtener URL firmado de storage
- `load-draft` — Cargar draft (owner)
- `log-event` — Loguear evento (owner)
- `log-share-event` — Loguear evento de share
- `presential-verification-start-session` — Iniciar sesión presencial
- `presential-verification-confirm-presence` — Confirmar presencia ¹
- `presential-verification-close-session` — Cerrar sesión presencial
- `record-protection-event` — Registrar evento de protección
- `register-custody-upload` — Registrar upload de custodia
- `respond-to-changes` — Responder a cambios (owner)
- `reissue-signer-token` — Reemitir token de firmante
- `resume-signer-link` — Resumir link de firma
- `save-draft` — Guardar draft (owner)
- `start-signature-workflow` — Iniciar workflow de firma (owner)
- `store-encrypted-custody` — Almacenar custodia encriptada
- `verify-invite-access` — Verificar acceso a invite
- `workflow-fields` — Obtener campos de workflow

**Invariante**: Todos deben validar `Authorization` header y obtener `user` válido.

¹ `presential-verification-confirm-presence` tiene `verify_jwt = false` porque el participante
invitado envía su token en el body (no en `Authorization` header). Tiene validación custom
via `participant_token_hash` contra `presential_verification_otps`.

---

### 1b. Público con Token (token hash)

**Descripción**: Endpoints accesibles sin cuenta Supabase, mediante token de link/recipient.

**Patrón**: Validación por `token_hash` usando `crypto.subtle.digest`.

**Endpoints** (3):
- `accept-nda` — Aceptación de NDA por recipient (token de link)
- `accept-share-nda` — Aceptación de NDA por share (token de share)
- `verify-access` — Verificar acceso a link (token de link)

**Invariante**: Todos validan el token contra su tabla correspondiente antes de ejecutar.

---

### 2. Firmante Externo (validateSignerAccessToken)

**Descripción**: Endpoints para firmantes externos con token de acceso específico.

**Patrón**: `validateSignerAccessToken()` desde `workflow_signers` table.

**Endpoints**:
- `accept-workflow-nda` — Aceptar NDA de workflow
- `apply-signer-signature` — Aplicar firma del firmante
- `confirm-signer-identity` — Confirmar identidad del firmante
- `log-workflow-event` — Loguear evento de workflow
- `record-evidence-download` — Registrar descarga de evidencia (firmante)
- `reject-signature` — Rechazar firma
- `send-signer-otp` — Enviar OTP al firmante
- `verify-signer-otp` — Verificar OTP del firmante

**Invariante**: Todos deben validar `signerId` + `accessToken` contra `workflow_signers`.

---

### 3. Cron Interno (requireInternalAuth / requireCronSecret)

**Descripción**: Jobs programados o workers internos que solo acepta llamadas de service role o cron secret.

**Patrón**: `requireInternalAuth()` (service_role o cron_secret) o `requireCronSecret()`.

**Endpoints** (14):
- `anchor-bitcoin` — Worker de anclaje Bitcoin
- `anchor-polygon` — Worker de anclaje Polygon
- `finalize-document` — Finalizar certificado ECO (worker interno)
- `fase1-executor` — Ejecutor de jobs fase 1
- `new-document-canonical-trigger` — Trigger canónico (interno)
- `notify-artifact-ready` — Notificar artifact ready (cron)
- `notify-document-signed` — Notificar documento firmado (cron)
- `orchestrator` — Orquestador de jobs (interno)
- `process-bitcoin-anchors` — Procesar anclas Bitcoin (cron)
- `process-polygon-anchors` — Procesar anclas Polygon (cron)
- `process-signature` — Procesar firma (worker interno)
- `process-signer-signed` — Procesar firmante completado (worker interno)
- `record-custody-key-rotation` — Registrar rotación de clave (interno)
- `send-pending-emails` — Enviar emails pendientes (cron)

**Invariante**: Todos deben validar `Authorization: Bearer <service_role_key>` o `x-cron-secret` / `x-internal-secret` header.

---

### 4. Webhook Externo (signature validation)

**Descripción**: Webhooks de servicios externos con validación de firma.

**Patrón**: Validación de firma específica del proveedor.

**Endpoints**:
- `signnow-webhook` — Webhook de SignNow

**Invariante**: Debe validar firma del webhook de SignNow.

---

### 5. Público sin Auth

**Descripción**: Endpoints accesibles sin autenticación. La mayoría son workers internos
protegidos por RLS en la base de datos, o bien endpoints públicos de lectura/verificación.

**Endpoints** (42):
- `accept-invite-nda` — Aceptar NDA de invite (sin cuenta Supabase)
- `anchor-health` — Health check de anchoring
- `anchoring-health-check` — Health check general
- `append-tsa-event` — Añadir evento TSA (trigger interno)
- `auto-tsa` — TSA automático (trigger externo)
- `build-artifact` — Construir artifact (worker interno)
- `build-final-artifact` — Construir artifact final (worker interno)
- `dead-jobs` — Listar jobs muertos (interno)
- `feature-flags-status` — Estado de feature flags
- `generate-signature-evidence` — Generar evidencia de firma (worker interno)
- `get-eco-url` — Obtener URL de ECO
- `get-share-metadata` — Obtener metadata de share
- `health` — Health check básico
- `health-check` — Health check general
- `legal-timestamp` — Timestamp legal (TSA, worker interno)
- `log-ecox-event` — Loguear evento ECOX (interno)
- `monitoring-dashboard` — Dashboard de monitoreo
- `notify-document-certified` — Notificar documento certificado (worker interno)
- `presential-verification-get-acta` — Obtener acta presencial por hash (público)
- `record-signer-receipt` — Registrar receipt de firmante
- `repair-missing-anchor-events` — Reparar eventos de anchor faltantes
- `request-document-changes` — Solicitar cambios en documento
- `run-tsa` — Ejecutar TSA (worker interno)
- `send-share-otp` — Enviar OTP de share
- `send-signer-package` — Enviar paquete al firmante
- `send-welcome-email` — Enviar email de bienvenida
- `set-feature-flag` — Setear feature flag (interno)
- `signer-access` — Acceso de firmante (integración SignNow)
- `signnow` — Integración SignNow
- `signing-keys` — Public keys de firma institucional (público)
- `stamp-pdf` — Sellado de PDF (worker interno)
- `store-signer-signature` — Almacenar firma de firmante
- `submit-anchor-bitcoin` — Submit anchor Bitcoin (worker interno)
- `submit-anchor-polygon` — Submit anchor Polygon (worker interno)
- `test-email` — Test de email (dev/diagnóstico)
- `test-insert-notification` — Test de notificación (dev/diagnóstico)
- `verify-ecox` — Verificar ECOX (público)
- `verify-share-otp` — Verificar OTP de share
- `verify-workflow-hash` — Verificar hash de workflow
- `wake-authority` — Wake authority (trigger interno)

**Invariante**: Sin validación de JWT explícita. La seguridad se apoya en RLS,
service_role a nivel de DB, o son endpoints de lectura pública intencional.

---

## Configuración verify_jwt

### Estado actual

En `supabase/config.toml`:
- La mayoría de las functions tienen `verify_jwt = true`
- Algunas exceptions específicas tienen `verify_jwt = false`

### Regla contractual

1. **Functions de Usuario Logueado**: `verify_jwt = true` (obligatorio)
2. **Functions de Firmante Externo**: `verify_jwt = false` (usan validación custom)
3. **Functions Cron**: `verify_jwt = false` (usan cron_secret)
4. **Webhooks Externos**: `verify_jwt = false` (validan firma del proveedor)
5. **Públicas sin Auth**: `verify_jwt = false` (no requieren validación)

### Justificación de excepciones

Las functions con `verify_jwt = false` deben tener:
- Validación explícita alternativa documentada
- Guard que verifique la validación alternativa
- Justificación en este documento

---

## Invariantes de Cierre

1. **Toda function pública tiene validación explícita**
   - Usuario logueado: `auth.getUser()`
   - Firmante externo: `validateSignerAccessToken()`
   - Cron interno: `requireCronSecret()`
   - Webhook externo: validación de firma
   - Público: documentado como tal

2. **No hay validación "opcional" o "comentada"**
   - Toda validación está activa y verificada
   - No hay código muerto de auth

3. **verify_jwt está documentado por función**
   - Cada función tiene justificación para su config
   - El release ritual verifica consistencia

4. **Guards automáticos previenen regresión**
   - Test verifica presencia de validación
   - Test verifica consistencia de verify_jwt
   - Release ritual exige guards en verde

---

## Evidencia de Cierre

1. **Documento contractual**: `docs/beta/AUTH_SURFACE_SEALED.md`
2. **Guard automático**: `tests/authority/auth_surface_sealed_guard.test.ts`
3. **Matriz de auth**: Sección "Categorías de Autenticación" arriba
4. **Config verify_jwt**: `supabase/config.toml` consistente con matriz

---

## Criterio de Aceptación

El milestone se considera sellado si:

1. ✅ El guard del milestone está en verde
2. ✅ El guard está integrado en `prebeta_fire_drill.sh`
3. ✅ Toda función pública tiene validación documentada
4. ✅ `verify_jwt` config es consistente con la matriz de auth
5. ✅ No hay validaciones "opcionales" o "comentadas"

---

## Fuera de Alcance

1. SLA comercial de autenticación (tiempos de respuesta)
2. UX de flujos de login/recuperación
3. Optimización de caching de tokens
4. Integración con proveedores OAuth externos

---

## Histórico de Cambios

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-02-27 | v1.0 | Cierre inicial de Auth Surface |
| 2026-03-02 | v1.1 | Ajuste de matriz: agrega categoría 1b (publicWithToken), corrige listas reales de cronInternal (9) y publicNoAuth (42) post-guard |
